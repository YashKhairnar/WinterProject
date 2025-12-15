# backend/app/db/session.py
import os
import json
import boto3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.model import Cafe


# Read basic connection info from env by infra
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_SECRET_ARN = os.getenv("DB_SECRET_ARN")
if not all([DB_HOST, DB_NAME, DB_USER, DB_SECRET_ARN]):
    raise RuntimeError(
        f"DB env vars not set properly: "
        f"DB_HOST={DB_HOST}, DB_NAME={DB_NAME}, DB_USER={DB_USER}, DB_SECRET_ARN={DB_SECRET_ARN}"
    )



def get_db_password() -> str:
    sm = boto3.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=DB_SECRET_ARN)
    secret_str = resp.get("SecretString")
    if not secret_str:
        raise RuntimeError("SecretString empty for DB secret")
    data = json.loads(secret_str)
    # This structure is what RDS + from_generated_secret() creates
    return data["password"]



DB_PASSWORD = get_db_password()
DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)



# create tables if they don't exist
print("Creating tables if not exist...")
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
