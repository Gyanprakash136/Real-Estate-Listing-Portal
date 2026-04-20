import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db.database import engine, Base
from models import user, listing, inquiry  # noqa: ensure models are registered

from routers import auth, listings, search, inquiries, admin, chat

# ─── Create Tables ────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── App ──────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="A premium Real Estate Listing Portal backed by a Kafka + Airflow data pipeline.",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

if settings.frontend_url:
    origins.append(settings.frontend_url.rstrip('/'))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files (uploads) ───────────────────────────────────────
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(listings.router, prefix="/listings", tags=["Listings"])
app.include_router(search.router, prefix="/search", tags=["Search"])
app.include_router(inquiries.router, prefix="/inquiries", tags=["Inquiries"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])


@app.get("/", tags=["Health"])
def root():
    return {
        "service": settings.app_name,
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


import traceback
import logging
from fastapi.responses import JSONResponse
from fastapi import Request

logger_app = logging.getLogger("app")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    # Log internally — never expose traceback to the client
    logger_app.error(f"Unhandled exception on {request.method} {request.url}:\n{tb}")
    with open("error_log.txt", "a") as f:
        f.write(f"\n--- {request.method} {request.url} ---\n{tb}")
    return JSONResponse(status_code=500, content={"detail": "An internal server error occurred."})
