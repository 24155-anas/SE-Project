"""
Milaap — AI-Powered Lost & Found Web App for Lahore, Pakistan.

FastAPI entry point. Configures CORS, includes routers, and runs
startup tasks (DB table creation + Qdrant collection setup).
"""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.database import create_tables
from backend.routers import auth, matches, reports, search, users, admin, notifications
from backend.services import qdrant_service

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before the app begins serving requests."""
    logger.info("🚀 Starting Milaap backend …")

    # 1. Create database tables (if they don't exist)
    logger.info("Creating database tables …")
    await create_tables()
    logger.info("✅ Database tables ready.")

    # 2. Ensure Qdrant collection exists
    logger.info("Ensuring Qdrant collection …")
    await qdrant_service.ensure_collection()
    logger.info("✅ Qdrant collection ready.")

    logger.info("🟢 Milaap backend is ready to serve requests.")
    yield

    logger.info("🔴 Shutting down Milaap backend.")


# ── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Milaap API",
    description="AI-Powered Lost & Found platform for Lahore, Pakistan",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS middleware (allow all origins for development) ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(search.router)
app.include_router(matches.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(notifications.router)

# Mount static files
class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", NoCacheStaticFiles(directory=FRONTEND_DIR), name="static")


# ── Global exception handler ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler to return structured JSON errors."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ── Health check ────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "milaap-api"}


# ── Serve frontend ──────────────────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/", tags=["frontend"])
async def serve_frontend():
    """Serve the single-page frontend at the root URL."""
    index_file = FRONTEND_DIR / "index.html"
    content = index_file.read_text(encoding="utf-8")
    
    # Cache busting for JS and CSS files during development
    v = str(int(time.time()))
    content = content.replace(".js\"", f".js?v={v}\"").replace(".css\"", f".css?v={v}\"")
    
    response = HTMLResponse(content=content)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response
