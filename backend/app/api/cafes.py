from fastapi import APIRouter

from app.schemas.cafes import CafeBase, CafePublic, CafeCreate

from app.db.deps import get_db
from app.db.model import Cafe
from sqlalchemy.orm import Session

from uuid import UUID
from fastapi import HTTPException, Depends


cafes_router = APIRouter(prefix='/cafes', tags=['cafes'])


# get the cafe details using <cafe_id> from the database
@cafes_router.get('/{cafe_id}', response_model=CafePublic)
async def get_cafe(cafe_id: UUID, db: Session = Depends(get_db)) ->CafePublic: #change it to uuid later
    cafe = db.query(Cafe).filter(Cafe.id == cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    return cafe


# create a new cafe in the database
@cafes_router.post('/', response_model=CafePublic, status_code=201) # 201 is the standard status code for created resources
def create_cafe(payload: CafeCreate, db: Session = Depends(get_db)) ->CafePublic: 
    cafe = Cafe(**payload.dict()) # create a new Cafe object ( db models ) from the payload
    db.add(cafe)
    db.commit()
    db.refresh(cafe)
    return cafe
