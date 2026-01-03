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

# --------------------------- CAFE MODEL ---------------------------
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, func, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects.postgresql import ARRAY
import uuid

class Cafe(Base):
    __tablename__ = "cafes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cognito_sub = Column(String, nullable=False, index=True)

    name = Column(String, nullable=False)
    description = Column(Text)
    phone_number = Column(String)

    address = Column(Text, nullable=False)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    cafe_photos = Column(ARRAY(String), nullable=False, server_default="{}")
    menu_photos = Column(ARRAY(String), nullable=False, server_default="{}")

    menu_link = Column(String)
    website_link = Column(String)
    instagram_url = Column(Text)

    two_tables = Column(Integer)
    four_tables = Column(Integer)
    table_config = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    amenities = Column(ARRAY(String), nullable=False, server_default="{}")

    avg_rating = Column(Float)

    working_hours = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    onboarding_completed = Column(Boolean, nullable=False, server_default=text("false"))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --------------------------- USER MODEL ---------------------------
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


# # --------------------------- LIVE UPDATES MODEL ---------------------------
# class LiveUpdates(Base):
#     __tablename__ = 'liveUpdates'

#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

#     cafe_id = Column(UUID(as_uuid=True), nullable=False)
#     user_id = Column(UUID(as_uuid=True), nullable=False)

#     image_url = Column(Text, nullable=False)

#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     expires_at = Column(created_at + timedelta(days=1), nullable=False)


# # --------------------------- REVIEWS MODEL ---------------------------
# class Reviews(Base):
#     __tablename__ = 'reviews'

#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

#     cafe_id = Column(UUID(as_uuid=True), nullable=False)
#     user_id = Column(UUID(as_uuid=True), nullable=False)
#     rating = Column(Integer, nullable=False)
#     review_text = Column(Text, nullable=False)

#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --------------------------- OCCUPANCY MODEL ---------------------------
class Occupancy(Base):
    __tablename__ = 'occupancy'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cafe_id = Column(UUID(as_uuid=True), nullable=False)

    two_tables = Column(Integer, nullable=False)
    four_tables = Column(Integer, nullable=False)
    total_seats = Column(Integer, nullable=False)

    two_tables_occupied = Column(Integer, nullable=False)
    four_tables_occupied = Column(Integer, nullable=False)

    two_seats_occupied = Column(Integer, nullable=False)
    four_seats_occupied = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
