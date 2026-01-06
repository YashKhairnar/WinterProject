from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Any, Union, Optional

class Occupancy(BaseModel):
    cafe_id : UUID
    two_tables : int 
    four_tables : int

    two_table_seats: int
    four_table_seats: int

    two_tables_occupied: int
    four_tables_occupied: int

    two_seats_occupied: int
    four_seats_occupied: int
    table_config: List[Any] = []

class OccupancyHistoryPublic(BaseModel):
    id: UUID
    occupancy_level: int
    table_config: List[Any] = []
    created_at: datetime

    class Config:
        from_attributes = True
