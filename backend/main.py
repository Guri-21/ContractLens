# Owner: Person 1 — main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import documents, analyze, auth, playbook, country_rules, users, audit, admin_analytics, settings
from app.database import db
import uvicorn

app = FastAPI(title="ContractLens API", version="1.0.0")

@app.on_event("startup")
async def startup():
    if not db.is_connected():
        await db.connect()
    await auth.ensure_seeded_access_users(db)

@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(playbook.router)
app.include_router(country_rules.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(analyze.router)
app.include_router(admin_analytics.router)
app.include_router(settings.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
