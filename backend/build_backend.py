import os
from pathlib import Path

backend = Path(r"d:\Projects\ContractLens\backend")

def create_file(path, content):
    p = backend / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

# 1. Update requirements.txt
req_path = backend / "requirements.txt"
reqs = req_path.read_text()
if "pyjwt" not in reqs:
    req_path.write_text(reqs + "pyjwt\npasslib[bcrypt]\n", encoding='utf-8')

# 2. Database config
database_py = """import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./contractlens.db")

# SQLite needs check_same_thread=False
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""
create_file("app/database.py", database_py)

# 3. Models
user_model = """from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True) # Admin, Legal Reviewer, Compliance Officer

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role_id = Column(String, ForeignKey("roles.id"))
    
    role = relationship("Role")
"""
create_file("app/models/user.py", user_model)

document_model = """from sqlalchemy import Column, String, ForeignKey
from app.database import Base
import uuid

class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    document_type = Column(String) # MSA, SOW, SLA, NDA, EXHIBIT, PLAYBOOK, LAW
    status = Column(String) # pending, processed
    file_path = Column(String)
    uploaded_by_id = Column(String, ForeignKey("users.id"))
"""
create_file("app/models/document.py", document_model)

clause_model = """from sqlalchemy import Column, String, Integer, ForeignKey, JSON
from app.database import Base

class Clause(Base):
    __tablename__ = "clauses"
    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.id"))
    document_name = Column(String)
    document_type = Column(String)
    section_number = Column(String, nullable=True)
    title = Column(String, nullable=True)
    page = Column(Integer, nullable=True)
    text = Column(String)
    clause_type = Column(String, nullable=True)
    references = Column(JSON, default=list)
    overrides = Column(JSON, default=list)
    table_data = Column(JSON, nullable=True)
"""
create_file("app/models/clause.py", clause_model)

risk_model = """from sqlalchemy import Column, String, ForeignKey, JSON
from app.database import Base

class RiskFinding(Base):
    __tablename__ = "risk_findings"
    id = Column(String, primary_key=True)
    clause_id = Column(String, ForeignKey("clauses.id"))
    risk_level = Column(String) # low, medium, high, critical
    status = Column(String) # evaluated, not_evaluated
    reason = Column(String)
    playbook_rule_violated = Column(String, nullable=True)
    evidence = Column(JSON, default=list)
    missing_documents = Column(JSON, nullable=True)
    redline = Column(JSON, nullable=True)
"""
create_file("app/models/risk.py", risk_model)

playbook_model = """from sqlalchemy import Column, String, Boolean
from app.database import Base
import uuid

class PlaybookRule(Base):
    __tablename__ = "playbook_rules"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String)
    description = Column(String)
    is_active = Column(Boolean, default=True)
"""
create_file("app/models/playbook.py", playbook_model)

country_model = """from sqlalchemy import Column, String, Boolean
from app.database import Base
import uuid

class CountryComplianceRule(Base):
    __tablename__ = "country_rules"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    country_code = Column(String, index=True)
    rule_title = Column(String)
    rule_description = Column(String)
    is_active = Column(Boolean, default=True)
"""
create_file("app/models/country_compliance.py", country_model)

audit_model = """from sqlalchemy import Column, String, ForeignKey, DateTime
from app.database import Base
from datetime import datetime, timezone
import uuid

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String)
    target_type = Column(String)
    target_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
"""
create_file("app/models/audit.py", audit_model)

init_models = """from .user import User, Role
from .document import Document
from .clause import Clause
from .risk import RiskFinding
from .playbook import PlaybookRule
from .country_compliance import CountryComplianceRule
from .audit import AuditLog
"""
create_file("app/models/__init__.py", init_models)


# 4. Auth and Security
security_py = """from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext

SECRET_KEY = "super-secret-key-for-demo"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
"""
create_file("app/core/security.py", security_py)

deps_py = """from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Role
from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.name not in allowed_roles:
            raise HTTPException(status_code=403, detail="Operation not permitted for your role")
        return current_user
    return role_checker
"""
create_file("app/api/deps.py", deps_py)

auth_api = """from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
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


