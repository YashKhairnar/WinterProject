# backend/app/schemas/cafes.py
from typing import List, Optional
from pydantic import BaseModel, HttpUrl, Field
from uuid import UUID
from typing import Dict

class WorkingHoursDay(BaseModel):
    open: str = Field(..., example="08:00")
    close: str = Field(..., example="20:00")
    closed: bool = Field(default=False)

# Base model for cafes. What the client sends to create a new cafe
class CafeBase(BaseModel):
    cognito_sub : str = Field(...)

    name : str =  Field(..., example="Brew Lab Cafe")
    description : Optional[str] = Field(None,max_length= 300,example="Cozy cafe with great coffee and Wifi" )
    phone_number : str = Field(..., example="123-456-7890")
    address : str = Field(..., example="123 Main St, Anytown, USA")
    city : str = Field(..., example="Anytown")
    latitude : float = Field(..., example=40.7128)
    longitude : float = Field(..., example=-74.0060)

    cafe_photos : List[str] = Field(
        default_factory=list,
        example=["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
        )
    website_link : Optional[str] = Field(None, example="https://www.example.com")
    menu_photos : List[str] = Field(
        default_factory=list,
        example=["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
        )
    menu_link : Optional[str] = Field(None, example="https://www.example.com/menu")
    instagram_url : Optional[str] = Field(None, example="https://www.instagram.com/someCafe")
    
    total_tables : int = Field(..., example=10)
    occupancy_capacity : int = Field(..., example=10)
    occupancy_level : int = Field(..., example=10)

    amenities : List[str] = Field(
        default_factory=list,
        example=["free wifi", "outdoor seating", "coffee"]
        )
    working_hours : Dict[str, WorkingHoursDay] = Field(
        default_factory=dict,
        example={
            "Monday": {"open": "08:00", "close": "20:00", "closed": False},
            "Tuesday": {"open": "08:00", "close": "20:00", "closed": False}
        }
        )
    avg_rating : Optional[float] = Field(
        None,
        examples=4.5,
        description="Average rating of the cafe ( 1-5 )"
    )


    
# Public model for cafes. What the API returns to clients after reading from DB.
class CafePublic(CafeBase):
    id : UUID = Field(default_factory=UUID)
    avg_rating : Optional[float] = Field(
        None,
        examples=4.5,
        description="Average rating of the cafe ( 1-5 )"
    )
    occupancy_level : Optional[int] = Field(
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


# what the owner sends to update a cafe
class CafeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    website_link: Optional[str] = None
    menu_link: Optional[str] = None
    instagram_url: Optional[str] = None
    cafe_photos: Optional[List[str]] = None
    menu_photos: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    working_hours: Optional[Dict[str, WorkingHoursDay]] = None
    total_tables: Optional[int] = None
    occupancy_capacity: Optional[int] = None

