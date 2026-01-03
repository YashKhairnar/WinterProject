from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from app.schemas.cafes import CafeBase, CafePublic, CafeUpdate
from app.db.deps import get_db
from app.db.model import Cafe
from sqlalchemy.orm import Session
from uuid import UUID
from app.services.upload import save_to_s3
from typing import List, Optional
import json

cafes_router = APIRouter(prefix='/cafes', tags=['cafes'])


# GET /cafes
@cafes_router.get('/', response_model=List[CafePublic])
def get_all_cafes(db: Session = Depends(get_db)) -> List[CafePublic]:
    cafes = db.query(Cafe).all()
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
    # Text fields
    cognito_sub: str = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    phone_number: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    website_link: Optional[str] = Form(None),
    menu_link: Optional[str] = Form(None),
    instagram_url: Optional[str] = Form(None),
    two_tables: int = Form(...),
    four_tables: int = Form(...),
    table_config: str = Form("[]"), # JSON string
    amenities: str = Form("[]"),  # JSON string
    working_hours: str = Form("{}"),  # JSON string
    # File uploads
    cafe_photos: List[UploadFile] = File(default=[]),
    menu_photos: List[UploadFile] = File(default=[]),
    # Database session
    db: Session = Depends(get_db)
) -> CafePublic:
    print(f"DEBUG: creating cafe: name={name}, owner={cognito_sub}")
    try:
        # Parse JSON strings
        amenities_list = json.loads(amenities)
        working_hours_dict = json.loads(working_hours)
        table_config_list = json.loads(table_config)

        # Upload cafe photos to S3
        cafe_photo_urls = []
        for photo in cafe_photos:
            if photo.filename:
                content = await photo.read()
                url = save_to_s3(content, photo.filename, 'cafe_photo')
                cafe_photo_urls.append(url)

        # Upload menu photos to S3
        menu_photo_urls = []
        for photo in menu_photos:
            if photo.filename:
                content = await photo.read()
                url = save_to_s3(content, photo.filename, 'menu_photo')
                menu_photo_urls.append(url)

        # Create cafe object
        cafe = Cafe(
            cognito_sub=cognito_sub,
            name=name,
            description=description,
            phone_number=phone_number,
            address=address,
            city=city,
            latitude=latitude,
            longitude=longitude,
            cafe_photos=cafe_photo_urls,
            menu_photos=menu_photo_urls,
            website_link=website_link,
            menu_link=menu_link,
            instagram_url=instagram_url,
            two_tables=two_tables,
            four_tables=four_tables,
            table_config=table_config_list,
            amenities=amenities_list,
            working_hours=working_hours_dict,
            onboarding_completed=True # Marking as completed on creation
        )

        db.add(cafe)
        db.commit()
        db.refresh(cafe)
        print(f"DEBUG: Successfully created cafe {cafe.id} for owner {cognito_sub}")
        return cafe

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating cafe: {str(e)}")


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
        if key == 'table_config' and value is not None:
            # Convert list of TableConfigItem to list of dicts
            setattr(cafe, key, [i.dict() for i in value])
        elif key == 'working_hours' and value is not None:
             # Convert dict of WorkingHoursDay to dict of dicts
            setattr(cafe, key, {k: v.dict() for k, v in value.items()})
        else:
            setattr(cafe, key, value)

    db.commit()
    db.refresh(cafe)
    return cafe
