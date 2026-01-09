from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.cafes import cafes_router
from app.api.users import router as users_router
from app.api.liveUpdate import liveUpdates_router
from app.api.checkins import router as checkins_router
from app.api.reviews import router as reviews_router
from app.api.occupancy import router as occupancy_router
from app.api.reservations import router as reservations_router
from app.api.upload import router as upload_router



from app.db.base import Base
from app.db.session import engine
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retrieve/Create tables
    Base.metadata.create_all(bind=engine)
    yield

from app.core.logger import LoggingMiddleware

app = FastAPI(lifespan=lifespan)

# Add Logging Middleware
app.add_middleware(LoggingMiddleware)

# Mount static files to serve uploads locally
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if not os.path.exists(static_dir):
    os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "https://d1qciprdjl1a7f.cloudfront.net", # Admin Production URL
        "https://d2bbsr7w8asxtx.cloudfront.net", # Verified Admin Production URL
        "https://main.d346k14opurixl.amplifyapp.com", # Admin Amplify URL
        "https://nookstudio.online"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cafes_router)
app.include_router(users_router)
app.include_router(liveUpdates_router)
app.include_router(checkins_router)
app.include_router(reviews_router)
app.include_router(occupancy_router)
app.include_router(reservations_router)
app.include_router(upload_router)



@app.get("/")
def read_root():
    return {"hello": "world"}

