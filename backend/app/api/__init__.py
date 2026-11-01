from fastapi import APIRouter
from .sites import router as sites_router
from .recommendations import router as recommendations_router
from .explain import router as explain_router
from .compare import router as compare_router
from .statistics import router as statistics_router
from .ml_metrics import router as ml_metrics_router
from .mnre import router as mnre_router
from .weather import router as weather_router
from .cost import router as cost_router

api_router = APIRouter()

api_router.include_router(sites_router)
api_router.include_router(recommendations_router)
api_router.include_router(explain_router)
api_router.include_router(compare_router)
api_router.include_router(statistics_router)
api_router.include_router(ml_metrics_router)
api_router.include_router(mnre_router)
api_router.include_router(weather_router)
api_router.include_router(cost_router)

__all__ = ["api_router"]

