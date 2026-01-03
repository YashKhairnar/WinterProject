from pydantic import BaseModel
from uuid import UUID

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
