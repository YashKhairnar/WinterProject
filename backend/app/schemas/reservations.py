from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ReservationBase(BaseModel):
    cafe_id: UUID
    reservation_date: datetime
    reservation_time: str  # e.g., "14:00"
    party_size: int = Field(default=2, ge=1, le=20)
    special_request: Optional[str] = None

class ReservationCreate(ReservationBase):
    user_sub: str

class ReservationPublic(ReservationBase):
    id: UUID
    user_sub: str
    status: str
    created_at: datetime
    cafe_name: Optional[str] = None  # For display
    user_name: Optional[str] = None  # For display


    class Config:
        from_attributes = True

class ReservationUpdate(BaseModel):
    status: Optional[str] = None
    reservation_date: Optional[datetime] = None
    reservation_time: Optional[str] = None
    party_size: Optional[int] = Field(None, ge=1, le=20)
    special_request: Optional[str] = None
