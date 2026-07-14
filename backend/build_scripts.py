import os
from pathlib import Path

backend = Path(r"d:\Projects\ContractLens\backend")

def create_file(path, content):
    p = backend / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')


seed_script = """import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.user import User, Role
from app.models.document import Document
from app.models.clause import Clause
from app.models.risk import RiskFinding
from app.models.playbook import PlaybookRule
from app.models.country_compliance import CountryComplianceRule
from app.core.security import get_password_hash
import uuid

def seed():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if seeded
    if db.query(Role).first():
        print("Database already seeded.")
        return
        
    print("Seeding database...")
    
    # Roles
    admin_role = Role(id=str(uuid.uuid4()), name="Admin")
    reviewer_role = Role(id=str(uuid.uuid4()), name="Legal Reviewer")
    compliance_role = Role(id=str(uuid.uuid4()), name="Compliance Officer")
    
    db.add_all([admin_role, reviewer_role, compliance_role])
    db.commit()
    
    # Users
    admin_user = User(
        id=str(uuid.uuid4()), 
        email="admin@contractlens.com", 
        hashed_password=get_password_hash("admin123"), 
        role_id=admin_role.id
    )
    reviewer_user = User(
        id=str(uuid.uuid4()), 
        email="reviewer@contractlens.com", 
        hashed_password=get_password_hash("reviewer123"), 
        role_id=reviewer_role.id
    )
    compliance_user = User(
        id=str(uuid.uuid4()), 
        email="compliance@contractlens.com", 
        hashed_password=get_password_hash("compliance123"), 
        role_id=compliance_role.id
    )
    
    db.add_all([admin_user, reviewer_user, compliance_user])
    db.commit()
    
    # Playbook Rule
    pb_rule = PlaybookRule(
        title="Net 30 Payment Terms",
        description="All payment terms must be Net 30 or better.",
        is_active=True
    )
    db.add(pb_rule)
    db.commit()
    
    # Country Rule
    ctry_rule = CountryComplianceRule(
        country_code="US",
        rule_title="Data Privacy",
        rule_description="Must comply with state-level data privacy laws.",
        is_active=True
    )
    db.add(ctry_rule)
    db.commit()
    
    # Documents
    doc1 = Document(
        id="doc-001",
        name="Vendor_MSA_AcmeCorp.pdf",
        document_type="MSA",
        status="processed",
        file_path="uploads/Vendor_MSA_AcmeCorp.pdf",
        uploaded_by_id=admin_user.id
    )
    db.add(doc1)
    db.commit()
    
    # Clauses
    clause1 = Clause(
        id="clause-001",
        document_id=doc1.id,
        document_name=doc1.name,
        document_type=doc1.document_type,
        section_number="4.1",
        title="Payment Terms",
        page=2,
        text="Customer shall pay all undisputed invoices within sixty (60) days of receipt.",
        clause_type="Payment",
        references=[],
        overrides=[],
        table_data=None
    )
    db.add(clause1)
    db.commit()
    
    # Risk
    risk1 = RiskFinding(
        id="risk-001",
        clause_id=clause1.id,
        risk_level="high",
        status="evaluated",
        reason="Payment terms of 60 days violate the Playbook requirement of Net 30.",
        playbook_rule_violated=pb_rule.id,
        evidence=[{
            "documentName": doc1.name,
            "page": 2,
            "section": "4.1",
            "quote": "within sixty (60) days"
        }],
        missing_documents=[],
        redline={
            "originalText": "within sixty (60) days of receipt.",
            "suggestedText": "within thirty (30) days of receipt.",
            "diffHtml": None
        }
    )
    db.add(risk1)
    db.commit()
    
    print("Seeding complete.")
    db.close()

if __name__ == "__main__":
    seed()
"""
create_file("scripts/seed_demo.py", seed_script)


dump_script = """import json
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

def dump():
    openapi_schema = app.openapi()
    
    # Determine repo root (d:/Projects/ContractLens)
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_path = os.path.join(repo_root, "..", "openapi.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
        
    print(f"OpenAPI spec successfully dumped to {output_path}")

if __name__ == "__main__":
    dump()
"""
create_file("scripts/dump_openapi.py", dump_script)

print("Scripts generated.")
