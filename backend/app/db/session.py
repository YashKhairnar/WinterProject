# backend/app/db/session.py
import os
import json
import boto3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.model import Cafe
from dotenv import load_dotenv

load_dotenv()

# Read from env (local dev) or use hardcoded fallback if absolutely necessary
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # If not in env, check if we are in Lambda/Production environment using AWS Secrets
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_SECRET_ARN = os.getenv("DB_SECRET_ARN")

    if all([DB_HOST, DB_NAME, DB_USER, DB_SECRET_ARN]):
        def get_db_password() -> str:
            sm = boto3.client("secretsmanager")
            resp = sm.get_secret_value(SecretId=DB_SECRET_ARN)
            secret_str = resp.get("SecretString")
            if not secret_str:
                raise RuntimeError("SecretString empty for DB secret")
            data = json.loads(secret_str)
            return data["password"]

        DB_PASSWORD = get_db_password()
        DATABASE_URL = (
            f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
    else:
        # If no configuration is found, and we're not in a dev environment with a DATABASE_URL, raise error
        raise RuntimeError(
            "Database configuration not found. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_SECRET_ARN."
        )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

# create tables if they don't exist
print("Ensuring tables exist...")
# Base.metadata.drop_all(bind=engine)  # DANGEROUS: Removed to prevent data loss
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

