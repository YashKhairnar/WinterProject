from typing import Union
from fastapi import FastAPI
from app.api.cafes import cafes_router

app = FastAPI()
app.include_router(cafes_router)

@app.get("/")
def read_root():
    return { "hello": 'world'}
