from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.db.model import Cafe, OccupancyHistory
from app.schemas.occupancy import Occupancy, OccupancyHistoryPublic
from typing import List
from datetime import datetime, timedelta
from uuid import UUID

router = APIRouter(prefix='/occupancy', tags=['occupancy'])

@router.post('/', status_code=201)
def update_occupancy(payload: Occupancy, db: Session = Depends(get_db)):
    # 1. Verify cafe exists
    cafe = db.query(Cafe).filter(Cafe.id == payload.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # 2. Calculate current occupancy level (already handled in PATCH /cafes/{id}, but this is a dedicated endpoint)
    total_capacity = (payload.two_table_seats + payload.four_table_seats)
    total_occupied = (payload.two_seats_occupied + payload.four_seats_occupied)
    
    level = 0
    if total_capacity > 0:
        level = int((total_occupied / total_capacity) * 100)
    
    # 3. Update cafe occupancy_level
    cafe.occupancy_level = level
    
    # 4. Record History snapshot
    history_entry = OccupancyHistory(
        cafe_id=payload.cafe_id,
        occupancy_level=level,
        two_tables_occupied=payload.two_tables_occupied,
        four_tables_occupied=payload.four_tables_occupied,
        table_config=payload.table_config
    )
    
    db.add(cafe)
    db.add(history_entry)
    db.commit()
    
    return {"status": "success", "occupancy_level": level}

@router.get('/history/{cafe_id}', response_model=List[OccupancyHistoryPublic])
def get_occupancy_history(cafe_id: UUID, db: Session = Depends(get_db)):
    # Fetch history for the last 24 hours
    since = datetime.now() - timedelta(hours=24)
    history = db.query(OccupancyHistory).filter(
        OccupancyHistory.cafe_id == cafe_id,
        OccupancyHistory.created_at >= since
    ).order_by(OccupancyHistory.created_at.asc()).all()
    
    return history
