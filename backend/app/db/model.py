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
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class Cafe(Base):
    __tablename__ = "cafes" # assigned name for the table in the database

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) # you dont send it in the request

    cognito_sub = Column(String, nullable=False) #username/ID in cognito

    name = Column(String, nullable=False)
    description = Column(Text)
    phone_number = Column(String)
    address = Column(Text, nullable=False)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    cafe_photos = Column(ARRAY(String), nullable=True)
    menu_photos = Column(ARRAY(String), nullable=True)
    menu_link = Column(String, nullable=True)
    website_link = Column(String, nullable=True)
    instagram_url = Column(Text, nullable=True)

    total_tables = Column(Integer, nullable=True)
    occupancy_capacity = Column(Integer, nullable=True)
    occupancy_level = Column(Integer, nullable=True)

    amenities = Column(ARRAY(String), nullable=False, server_default="{}")
    avg_rating = Column(Float, nullable=True)
    working_hours = Column(JSONB, nullable=False, default=lambda: {})

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    # Cognito user identifier (sub claim)
    cognito_sub = Column(String, unique=True, nullable=False, index=True, primary_key=True) #username/ID in cognito
    # Basic profile info
    username = Column(String, nullable=False) # our display name
    email = Column(String, unique=True, nullable=False) # email from cognito
    # Preferences (JSON)
    preferences = Column(
        JSONB,
        nullable=False,
        default=lambda: {
            "work_friendly": None,
            "noise_preference": None,
            "vibe_preferences": [],   # cozy, modern, outdoor, etc.
            "visit_purpose": [],      # work, read, study, meetfriends, etc.
            "dietary_preferences": [], # vegetarian, vegan, gluten-free, etc.
            "amenities" : [ ] # wifi, parking, etc.
        },
    )
    # Statistics
    total_checkins = Column(Integer, nullable=False, default=0)
    total_reviews = Column(Integer, nullable=False, default=0)
    push_notifications = Column(Boolean, nullable=False, default=False)
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# class LiveUpdates(Base):
#     __tablename__ = 'liveUpdates'

#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     cafe_id = Column(UUID(as_uuid=True), nullable=False)
#     user_id = Column(UUID(as_uuid=True), nullable=False)
#     image_url = Column(Text, nullable=False)
#     # tags = Column(ARRAY(String), nullable=False, server_default="{}")
#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     expires_at = Column(created_at + timedelta(days=1), nullable=False)


# class Reviews(Base):
#     __tablename__ = 'reviews'

#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     cafe_id = Column(UUID(as_uuid=True), nullable=False)
#     user_id = Column(UUID(as_uuid=True), nullable=False)
#     rating = Column(Integer, nullable=False)
#     review_text = Column(Text, nullable=False)
#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# class Checkins(Base):
#     __tablename__ = 'checkins'

#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     cafe_id = Column(UUID(as_uuid=True), nullable=False)
#     user_id = Column(UUID(as_uuid=True), nullable=False)
#     source = Column(String, nullable=False)
#     checkin_time = Column(DateTime(timezone=True), nullable=False)
#     checkout_time = Column(DateTime(timezone=True), nullable=False)
#     discount_used = Column(Boolean, nullable=False)
#     discount_code = Column(String, nullable=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

