import boto3
import uuid
from typing import Literal
import os
from dotenv import load_dotenv

load_dotenv()

# S3 configuration
s3 = boto3.client('s3')
bucket_name = os.getenv('CAFE_PHOTOS_BUCKET')

def save_to_s3(file_content: bytes, filename: str, category: str) -> str:
    """
    Upload file to S3 and return the public URL. 
    Falls back to local storage if CAFE_PHOTOS_BUCKET is not set.
    """
    # Extract file extension
    file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    key = f"{category}/{file_id}.{file_extension}"
    
    # Check if we should use local storage
    if not bucket_name:
        raise RuntimeError("S3 bucket not configured. CAFE_PHOTOS_BUCKET is missing.")

    # Determine content type
    content_type = 'image/jpeg'
    ext_lower = file_extension.lower()
    if ext_lower in ['png']:
        content_type = 'image/png'
    elif ext_lower in ['gif']:
        content_type = 'image/gif'
    elif ext_lower in ['webp']:
        content_type = 'image/webp'
    
    # Upload to S3
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=file_content,
            ContentType=content_type
        )
        
        # Return public URL
        # Return public URL
        # Use AWS_REGION env var if available (Lambda), else default to us-east-1
        region = os.environ.get('AWS_REGION', 'us-east-1')
        
        url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{key}"
        return url
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        raise e

