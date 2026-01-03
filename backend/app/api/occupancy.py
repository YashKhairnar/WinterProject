from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.db.model import Occupancy as OccupancyModel
from app.schemas.occupancy import Occupancy as OccupancySchema

occupancy_router = APIRouter(tags=['occupancy'])


# POST /occupancy
@occupancy_router.post("/occupancy", response_model=OccupancySchema)
def create_occupancy_update(payload: OccupancySchema, db: Session = Depends(get_db)):
    """
    Creates a new occupancy record for a cafe.
    Calculates total_seats from two_table_seats and four_table_seats.
    """
    try:
        occupancy_record = OccupancyModel(
            cafe_id=payload.cafe_id,
            two_tables=payload.two_tables,
            four_tables=payload.four_tables,
            total_seats=payload.two_table_seats + payload.four_table_seats,
            two_tables_occupied=payload.two_tables_occupied,
            four_tables_occupied=payload.four_tables_occupied,
            two_seats_occupied=payload.two_seats_occupied,
            four_seats_occupied=payload.four_seats_occupied
        )
        
        db.add(occupancy_record)
        db.commit()
        db.refresh(occupancy_record)
        return payload  # For now return the same payload as it matches the schema
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating occupancy: {str(e)}")
