# backend/app/db/models.py
import uuid
from typing import List, Optional
from datetime import timedelta
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
    Table,
    ForeignKey
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

# --------------------------- CAFE MODEL ---------------------------
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, func, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects.postgresql import ARRAY
import uuid

# Association Table
user_saved_cafes = Table(
    'user_saved_cafes',
    Base.metadata,
    Column('user_sub', String, ForeignKey('users.cognito_sub', ondelete='CASCADE'), primary_key=True),
    Column('cafe_id', UUID(as_uuid=True), ForeignKey('cafes.id', ondelete='CASCADE'), primary_key=True)
)

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
    cover_photo = Column(String)
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
    occupancy_level = Column(Integer, default=0)
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

    # Relationships
    saved_cafes = relationship("Cafe", secondary=user_saved_cafes, backref="saved_by_users")


# # --------------------------- LIVE UPDATES MODEL ---------------------------
class LiveUpdates(Base):
    __tablename__ = 'liveUpdates'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cafe_id = Column(UUID(as_uuid=True), ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False)
    user_sub = Column(String, nullable=False)

    image_url = Column(Text, nullable=False)
    vibe = Column(String, nullable=True)
    visit_purpose = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), server_default=func.now() + timedelta(days=1), nullable=False)


# --------------------------- REVIEWS MODEL ---------------------------
class Review(Base):
    __tablename__ = 'reviews'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cafe_id = Column(UUID(as_uuid=True), ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False, index=True)
    user_sub = Column(String, ForeignKey('users.cognito_sub', ondelete='CASCADE'), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="reviews")
    cafe = relationship("Cafe", backref=backref("reviews", cascade="all, delete-orphan"))

# --------------------------- CHECKIN MODEL ---------------------------
class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_sub = Column(String, ForeignKey('users.cognito_sub', ondelete='CASCADE'), nullable=False, index=True)
    cafe_id = Column(UUID(as_uuid=True), ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="checkins")
    cafe = relationship("Cafe", backref=backref("checkins", cascade="all, delete-orphan"))

# --------------------------- OCCUPANCY HISTORY MODEL ---------------------------
class OccupancyHistory(Base):
    __tablename__ = "occupancy_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cafe_id = Column(UUID(as_uuid=True), ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False, index=True)
    occupancy_level = Column(Integer, nullable=False) # 0-100
    
    # Store table counts for more detail if needed later
    two_tables_occupied = Column(Integer, default=0)
    four_tables_occupied = Column(Integer, default=0)
    table_config = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cafe = relationship("Cafe", backref=backref("occupancy_history", cascade="all, delete-orphan"))

# --------------------------- RESERVATION MODEL ---------------------------
class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cafe_id = Column(UUID(as_uuid=True), ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False, index=True)
    user_sub = Column(String, ForeignKey('users.cognito_sub', ondelete='CASCADE'), nullable=False, index=True)
    
    reservation_date = Column(DateTime(timezone=True), nullable=False)
    reservation_time = Column(String, nullable=False)  # e.g., "14:00"
    party_size = Column(Integer, nullable=False, default=2)
    special_request = Column(Text)
    
    status = Column(String, nullable=False, default="pending")  # pending, confirmed, cancelled, completed
    cancellation_reason = Column(Text, nullable=True)  # Reason provided by admin when cancelling
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="reservations")
    cafe = relationship("Cafe", backref=backref("reservations", cascade="all, delete-orphan"))
