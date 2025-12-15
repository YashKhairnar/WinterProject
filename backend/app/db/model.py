# backend/app/db/models.py
import uuid
from typing import List, Optional

from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    ARRAY,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Cafe(Base):
    __tablename__ = "cafes" # assigned name for the table in the database

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) # you dont send it in the request

    name = Column(String, nullable=False)
    description = Column(Text)
    address = Column(Text, nullable=False)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    instagram_url = Column(Text)
    amenities = Column(ARRAY(String), nullable=False, server_default="{}")
    avg_rating = Column(Float)
    occupancy_level = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
