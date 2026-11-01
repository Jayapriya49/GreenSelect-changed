import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database.base import Base
from backend.app.database.session import engine, SessionLocal
from backend.app.api import api_router
from backend.app.models.site import CandidateSite
from backend.app.ml.model_manager import model_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("renewai.app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Check if database has candidate sites
    db = SessionLocal()
    try:
        site_count = db.query(CandidateSite).count()
        logger.info(f"Database contains {site_count} candidate sites.")
        
        # Ensure default cost assumptions are initialized
        from backend.app.services.cost_service import cost_service
        cost_service.ensure_default_assumptions(db)
        logger.info("Cost assumptions initialized.")
        
        # Check if model is loaded
        if model_manager.is_model_trained():
            logger.info("ML model and scaler loaded successfully.")
        else:
            logger.warning("ML model not yet trained on disk. Run `python scripts/train_pipeline.py`.")
    except Exception as e:
        logger.error(f"Startup check warning: {e}")
    finally:
        db.close()


    yield
    logger.info("Shutting down RENEWAI API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "model_trained": model_manager.is_model_trained()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
