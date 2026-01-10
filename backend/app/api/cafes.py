from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from app.schemas.cafes import CafeBase, CafePublic, CafeUpdate
from app.db.deps import get_db
from app.db.model import Cafe, LiveUpdates
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import datetime, timezone
from app.services.upload import save_to_s3
from typing import List, Optional
import json

cafes_router = APIRouter(prefix='/cafes', tags=['cafes'])


# GET /cafes
@cafes_router.get('/', response_model=List[CafePublic])
def get_all_cafes(db: Session = Depends(get_db)) -> List[CafePublic]:
    cafes = db.query(Cafe).all()
    
    # Fetch active stories
    now = datetime.now(timezone.utc)
    active_stories = db.query(LiveUpdates).filter(LiveUpdates.expires_at > now).all()
    
    # Group stories by cafe_id
    cafe_stories = {}
    for story in active_stories:
        if story.cafe_id not in cafe_stories:
            cafe_stories[story.cafe_id] = []
        cafe_stories[story.cafe_id].append({
            "id": story.id,
            "image_url": story.image_url,
            "vibe": story.vibe,
            "visit_purpose": story.visit_purpose,
            "created_at": story.created_at
        })

    for cafe in cafes:
        if cafe.id in cafe_stories:
            setattr(cafe, 'has_active_stories', True)
            setattr(cafe, 'active_stories', cafe_stories[cafe.id])
        else:
            setattr(cafe, 'has_active_stories', False)
            setattr(cafe, 'active_stories', [])
            
    return cafes


# GET /cafes/owner/{cognito_sub}
@cafes_router.get('/owner/{cognito_sub}', response_model=CafePublic)
def get_cafe_by_owner(cognito_sub: str, db: Session = Depends(get_db)) -> CafePublic:
    print(f"DEBUG: fetching cafe for owner: {cognito_sub}")
    try:
        cafe = db.query(Cafe).filter(Cafe.cognito_sub == cognito_sub).first()
        if cafe:
            print(f"DEBUG: Found cafe {getattr(cafe, 'id', 'unknown')} for owner {cognito_sub}")
        else:
            print(f"DEBUG: No cafe found for owner {cognito_sub}")
    except Exception as e:
        print(f"DEBUG: Exception fetching cafe: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching cafe: {str(e)}")
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found for this owner")
    return cafe


# GET /cafes/{cafe_id}
@cafes_router.get('/{cafe_id}', response_model=CafePublic)
async def get_cafe(cafe_id: UUID, db: Session = Depends(get_db)) -> CafePublic:
    try:
        cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching cafe: {str(e)}")
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    return cafe


# POST /cafes
@cafes_router.post('/', response_model=CafePublic, status_code=201)
async def create_cafe(
    cafe_data: CafeBase,
    db: Session = Depends(get_db)
) -> CafePublic:
    print(f"DEBUG: creating cafe: name={cafe_data.name}, owner={cafe_data.cognito_sub}")
    try:
        # Create cafe object using the data from JSON
        cafe = Cafe(
            cognito_sub=cafe_data.cognito_sub,
            name=cafe_data.name,
            description=cafe_data.description,
            phone_number=cafe_data.phone_number,
            address=cafe_data.address,
            city=cafe_data.city,
            latitude=cafe_data.latitude,
            longitude=cafe_data.longitude,
            cafe_photos=cafe_data.cafe_photos,
            menu_photos=cafe_data.menu_photos,
            cover_photo=cafe_data.cover_photo,
            website_link=cafe_data.website_link,
            menu_link=cafe_data.menu_link,
            instagram_url=cafe_data.instagram_url,
            two_tables=cafe_data.two_tables,
            four_tables=cafe_data.four_tables,
            # Handle Pydantic objects/dicts for JSONB fields
            table_config=[t.dict() if hasattr(t, 'dict') else t for t in cafe_data.table_config] if isinstance(cafe_data.table_config, list) else cafe_data.table_config,
            amenities=cafe_data.amenities,
            working_hours={day: hours.dict() for day, hours in cafe_data.working_hours.items()},
            onboarding_completed=True 
        )

        db.add(cafe)
        db.commit()
        db.refresh(cafe)
        print(f"DEBUG: Successfully created cafe {cafe.id} for owner {cafe_data.cognito_sub}")
        return cafe

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating cafe: {str(e)}")


