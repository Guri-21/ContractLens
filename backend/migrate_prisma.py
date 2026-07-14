import os
import shutil
from pathlib import Path

backend = Path(r"d:\Projects\ContractLens\backend")

def create_file(path, content):
    p = backend / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

# 1. Update requirements.txt
req_path = backend / "requirements.txt"
reqs = req_path.read_text().split('\n')
new_reqs = [r for r in reqs if not r.startswith("sqlalchemy") and not r.startswith("alembic")]
if "prisma" not in new_reqs:
    new_reqs.append("prisma")
req_path.write_text("\n".join(new_reqs), encoding='utf-8')

# 2. Prisma Schema
schema_prisma = """datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider             = "prisma-client-py"
  recursive_type_depth = 5
}

model Role {
  id    String @id @default(uuid())
  name  String @unique
  users User[]
}

model User {
  id              String     @id @default(uuid())
  email           String     @unique
  hashed_password String
  role_id         String
  role            Role       @relation(fields: [role_id], references: [id])
  documents       Document[]
  audit_logs      AuditLog[]
}

model Document {
  id             String   @id @default(uuid())
  name           String
  document_type  String
  status         String
  file_path      String
  uploaded_by_id String
  uploader       User     @relation(fields: [uploaded_by_id], references: [id])
  clauses        Clause[]
}

model Clause {
  id             String        @id
  document_id    String
  document       Document      @relation(fields: [document_id], references: [id])
  document_name  String
  document_type  String
  section_number String?
  title          String?
  page           Int?
  text           String
  clause_type    String?
  references     Json?         @default("[]")
  overrides      Json?         @default("[]")
  table_data     Json?
  risks          RiskFinding[]
}

model RiskFinding {
  id                     String  @id
  clause_id              String
  clause                 Clause  @relation(fields: [clause_id], references: [id])
  risk_level             String
  status                 String
  reason                 String
  playbook_rule_violated String?
  evidence               Json?   @default("[]")
  missing_documents      Json?
  redline                Json?
}

model PlaybookRule {
  id          String  @id @default(uuid())
  title       String
  description String
  is_active   Boolean @default(true)
}

model CountryComplianceRule {
  id               String  @id @default(uuid())
  country_code     String
  rule_title       String
  rule_description String
  is_active        Boolean @default(true)
}

model AuditLog {
  id          String   @id @default(uuid())
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])
  action      String
  target_type String
  target_id   String?
  timestamp   DateTime @default(now())
}
"""
create_file("prisma/schema.prisma", schema_prisma)

# 3. App Database Setup
db_py = """from prisma import Prisma

db = Prisma()

async def get_db():
    if not db.is_connected():
        await db.connect()
    return db
"""
create_file("app/database.py", db_py)

# 4. Delete models
models_dir = backend / "app" / "models"
if models_dir.exists():
    shutil.rmtree(models_dir)

# 5. Endpoints
deps_py = """from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from prisma import Prisma
from app.database import get_db
from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Prisma = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
    
    user = await db.user.find_unique(where={"id": user_id}, include={"role": True})
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list[str]):
    async def role_checker(current_user = Depends(get_current_user)):
        if current_user.role.name not in allowed_roles:
            raise HTTPException(status_code=403, detail="Operation not permitted for your role")
        return current_user
    return role_checker
"""
create_file("app/api/deps.py", deps_py)

auth_api = """from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from prisma import Prisma
from app.database import get_db
from app.core.security import verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Prisma = Depends(get_db)):
    user = await db.user.find_unique(where={"email": form_data.username})
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}
"""
create_file("app/api/auth.py", auth_api)

