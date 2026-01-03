# backend/app/schemas/cafes.py
from pydantic import BaseModel, HttpUrl, Field
from uuid import UUID
from typing import Optional, List, Dict
import re


# id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) # you dont send it in the request
# cognito_sub = Column(String, nullable=False) #username/ID in cognito
# name = Column(String, nullable=False)
# description = Column(Text)
# phone_number = Column(String)
# address = Column(Text, nullable=False)
# city = Column(String, nullable=False)
# latitude = Column(Float, nullable=False)
# longitude = Column(Float, nullable=False)
# cafe_photos = Column(ARRAY(String), nullable=True)
# menu_photos = Column(ARRAY(String), nullable=True)
# menu_link = Column(String, nullable=True)
# website_link = Column(String, nullable=True)
# instagram_url = Column(Text, nullable=True)
# two_tables = Column(Integer, nullable=True)
# four_tables = Column(Integer, nullable=True)
# table_config = Column(JSONB, nullable=True)  # Stores array of {id, size} objects
# amenities = Column(ARRAY(String), nullable=False, server_default="{}")
# avg_rating = Column(Float, nullable=True)
# working_hours = Column(JSONB, nullable=False, default=lambda: {})
# onboarding_completed = Column(Boolean, nullable=False, default=False)
# created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
# updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WorkingHoursDay(BaseModel):
    open: Optional[str] = Field(None, example="08:00")
    close: Optional[str] = Field(None, example="20:00")
    closed: bool = False

class TableConfigItem(BaseModel):
    id: str
    size: int = Field(..., ge=1)
    status: Optional[str] = None

class CafeBase(BaseModel):
    cognito_sub: str
    name: str
    description: Optional[str] = Field(None, max_length=300)
    phone_number: Optional[str] = None
    address: str
    city: str
    latitude: float
    longitude: float
    website_link: Optional[str] = None
    menu_link: Optional[str] = None
    instagram_url: Optional[str] = None
    two_tables: Optional[int] = Field(None, ge=0)
    four_tables: Optional[int] = Field(None, ge=0)
    table_config: List[TableConfigItem] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    working_hours: Dict[str, WorkingHoursDay] = Field(default_factory=dict)
    cafe_photos: List[str] = Field(default_factory=list)
    menu_photos: List[str] = Field(default_factory=list)

class CafeCreate(CafeBase):
    pass

class CafePublic(CafeBase):
    id: UUID
    avg_rating: Optional[float] = None
    occupancy_level: Optional[int] = 0
    onboarding_completed: bool = False

    class Config:
        from_attributes = True

class CafeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    website_link: Optional[str] = None
    menu_link: Optional[str] = None
    instagram_url: Optional[str] = None
    cafe_photos: Optional[List[str]] = None
    menu_photos: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    working_hours: Optional[Dict[str, WorkingHoursDay]] = None
    two_tables: Optional[int] = None
    four_tables: Optional[int] = None
    table_config: Optional[List[TableConfigItem]] = None
    occupancy_level: Optional[int] = None
