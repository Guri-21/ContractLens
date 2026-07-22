# Owner: Person 1 — main.py
import json
import logging
import os

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import documents, analyze, auth, playbook, country_rules, users, audit, admin_analytics, settings
from app.core.limiter import limiter
from app.core.security import ENABLE_DEMO_USERS
from app.database import db, get_db
import uvicorn


def _cors_origins() -> list[str]:
    """Explicit allowlist from CORS_ALLOW_ORIGINS (comma-separated). Falls back
    to localhost dev origins. Never returns '*' (invalid with credentials)."""
    raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip() and origin.strip() != "*"]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]


def _configure_json_logging() -> None:
    class _JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            entry: dict = {
                "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            for extra in ("user_id", "document_id", "duration_ms"):
                if hasattr(record, extra):
                    entry[extra] = getattr(record, extra)
            if record.exc_info:
                entry["exception"] = self.formatException(record.exc_info)
            return json.dumps(entry)

    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)


_configure_json_logging()

# Interactive API docs expose the full surface; keep them only in demo/dev.
_docs_enabled = ENABLE_DEMO_USERS
app = FastAPI(
    title="ContractLens API",
    version="1.0.0",
    redirect_slashes=False,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS must be outermost — registered last so it wraps everything
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    return response


@app.on_event("startup")
async def startup():
    if not db.is_connected():
        await db.connect()
    await auth.ensure_seeded_access_users(db)


@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()


app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(playbook.router)
app.include_router(country_rules.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(analyze.router)
app.include_router(admin_analytics.router)
app.include_router(settings.router)


@app.get("/health", tags=["ops"])
async def health_check(database=Depends(get_db)):
    try:
        await database.user.count()
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        # Log the detail server-side; don't leak DB internals to the caller.
        logging.getLogger(__name__).error("Health check DB failure: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
