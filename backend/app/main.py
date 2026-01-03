from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.cafes import cafes_router
from app.api.users import router as users_router
from app.api.occupancy import occupancy_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cafes_router)
app.include_router(users_router)
app.include_router(occupancy_router)

@app.get("/")
def read_root():
    return {"hello": "world"}
