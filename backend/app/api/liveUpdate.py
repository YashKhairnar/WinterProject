from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from typing import Optional
from app.schemas.liveUpdate import LiveUpdateCreate, LiveUpdatePublic
from app.db.deps import get_db
from app.db.model import LiveUpdates, User, Cafe
from sqlalchemy.orm import Session
from uuid import UUID
from app.services.upload import save_to_s3

liveUpdates_router = APIRouter(prefix='/liveUpdates', tags=['liveUpdates'])


@liveUpdates_router.post('/direct', response_model=LiveUpdatePublic, status_code=201)
def create_live_update_direct(
    payload: LiveUpdateCreate,
    db: Session = Depends(get_db)
) -> LiveUpdatePublic:
    """
    Create a new live update using a pre-uploaded image URL.
    """
    try:
        # Validate UUIDs
        cafe_uuid = UUID(payload.cafe_id)
        user_uuid = UUID(payload.user_id)
        
        # Create live update in database
        live_update = LiveUpdates(
            cafe_id=cafe_uuid,
            user_id=user_uuid,
            image_url=payload.image_url,
            vibe=payload.vibe,
            visit_purpose=payload.visit_purpose
        )
        
        db.add(live_update)
        db.commit()
        db.refresh(live_update)
        
        return live_update
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating live update: {str(e)}")


# POST /liveUpdates - Upload a photo for a live update/story
@liveUpdates_router.post('', response_model=LiveUpdatePublic, status_code=201)
async def create_live_update(
    cafe_id: str = Form(...),
    user_id: str = Form(...),
    photo: UploadFile = File(...),
    vibe: Optional[str] = Form(None),
    visit_purpose: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> LiveUpdatePublic:
    """
    Create a new live update by uploading a photo.
    The photo is stored in S3 and the URL is saved in the database.
    Live updates expire after 24 hours.
    """
    try:
        # Validate UUIDs
        cafe_uuid = UUID(cafe_id)
        user_uuid = UUID(user_id)
        
        # Upload photo to S3
        if not photo.filename:
            raise HTTPException(status_code=400, detail="No photo provided")
        
        content = await photo.read()
        # Use dynamic path: liveupdates/{cafe_id}
        image_url = save_to_s3(content, photo.filename, f"liveupdates/{cafe_id}")
        
        # Create live update in database
        live_update = LiveUpdates(
            cafe_id=cafe_uuid,
            user_id=user_uuid,
            image_url=image_url,
            vibe=vibe,
            visit_purpose=visit_purpose
        )
        
        db.add(live_update)
        db.commit()
        db.refresh(live_update)
        
        return live_update
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {str(e)}")
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating live update: {str(e)}")


# GET /liveUpdates/cafe/{cafe_id} - Get all active live updates for a cafe
@liveUpdates_router.get('/cafe/{cafe_id}', response_model=list[LiveUpdatePublic])
async def get_cafe_live_updates(
    cafe_id: UUID,
    db: Session = Depends(get_db)
) -> list[LiveUpdatePublic]:
    """
    Get all active (non-expired) live updates for a specific cafe.
    """
    from datetime import datetime, timezone
    
    live_updates = db.query(LiveUpdates).filter(
        LiveUpdates.cafe_id == cafe_id,
        LiveUpdates.expires_at > datetime.now(timezone.utc)
    ).order_by(LiveUpdates.created_at.desc()).all()
    
    
    return live_updates


# GET /liveUpdates/user/{cognito_sub}
@liveUpdates_router.get('/user/{cognito_sub}', response_model=list[dict])
async def get_user_live_updates(
    cognito_sub: str,
    db: Session = Depends(get_db)
):
    """
    Get all active live updates for a specific user, including cafe name.
    """
    from datetime import datetime, timezone
    
    try:
        user_uuid = UUID(cognito_sub)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # Query LiveUpdates joined with Cafe
    # Note: LiveUpdates.user_id stores the cognito_sub (as UUID) directly
    results = db.query(LiveUpdates, Cafe.name).join(Cafe, LiveUpdates.cafe_id == Cafe.id).filter(
        LiveUpdates.user_id == user_uuid,
        LiveUpdates.expires_at > datetime.now(timezone.utc)
    ).order_by(LiveUpdates.created_at.desc()).all()
    
    # Construct response
    response = []
    for update, cafe_name in results:
        resp_item = LiveUpdatePublic.from_orm(update).dict()
        resp_item['cafe_name'] = cafe_name
        response.append(resp_item)
        
    return response