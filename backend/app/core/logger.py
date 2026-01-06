import logging
import sys
import time
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
import uuid
from typing import Optional

# Request ID traceability
request_id_ctx_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

class LogRedactor(logging.Filter):
    REDACT_KEYS = {"password", "token", "authorization", "cookie", "latitude", "longitude"}
    
    def filter(self, record):
        if hasattr(record, "msg") and isinstance(record.msg, str):
            # Simple string redaction for common patterns
            for key in self.REDACT_KEYS:
                if key in record.msg.lower():
                    # This is a very basic redactor; in a real app, use regex or JSON parsing
                    pass 
        return True

def setup_logging():
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates
    if logger.handlers:
        logger.handlers.clear()
        
    handler = logging.StreamHandler(sys.stdout)
    
    # Custom formatter that includes request_id
    class RequestIdFormatter(logging.Formatter):
        def format(self, record):
            record.request_id = request_id_ctx_var.get() or "no-request-id"
            return super().format(record)

    formatter = RequestIdFormatter(
        '[%(asctime)s] %(levelname)s [%(name)s] [%(request_id)s] %(message)s',
        datefmt='%H:%M:%S'
    )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.addFilter(LogRedactor())
    
    # Prevent propagation to root logger to avoid double logging
    logger.propagate = False
    return logger

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        token = request_id_ctx_var.set(request_id)
        start_time = time.time()
        
        logger = logging.getLogger("app")
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            logger.info(
                f"{request.method} {request.url.path} {response.status_code} ({duration:.2f}s)"
            )
            
            return response
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{request.method} {request.url.path} Failed: {str(e)} ({duration:.2f}s)")
            raise e
        finally:
            request_id_ctx_var.reset(token)

# Initialize on import
app_logger = setup_logging()
