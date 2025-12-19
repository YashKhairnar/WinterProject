from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.db.model import User
from app.schemas.users import UserCreate, UserPublic, UserPreferences
from typing import List

router = APIRouter(prefix='/users', tags=['users'])

# POST /users
@router.post('/', response_model=UserPublic, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        # Check if user already exists by cognito_sub
        existing_user = db.query(User).filter(User.cognito_sub == payload.cognito_sub).first()
        if existing_user:
            return existing_user

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
        print(f"Error creating user: {e}")
        # raise HTTPException(status_code=500, detail=str(e)) # Optional: expose error
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
def update_user(cognito_sub: str, payload: UserPreferences, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert payload to dict, excluding defaults if needed, but user sent defaults.
    # payload itself IS the preferences set.
    prefs_data = payload.model_dump()
    
    # Handle push_notifications (separate column with typo)
    if 'push_notifications' in prefs_data:
        user.push_notifications = prefs_data.pop('push_notifications')
        
    # Update preferences column
    # We merge with existing preferences to be safe, or overwrite.
    # Given the schemas structure, let's overwrite for now or merge.
    if user.preferences:
         current = dict(user.preferences)
         current.update(prefs_data)
         user.preferences = current
    else:
        user.preferences = prefs_data
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
