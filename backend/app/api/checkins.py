from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.deps import get_db
from app.db.model import Checkin, User, Cafe
from app.schemas.checkins import CheckinCreate, CheckinPublic, CheckinStatus
from typing import List
from datetime import datetime, time, date
from uuid import UUID

router = APIRouter(prefix='/checkins', tags=['checkins'])

@router.post('/', response_model=CheckinPublic, status_code=201)
def create_checkin(payload: CheckinCreate, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(User).filter(User.cognito_sub == payload.user_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == payload.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # Create check-in
    new_checkin = Checkin(
        user_sub=payload.user_sub,
        cafe_id=payload.cafe_id
    )
    
    # Increment user total check-ins
    user.total_checkins += 1
    
    db.add(new_checkin)
    db.add(user)
    db.commit()
    db.refresh(new_checkin)
    
    return new_checkin

@router.get('/status', response_model=CheckinStatus)
def get_checkin_status(
    user_sub: str, 
    cafe_id: UUID, 
    db: Session = Depends(get_db)
):
    # Get start and end of today
    today = date.today()
    start_of_day = datetime.combine(today, time.min)
    
    # Find check-ins for this user and cafe today
    checkin = db.query(Checkin).filter(
        Checkin.user_sub == user_sub,
        Checkin.cafe_id == cafe_id,
        Checkin.created_at >= start_of_day
    ).order_by(Checkin.created_at.desc()).first()
    
    return {
        "checked_in_today": checkin is not None,
        "last_checkin": checkin.created_at if checkin else None
    }

@router.get('/today', response_model=List[UUID])
def get_today_checkins(user_sub: str, db: Session = Depends(get_db)):
    # Useful for initializing frontend state: list of cafe IDs checked in today
    today = date.today()
    start_of_day = datetime.combine(today, time.min)
    
    checkins = db.query(Checkin.cafe_id).filter(
        Checkin.user_sub == user_sub,
        Checkin.created_at >= start_of_day
    ).all()
    
    # Extract IDs from result tuples
    return [c[0] for c in checkins]
