from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.deps import get_db
from app.db.model import Review, User, Cafe, Checkin
from app.schemas.reviews import ReviewCreate, ReviewPublic
from typing import List
from uuid import UUID
from datetime import datetime, date, time

router = APIRouter(prefix='/reviews', tags=['reviews'])

@router.post('/', response_model=ReviewPublic, status_code=201)
def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):
    # 1. Verify user exists
    user = db.query(User).filter(User.cognito_sub == payload.user_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == payload.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # 3. Verify user has checked in today (Requirement: must be checked in to review)
    today = date.today()
    start_of_day = datetime.combine(today, time.min)
    checkin = db.query(Checkin).filter(
        Checkin.user_sub == payload.user_sub,
        Checkin.cafe_id == payload.cafe_id,
        Checkin.created_at >= start_of_day
    ).first()
    
    if not checkin:
        raise HTTPException(status_code=403, detail="Check-in required to leave a review")

    # 4. Check if user already reviewed this cafe today (one review per day limit)
    existing_review = db.query(Review).filter(
        Review.user_sub == payload.user_sub,
        Review.cafe_id == payload.cafe_id,
        Review.created_at >= start_of_day
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already submitted a review for this cafe today")

    # 5. Create review
    new_review = Review(
        cafe_id=payload.cafe_id,
        user_sub=payload.user_sub,
        rating=payload.rating,
        review_text=payload.review_text
    )
    
    # 5. Update user stats
    user.total_reviews += 1
    
    db.add(new_review)
    db.add(user)
    db.flush() # Flush to get new review count for avg calculation
    
    # 6. Update Cafe Avg Rating
    # Get all ratings for this cafe
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.cafe_id == payload.cafe_id).scalar()
    cafe.avg_rating = float(avg_rating) if avg_rating is not None else 0.0
    
    db.add(cafe)
    db.commit()
    db.refresh(new_review)
    
    # Map username for response
    setattr(new_review, 'username', user.username)
    
    return new_review

@router.get('/cafe/{cafe_id}', response_model=List[ReviewPublic])
def get_cafe_reviews(cafe_id: UUID, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.cafe_id == cafe_id).order_by(Review.created_at.desc()).all()
    
    # Add username to each review object for the response
    for review in reviews:
        user = db.query(User).filter(User.cognito_sub == review.user_sub).first()
        setattr(review, 'username', user.username if user else "Unknown")
        
    return reviews