# POST /cafes/upload
@cafes_router.post('/upload', status_code=201)
async def upload_cafe_photo(
    file: UploadFile = File(...),
    category: str = "cafe_user_uploads",
    db: Session = Depends(get_db)
):
    try:
        content = await file.read()
        url = save_to_s3(content, file.filename, category)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


# GET /cafes/nearby?lat=&lng=&radius_km=
@cafes_router.get('/nearby', response_model=List[CafePublic])
def get_nearby_cafes(lat: float, lng: float, radius_km: float = 10, db: Session = Depends(get_db)) -> List[CafePublic]:
    cafes = db.query(Cafe).filter(
        Cafe.latitude >= lat - (radius_km / 111), 
        Cafe.latitude <= lat + (radius_km / 111), 
        Cafe.longitude >= lng - (radius_km / 111), 
        Cafe.longitude <= lng + (radius_km / 111)
    ).all()
    return cafes


# GET /cafes/search?name=
@cafes_router.get('/search', response_model=List[CafePublic])
def search_cafes(name: str, db: Session = Depends(get_db)) -> List[CafePublic]:
    cafes = db.query(Cafe).filter(Cafe.name.ilike(f"%{name}%")).all()
    return cafes


# PATCH /cafes/{cafe_id}
@cafes_router.patch('/{cafe_id}', response_model=CafePublic)
def update_cafe(cafe_id: UUID, cafe_update: CafeUpdate, db: Session = Depends(get_db)) -> CafePublic:
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    update_data = cafe_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        # Sanitize photo URLs to remove accidental quotes
        if key == 'cover_photo' and isinstance(value, str):
            value = value.replace('"', '').replace("'", "").strip()
            update_data[key] = value
        elif key in ['cafe_photos', 'menu_photos'] and isinstance(value, list):
            value = [v.replace('"', '').replace("'", "").strip() for v in value]
            update_data[key] = value

        if key == 'table_config' and value is not None:
            # Handle List[TableConfigItem] (Map View)
            if isinstance(value, list):
                # value is already a list of dicts because we called cafe_update.dict()
                setattr(cafe, key, value)
                try:
                    total_capacity = sum(item.get('size', 0) for item in value)
                    total_occupied = sum(item.get('seats', 0) for item in value)
                    if total_capacity > 0:
                        new_occupancy = int((total_occupied / total_capacity) * 100)
                        setattr(cafe, 'occupancy_level', new_occupancy)
                    else:
                        setattr(cafe, 'occupancy_level', 0)
                except Exception as e:
                    print(f"DEBUG: Error calculating occupancy (List): {e}")
            
            # Handle Dict (Summary View - Default Config)
            elif isinstance(value, dict):
                setattr(cafe, key, value)
                try:
                     # Structure: { "2_seats_table": { "total": X, "occupied_seats": Y }, ... }
                    total_capacity = 0
                    total_occupied = 0
                    
                    two_seats = value.get("2_seats_table", {})
                    four_seats = value.get("4_seats_table", {})
                    
                    # 2-seat tables
                    total_capacity += two_seats.get("total", 0) * 2
                    total_occupied += two_seats.get("occupied_seats", 0)

                    # 4-seat tables
                    total_capacity += four_seats.get("total", 0) * 4
                    total_occupied += four_seats.get("occupied_seats", 0)

                    if total_capacity > 0:
                        new_occupancy = int((total_occupied / total_capacity) * 100)
                        setattr(cafe, 'occupancy_level', new_occupancy)
                    else:
                        setattr(cafe, 'occupancy_level', 0)
                except Exception as e:
                    print(f"DEBUG: Error calculating occupancy (Dict): {e}")

        elif key == 'working_hours' and value is not None:
             # value is already a dict of dicts
            setattr(cafe, key, value)
        else:
            setattr(cafe, key, value)

    db.commit()
    db.refresh(cafe)
    return cafe


# DELETE /cafes/{cafe_id}
@cafes_router.delete('/{cafe_id}', status_code=200)
def delete_cafe(cafe_id: UUID, db: Session = Depends(get_db)):
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    try:
        db.delete(cafe)
        db.commit()
        return {"message": "Cafe and all associated data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting cafe: {str(e)}")
