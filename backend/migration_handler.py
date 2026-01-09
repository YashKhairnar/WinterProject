import os
import json
import boto3
import psycopg2

def handler(event, context):
    try:
        DB_HOST = os.getenv("DB_HOST")
        DB_PORT = os.getenv("DB_PORT", "5432")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_SECRET_ARN = os.getenv("DB_SECRET_ARN")

        if not all([DB_HOST, DB_NAME, DB_USER, DB_SECRET_ARN]):
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "Missing DB configuration env vars"})
            }

        # Fetch password from Secrets Manager
        sm = boto3.client("secretsmanager")
        resp = sm.get_secret_value(SecretId=DB_SECRET_ARN)
        secret_str = resp.get("SecretString")
        if not secret_str:
            raise RuntimeError("SecretString empty for DB secret")
        
        secret_data = json.loads(secret_str)
        password = secret_data["password"]

        # Connect to DB
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=password
        )
        conn.autocommit = True
        cur = conn.cursor()

        print(f"Connected to {DB_NAME} at {DB_HOST}")

        # SQL Migration: Add cancellation_reason column to reservations table
        sql = "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;"
        
        print(f"Executing: {sql}")
        cur.execute(sql)
        print("Successfully added cancellation_reason column to reservations table.")

        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Migration completed successfully"})
        }
    except Exception as e:
        print(f"Migration error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
