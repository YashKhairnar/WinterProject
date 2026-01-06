from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.db.model import User, Cafe
from app.schemas.users import UserCreate, UserPublic, UserPreferences, UserUpdate
from typing import List
from app.core.logger import app_logger as logger

router = APIRouter(prefix='/users', tags=['users'])

# POST /users
@router.post('/', response_model=UserPublic, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        # Check if user already exists by cognito_sub
        existing_user = db.query(User).filter(User.cognito_sub == payload.cognito_sub).first()
        if existing_user:
            logger.info(f"User already exists: {payload.email}")
            return existing_user

        logger.info(f"Creating new user: {payload.email}")
        #create a new user
        new_user = User(
            cognito_sub=payload.cognito_sub,
            email=payload.email,
            username=payload.username
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise e

#GET /users
@router.get('/', response_model=List[UserPublic])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

# GET /users/{cognito_sub}
@router.get('/{cognito_sub}', response_model=UserPublic)
def get_user(cognito_sub: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# PATCH /users/{cognito_sub}
@router.patch('/{cognito_sub}', response_model=UserPublic)
def update_user(cognito_sub: str, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        logger.warning(f"User not found for update: {cognito_sub}")
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"Updating user profile: {cognito_sub}")
    # Convert payload to dict
    update_data = payload.model_dump(exclude_unset=True)
    
    # Update username if provided
    if 'username' in update_data:
        user.username = update_data.pop('username')

    # Handle push_notifications (separate column with typo)
    if 'push_notifications' in update_data:
        user.push_notifications = update_data.pop('push_notifications')
        
    # Update remaining preferences
    if update_data:
        if user.preferences:
             current = dict(user.preferences)
             current.update(update_data)
             user.preferences = current
        else:
            user.preferences = update_data
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# POST /users/{cognito_sub}/saved_cafes/{cafe_id}
@router.post('/{cognito_sub}/saved_cafes/{cafe_id}', status_code=200)
def save_cafe(cognito_sub: str, cafe_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
        
    if cafe not in user.saved_cafes:
        user.saved_cafes.append(cafe)
        db.commit()
        
    return {"message": "Cafe saved"}

# DELETE /users/{cognito_sub}/saved_cafes/{cafe_id}
@router.delete('/{cognito_sub}/saved_cafes/{cafe_id}', status_code=200)
def unsave_cafe(cognito_sub: str, cafe_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        # If cafe doesn't exist, we can't remove it, but user might have a stale reference? 
        # Actually sqlalchemy would handle it or error. But let's check.
        raise HTTPException(status_code=404, detail="Cafe not found")

    if cafe in user.saved_cafes:
        user.saved_cafes.remove(cafe)
        db.commit()
        
    return {"message": "Cafe unsaved"}


# DELETE /users/{cognito_sub}
@router.delete('/{cognito_sub}', status_code=200)
def delete_user(cognito_sub: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        db.delete(user)
        db.commit()
        return {"message": "User and all associated data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")
