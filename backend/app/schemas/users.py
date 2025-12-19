from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, List, Dict, Any

class UserBase(BaseModel):
    # We might not receive username immediately, but email is certain
    email: EmailStr
    username: str

class UserCreate(UserBase):
    cognito_sub: str


class UserPreferences(BaseModel):
    work_friendly: Optional[bool] = None
    noise_preference: Optional[str] = None
    vibe_preferences: List[str] = []
    visit_purpose: List[str] = []
    dietary_preferences: List[str] = []
    amenities: List[str] = []
    push_notifications: Optional[bool] = None

class UserPublic(UserBase):
    id: UUID
    cognito_sub: str
    preferences: UserPreferences
    total_reviews: int = 0
    total_checkins: int = 0
    push_notifications: Optional[bool] = None
    class Config:
        from_attributes = True
