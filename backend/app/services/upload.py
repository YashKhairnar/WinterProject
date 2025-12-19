import boto3
import uuid
from typing import Literal
import os

s3 = boto3.client('s3')
bucket_name = os.getenv('CAFE_PHOTOS_BUCKET')

def save_to_s3(file_content: bytes, filename: str, category: Literal['cafe_photo', 'menu_photo']) -> str:
    """
    Upload file to S3 and return the public URL
    
    Args:
        file_content: The binary content of the file
        filename: Original filename (for extension)
        category: Category folder in S3
        
    Returns:
        Public URL of the uploaded file
    """
    # Extract file extension
    file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    key = f"{category}/{file_id}.{file_extension}"
    
    # Determine content type
    content_type = 'image/jpeg'
    if file_extension.lower() in ['png']:
        content_type = 'image/png'
    elif file_extension.lower() in ['gif']:
        content_type = 'image/gif'
    elif file_extension.lower() in ['webp']:
        content_type = 'image/webp'
    
    # Upload to S3
    s3.put_object(
        Bucket=bucket_name,
        Key=key,
        Body=file_content,
        ContentType=content_type,
        ACL='public-read'  # Make file publicly accessible
    )
    
    # Return public URL
    region = s3.get_bucket_location(Bucket=bucket_name)['LocationConstraint']
    if region is None:
        region = 'us-east-1'
    
    url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{key}"
    return url