documents_api = """from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List
from prisma import Prisma
from app.database import get_db
from app.api.deps import get_current_user, require_role
from pydantic import BaseModel
import os
import json

router = APIRouter(prefix="/api/documents", tags=["documents"])

class AnalyzeRequest(BaseModel):
    playbookId: str = ""
    countryCode: str = ""

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    db: Prisma = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    doc = await db.document.create(
        data={
            "name": file.filename, 
            "document_type": "MSA", 
            "status": "pending", 
            "file_path": file_path, 
            "uploaded_by_id": current_user.id
        }
    )
    
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "UPLOAD_DOCUMENT", 
            "target_type": "Document",
            "target_id": doc.id
        }
    )
    
    return {"documentId": doc.id, "status": doc.status}

@router.get("/")
async def list_documents(db: Prisma = Depends(get_db), current_user = Depends(get_current_user)):
    return await db.document.find_many()

@router.post("/{document_id}/analyze")
async def analyze_document(
    document_id: str, 
    request: AnalyzeRequest,
    db: Prisma = Depends(get_db), 
    current_user = Depends(require_role(["Admin", "Legal Reviewer"]))
):
    # This is a stubbed function as requested.
    # It would normally call `runAnalysisPipeline(documents, playbookId, countryCode)`
    
    # Returning mock data mapped from our seed script or existing DB clauses
    clauses = await db.clause.find_many(where={"document_id": document_id})
    if not clauses:
        return {"clauses": [], "risks": []}
        
    clause_ids = [c.id for c in clauses]
    risks = await db.riskfinding.find_many(where={"clause_id": {"in": clause_ids}})
    
    # Parse JSON fields correctly for FastAPI response
    for c in clauses:
        if c.references: c.references = json.loads(c.references)
        if c.overrides: c.overrides = json.loads(c.overrides)
        if c.table_data: c.table_data = json.loads(c.table_data)
        
    for r in risks:
        if r.evidence: r.evidence = json.loads(r.evidence)
        if r.missing_documents: r.missing_documents = json.loads(r.missing_documents)
        if r.redline: r.redline = json.loads(r.redline)
    
    await db.auditlog.create(
        data={
            "user_id": current_user.id, 
            "action": "ANALYZE_DOCUMENT", 
            "target_type": "Document", 
            "target_id": document_id
        }
    )
    
    return {
        "clauses": clauses,
        "risks": risks
    }
"""
create_file("app/api/documents.py", documents_api)

playbook_api = """from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/playbook", tags=["playbook"])

class PlaybookCreate(BaseModel):
    title: str
    description: str
    is_active: bool = True

@router.get("/")
async def get_playbook(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return await db.playbookrule.find_many()

@router.post("/")
async def create_playbook_rule(rule: PlaybookCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer"]))):
    return await db.playbookrule.create(data=rule.dict())
"""
create_file("app/api/playbook.py", playbook_api)

country_rules_api = """from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/country-rules", tags=["country_rules"])

class CountryRuleCreate(BaseModel):
    country_code: str
    rule_title: str
    rule_description: str
    is_active: bool = True

@router.get("/")
async def get_country_rules(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return await db.countrycompliancerule.find_many()

@router.post("/")
async def create_country_rule(rule: CountryRuleCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Compliance Officer"]))):
    return await db.countrycompliancerule.create(data=rule.dict())
"""
create_file("app/api/country_rules.py", country_rules_api)

users_api = """from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/")
async def list_users(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    users = await db.user.find_many(include={"role": True})
    return [{"id": u.id, "email": u.email, "role": u.role.name} for u in users]
"""
create_file("app/api/users.py", users_api)

audit_api = """from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/")
async def list_audit_logs(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Compliance Officer"]))):
    return await db.auditlog.find_many(order={"timestamp": "desc"})
"""
create_file("app/api/audit.py", audit_api)

# 6. Main.py startup/shutdown
main_py = """# Owner: Person 1 — main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import documents, analyze, auth, playbook, country_rules, users, audit
from app.database import db
import uvicorn

app = FastAPI(title="ContractLens API", version="1.0.0")

@app.on_event("startup")
async def startup():
    if not db.is_connected():
        await db.connect()

@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
"""
create_file("main.py", main_py)

