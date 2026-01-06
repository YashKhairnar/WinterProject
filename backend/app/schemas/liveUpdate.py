from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


# Base model for live updates
class LiveUpdate(BaseModel):
    cafe_id: str
    user_id: str
    image_url: str
    vibe: Optional[str] = None
    visit_purpose: Optional[str] = None


class LiveUpdateCreate(BaseModel):
    cafe_id: str
    user_id: str
    vibe: Optional[str] = None
    visit_purpose: Optional[str] = None
    image_url: str


# Schema for public response (includes all fields from database)
class LiveUpdatePublic(BaseModel):
    id: UUID
    cafe_id: UUID
    user_id: UUID
    image_url: str
    vibe: Optional[str] = None
    visit_purpose: Optional[str] = None
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True

class LiveUpdateUserResponse(LiveUpdatePublic):
    cafe_name: str