# 5. Endpoints
documents_api = """from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.document import Document
from app.models.clause import Clause
from app.models.risk import RiskFinding
from app.models.audit import AuditLog
from app.api.deps import get_current_user, require_role
from app.schemas import ClauseDTO, RiskFindingDTO
from pydantic import BaseModel
import uuid
import os

router = APIRouter(prefix="/api/documents", tags=["documents"])

class AnalyzeRequest(BaseModel):
    playbookId: str = ""
    countryCode: str = ""

@router.post("/upload")
def upload_document(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    doc = Document(name=file.filename, document_type="MSA", status="pending", file_path=file_path, uploaded_by_id=current_user.id)
    db.add(doc)
    
    audit = AuditLog(user_id=current_user.id, action="UPLOAD_DOCUMENT", target_type="Document")
    db.add(audit)
    
    db.commit()
    db.refresh(doc)
    
    audit.target_id = doc.id
    db.commit()
    
    return {"documentId": doc.id, "status": doc.status}

@router.get("/")
def list_documents(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Document).all()

@router.post("/{document_id}/analyze")
def analyze_document(
    document_id: str, 
    request: AnalyzeRequest,
    db: Session = Depends(get_db), 
    current_user = Depends(require_role(["Admin", "Legal Reviewer"]))
):
    # This is a stubbed function as requested.
    # It would normally call `runAnalysisPipeline(documents, playbookId, countryCode)`
    
    # Returning mock data mapped from our seed script or existing DB clauses
    clauses = db.query(Clause).filter(Clause.document_id == document_id).all()
    if not clauses:
        # Generate some mock data if none exists
        return {"clauses": [], "risks": []}
        
    clause_ids = [c.id for c in clauses]
    risks = db.query(RiskFinding).filter(RiskFinding.clause_id.in_(clause_ids)).all()
    
    # Audit log
    audit = AuditLog(user_id=current_user.id, action="ANALYZE_DOCUMENT", target_type="Document", target_id=document_id)
    db.add(audit)
    db.commit()
    
    return {
        "clauses": clauses,
        "risks": risks
    }
"""
create_file("app/api/documents.py", documents_api)

playbook_api = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.playbook import PlaybookRule
from app.api.deps import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/playbook", tags=["playbook"])

class PlaybookCreate(BaseModel):
    title: str
    description: str
    is_active: bool = True

@router.get("/")
def get_playbook(db: Session = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return db.query(PlaybookRule).all()

@router.post("/")
def create_playbook_rule(rule: PlaybookCreate, db: Session = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer"]))):
    new_rule = PlaybookRule(**rule.dict())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule
"""
create_file("app/api/playbook.py", playbook_api)

country_rules_api = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.country_compliance import CountryComplianceRule
from app.api.deps import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/country-rules", tags=["country_rules"])

class CountryRuleCreate(BaseModel):
    country_code: str
    rule_title: str
    rule_description: str
    is_active: bool = True

@router.get("/")
def get_country_rules(db: Session = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return db.query(CountryComplianceRule).all()

@router.post("/")
def create_country_rule(rule: CountryRuleCreate, db: Session = Depends(get_db), current_user = Depends(require_role(["Admin", "Compliance Officer"]))):
    new_rule = CountryComplianceRule(**rule.dict())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule
"""
create_file("app/api/country_rules.py", country_rules_api)

users_api = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.api.deps import require_role

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/")
def list_users(db: Session = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    # Only Admin can list users
    users = db.query(User).all()
    return [{"id": u.id, "email": u.email, "role": u.role.name} for u in users]
"""
create_file("app/api/users.py", users_api)

audit_api = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.api.deps import require_role

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/")
def list_audit_logs(db: Session = Depends(get_db), current_user = Depends(require_role(["Admin", "Compliance Officer"]))):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
"""
create_file("app/api/audit.py", audit_api)

# 6. Main
main_py = """# Owner: Person 1 — main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import documents, analyze, auth, playbook, country_rules, users, audit
from app.database import engine, Base
import uvicorn

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ContractLens API", version="1.0.0")

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

print("Backend scaffolding generated successfully.")