# 7. Seed Script
seed_py = """import sys
import os
import asyncio
import json

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prisma import Prisma
from app.core.security import get_password_hash
import uuid

async def seed():
    db = Prisma()
    await db.connect()
    
    # Check if seeded
    existing_role = await db.role.find_first()
    if existing_role:
        print("Database already seeded.")
        await db.disconnect()
        return
        
    print("Seeding database...")
    
    # Roles
    admin_role = await db.role.create(data={"name": "Admin"})
    reviewer_role = await db.role.create(data={"name": "Legal Reviewer"})
    compliance_role = await db.role.create(data={"name": "Compliance Officer"})
    
    # Users
    admin_user = await db.user.create(data={
        "email": "admin@contractlens.com", 
        "hashed_password": get_password_hash("admin123"), 
        "role_id": admin_role.id
    })
    reviewer_user = await db.user.create(data={
        "email": "reviewer@contractlens.com", 
        "hashed_password": get_password_hash("reviewer123"), 
        "role_id": reviewer_role.id
    })
    compliance_user = await db.user.create(data={
        "email": "compliance@contractlens.com", 
        "hashed_password": get_password_hash("compliance123"), 
        "role_id": compliance_role.id
    })
    
    # Playbook Rule
    pb_rule = await db.playbookrule.create(data={
        "title": "Net 30 Payment Terms",
        "description": "All payment terms must be Net 30 or better.",
        "is_active": True
    })
    
    # Country Rule
    ctry_rule = await db.countrycompliancerule.create(data={
        "country_code": "US",
        "rule_title": "Data Privacy",
        "rule_description": "Must comply with state-level data privacy laws.",
        "is_active": True
    })
    
    # Documents
    doc1 = await db.document.create(data={
        "name": "Vendor_MSA_AcmeCorp.pdf",
        "document_type": "MSA",
        "status": "processed",
        "file_path": "uploads/Vendor_MSA_AcmeCorp.pdf",
        "uploaded_by_id": admin_user.id
    })
    
    # Clauses
    clause1 = await db.clause.create(data={
        "id": "clause-001",
        "document_id": doc1.id,
        "document_name": doc1.name,
        "document_type": doc1.document_type,
        "section_number": "4.1",
        "title": "Payment Terms",
        "page": 2,
        "text": "Customer shall pay all undisputed invoices within sixty (60) days of receipt.",
        "clause_type": "Payment",
        "references": json.dumps([]),
        "overrides": json.dumps([]),
        "table_data": None
    })
    
    # Risk
    risk1 = await db.riskfinding.create(data={
        "id": "risk-001",
        "clause_id": clause1.id,
        "risk_level": "high",
        "status": "evaluated",
        "reason": "Payment terms of 60 days violate the Playbook requirement of Net 30.",
        "playbook_rule_violated": pb_rule.id,
        "evidence": json.dumps([{
            "documentName": doc1.name,
            "page": 2,
            "section": "4.1",
            "quote": "within sixty (60) days"
        }]),
        "missing_documents": json.dumps([]),
        "redline": json.dumps({
            "originalText": "within sixty (60) days of receipt.",
            "suggestedText": "within thirty (30) days of receipt.",
            "diffHtml": None
        })
    })
    
    print("Seeding complete.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed())
"""
create_file("scripts/seed_demo.py", seed_py)

# 8. .env.example
env_example = """# Prisma connection string (Neon Serverless Postgres)
# Replace with your actual Neon database URL
# Important: For Neon pooling, use the connection string with "-pooler" or append ?pgbouncer=true if using JS, but for Python standard direct connection usually works fine:
DATABASE_URL="postgresql://user:password@ep-cool-butterfly-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

ANTHROPIC_API_KEY=""
"""
create_file(".env.example", env_example)

print("Prisma migration script generated.")
