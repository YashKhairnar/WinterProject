from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.db.model import Reservation, User, Cafe
from app.schemas.reservations import ReservationCreate, ReservationPublic, ReservationUpdate
from typing import List
from uuid import UUID

router = APIRouter(prefix='/reservations', tags=['reservations'])

@router.post('/', response_model=ReservationPublic, status_code=201)
def create_reservation(payload: ReservationCreate, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(User).filter(User.cognito_sub == payload.user_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == payload.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # Create reservation
    new_reservation = Reservation(
        cafe_id=payload.cafe_id,
        user_sub=payload.user_sub,
        reservation_date=payload.reservation_date,
        reservation_time=payload.reservation_time,
        party_size=payload.party_size,
        special_request=payload.special_request,
        status="pending"
    )
    
    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)
    
    # Add cafe and user name for response
    setattr(new_reservation, 'cafe_name', cafe.name)
    setattr(new_reservation, 'user_name', user.username)
    
    return new_reservation

@router.get('/user/{user_sub}', response_model=List[ReservationPublic])
def get_user_reservations(user_sub: str, db: Session = Depends(get_db)):
    reservations = db.query(Reservation).filter(
        Reservation.user_sub == user_sub
    ).order_by(Reservation.reservation_date.desc()).all()
    
    # Add cafe name to each reservation
    for res in reservations:
        cafe = db.query(Cafe).filter(Cafe.id == res.cafe_id).first()
        user = db.query(User).filter(User.cognito_sub == res.user_sub).first()
        setattr(res, 'cafe_name', cafe.name if cafe else "Unknown")
        setattr(res, 'user_name', user.username if user else "Unknown")
        
    return reservations

@router.get('/cafe/{cafe_id}', response_model=List[ReservationPublic])
def get_cafe_reservations(cafe_id: UUID, db: Session = Depends(get_db)):
    reservations = db.query(Reservation).filter(
        Reservation.cafe_id == cafe_id
    ).order_by(Reservation.reservation_date.desc()).all()
    
    # Get cafe name once
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    cafe_name = cafe.name if cafe else "Unknown"
    
    for res in reservations:
        user = db.query(User).filter(User.cognito_sub == res.user_sub).first()
        setattr(res, 'cafe_name', cafe_name)
        setattr(res, 'user_name', user.username if user else "Unknown User")
        
    return reservations

@router.patch('/{reservation_id}', response_model=ReservationPublic)
def update_reservation(reservation_id: UUID, payload: ReservationUpdate, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Update fields
    if payload.status is not None:
        reservation.status = payload.status
    if payload.cancellation_reason is not None:
        reservation.cancellation_reason = payload.cancellation_reason
    if payload.reservation_date is not None:
        reservation.reservation_date = payload.reservation_date
    if payload.reservation_time is not None:
        reservation.reservation_time = payload.reservation_time
    if payload.party_size is not None:
        reservation.party_size = payload.party_size
    if payload.special_request is not None:
        reservation.special_request = payload.special_request
    
    db.commit()
    db.refresh(reservation)
    
    # Add cafe and user name
    cafe = db.query(Cafe).filter(Cafe.id == reservation.cafe_id).first()
    user = db.query(User).filter(User.cognito_sub == reservation.user_sub).first()
    setattr(reservation, 'cafe_name', cafe.name if cafe else "Unknown")
    setattr(reservation, 'user_name', user.username if user else "Unknown")
    
    return reservation

@router.delete('/{reservation_id}', status_code=204)
def delete_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    db.delete(reservation)
    db.commit()
    return None
