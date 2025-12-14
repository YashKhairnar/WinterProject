from mangum import Mangum 
from app.main import app    # FastAPI instance

handler = Mangum(app) 


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
