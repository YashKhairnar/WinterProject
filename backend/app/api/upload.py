from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import boto3
import os
import uuid
from typing import Literal
from app.db.deps import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix='/upload', tags=['upload'])

s3_client = boto3.client('s3')
BUCKET_NAME = os.getenv('CAFE_PHOTOS_BUCKET')

class PresignedUrlRequest(BaseModel):
    filename: str
    file_type: str
    category: Literal['cover_photo', 'cafe_photo', 'menu_photo', 'cafe_user_uploads', 'live_update']

class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_url: str

@router.post('/presigned-url', response_model=PresignedUrlResponse)
async def get_presigned_url(request: PresignedUrlRequest):
    if not BUCKET_NAME:
        raise HTTPException(status_code=500, detail="S3 bucket not configured")

    file_extension = request.filename.split('.')[-1] if '.' in request.filename else 'jpg'
    file_id = str(uuid.uuid4())
    key = f"{request.category}/{file_id}.{file_extension}"

    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': key,
                'ContentType': request.file_type
            },
            ExpiresIn=3600 # 1 hour
        )

        region = s3_client.get_bucket_location(Bucket=BUCKET_NAME).get('LocationConstraint') or 'us-east-1'
        file_url = f"https://{BUCKET_NAME}.s3.{region}.amazonaws.com/{key}"

        return {
            "upload_url": presigned_url,
            "file_url": file_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
