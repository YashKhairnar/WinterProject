# backend/lambda_handler.py
import json
from mangum import Mangum
from app.main import app

asgi_handler = Mangum(app)

def handler(event, context):
    # Debug print – shows up in CloudWatch logs
    print("RAW EVENT:", json.dumps(event))
    try:
        return asgi_handler(event, context)
    except RuntimeError as e:
        # TEMP: surface Mangum error and event back to client for debugging
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "mangum_error": str(e),
                "event_keys": list(event.keys())
            }),
        }



# Mangum wraps that FastAPI app in an object that speaks AWS Lambda + API Gateway format

# Mangum internally:
# - Takes the Lambda event + context
# - Converts it into an ASGI request (what FastAPI expects)
# - Calls your FastAPI app
# - Converts FastAPI’s response back into the API Gateway format
# - Returns that to AWS

# handler is the function that will be called by AWS Lambda
# Meaning:
# Look in lambda_handler.py
# Call the callable named handler
