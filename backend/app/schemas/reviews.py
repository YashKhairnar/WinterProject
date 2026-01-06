from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ReviewBase(BaseModel):
    cafe_id: UUID
    user_sub: str
    rating: int = Field(..., ge=1, le=5)
    review_text: str

class ReviewCreate(ReviewBase):
    pass

class ReviewPublic(ReviewBase):
    id: UUID
    created_at: datetime
    username: Optional[str] = None # For display

    class Config:
        from_attributes = True

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    review_text: Optional[str] = None
