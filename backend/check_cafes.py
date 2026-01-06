
import sys
import os

# Add the project root to sys.path to allow importing from 'app'
sys.path.append(os.getcwd())

try:
    from app.db.session import SessionLocal
    from app.db.model import Cafe

    db = SessionLocal()
    cafes_count = db.query(Cafe).count()
    print(f"DEBUG: Found {cafes_count} cafes in the database.")
    
    if cafes_count > 0:
        cafes = db.query(Cafe).all()
        for cafe in cafes:
            print(f" - {cafe.name} (ID: {cafe.id})")
    
    db.close()
except Exception as e:
    print(f"ERROR: Failed to query database: {str(e)}")
