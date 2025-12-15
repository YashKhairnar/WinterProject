# backend/app/schemas/cafes.py
from typing import List, Optional
from pydantic import BaseModel, HttpUrl, Field
from uuid import UUID

# Base model for cafes
class CafeBase(BaseModel):
    name : str =  Field(..., example="Brew Lab Cafe")
    description : Optional[str] = Field(None,max_length= 300,example="Cozy cafe with great coffee and Wifi" )
    address : str = Field(..., example="123 Main St, Anytown, USA")
    city : str = Field(..., example="Anytown")
    latitude : float = Field(..., example=40.7128)
    longitude : float = Field(..., example=-74.0060)
    instagram_url : Optional[str] = Field(None, example="https://www.instagram.com/someCafe")
    amenities : List[str] = Field(
        default_factory=list,
        example=["free wifi", "outdoor seating", "coffee"]
        )

    
# Public model for cafes. What the API returns to clients after reading from DB.
class CafePublic(CafeBase):
    id : UUID = Field(default_factory=UUID)
    avg_rating : Optional[float] = Field(
        None,
        examples=4.5,
        description="Average rating of the cafe ( 1-5 )"
    )
    occupancy_level : Optional[str] = Field(
        None, 
        ge=0,
        le=100,
        description="Current occupancy as percentage 0-100",
        example = 65
    )
    class Config:
        from_attributes= True


# what the client sends to create a  new cafe
class CafeCreate(CafeBase):
    pass
