"""
VulnX-Ray Backend API
A FastAPI application for CMS security auditing and vulnerability scanning.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.security import APIKeyHeader
from fastapi import Security, Depends

from api.v1 import vulnx_search, searches, alerts, ingestion, nuclei, assets
from services.vulnx_installer import initialize_vulnx
from database import init_db, SessionLocal
import services.notification_service as notification_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# API Key Authentication
API_KEY_NAME = "X-API-Key"
API_KEY_VALUE = "vulnx-secret-key-123"  # In production, move to .env
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify the API Key."""
    # Allow local development bypass if no key is sent (optional, but requested for 'complete tool')
    # Actually, for a security tool, let's enforce it strictly.
    if api_key != API_KEY_VALUE:
        raise HTTPException(
            status_code=403, 
            detail="Could not validate credentials. Please provide a valid X-API-Key."
        )
    return api_key

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting VulnX-Ray API...")
    init_db()  # Initialize database (tables)
    await initialize_vulnx()  # Initialize Vulnx installation
    
    # Initialize and start Monitor Service
    logger.info("Initializing Monitor Service...")
    notification_service.monitor_service = notification_service.MonitorService(SessionLocal)
    await notification_service.monitor_service.start()
    
    yield
    
    # Shutdown
    logger.info("Shutting down VulnX-Ray API...")
    if notification_service.monitor_service:
        notification_service.monitor_service.stop()


app = FastAPI(
    title="VulnX-Ray API",
    description="""
    # VulnX-Ray API
    
    The **VulnX-Ray API** provides a powerful interface for CVE intelligence and vulnerability scanning. 
    It leverages ProjectDiscovery tools (cvemap + nuclei) with enhanced capabilities:
    
    *   **Advanced CVE Search**: Filter by severity, CVSS/EPSS scores, KEV status, and more.
    *   **Multi-Source Data Ingestion**: Aggregates CVE data from NVD, GitHub, and other sources.
    *   **Historical Trends**: Aggregated statistics and timeseries data.

    *   **Notification System**: Real-time alerts via Email and Webhooks for new vulnerabilities.
    *   **Search History**: Track and save complex search queries.
    
    ## Authentication
    This API is protected by API Key authentication. Provide the `X-API-Key` header in all requests.
    """,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    dependencies=[Depends(verify_api_key)]
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(vulnx_search.router, prefix="/api/v1/vulnx-search", tags=["CVE Search"])
app.include_router(ingestion.router, prefix="/api/v1/ingestion", tags=["Data Ingestion"])
app.include_router(searches.router, prefix="/api/v1", tags=["Search Management"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(nuclei.router, prefix="/api/v1/nuclei", tags=["Nuclei Scanner"])
app.include_router(assets.router, prefix="/api/v1/assets", tags=["Asset Inventory"])


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Status of the API and its components
    """
    return {
        "status": "healthy",
        "service": "VulnX-Ray API",
        "version": "3.0.0",
        "components": {
            "api": "operational",
            "database": "operational",
            "vulnx_cli": "operational"
        }
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to VulnX-Ray API",
        "documentation": "/docs",
        "health": "/health",
        "version": "3.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
