from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class CheckinBase(BaseModel):
    user_sub: str
    cafe_id: UUID

class CheckinCreate(CheckinBase):
    pass

class CheckinPublic(CheckinBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class CheckinStatus(BaseModel):
    checked_in_today: bool
    last_checkin: Optional[datetime] = None
