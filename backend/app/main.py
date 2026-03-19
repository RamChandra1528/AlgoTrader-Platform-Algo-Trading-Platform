from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, dashboard, strategies, backtests, trading, websocket, autotrading
from app.api import admin
from app.config import settings
from app.core.json_utils import SafeJSONResponse
from app.database import SessionLocal, engine
from app.models import Base
from app.db_migrations import migrate
from app.services.admin import bootstrap_admin_system, broadcast_system_state

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    default_response_class=SafeJSONResponse,
)

@app.on_event("startup")
def on_startup():
    # Ensure schema is up-to-date (SQLite dev DB) and create tables
    migrate(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap_admin_system(db)
        broadcast_system_state(db)
    finally:
        db.close()

# Add CORS middleware FIRST (before routers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=36000,
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(strategies.router, prefix="/api/strategies", tags=["Strategies"])
app.include_router(backtests.router, prefix="/api/backtests", tags=["Backtests"])
app.include_router(trading.router, prefix="/api/trading", tags=["Trading"])
app.include_router(autotrading.router, prefix="/api/autotrading", tags=["AutoTrading"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}
