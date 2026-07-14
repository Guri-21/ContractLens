import sys
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
    
    print("Clearing database...")
    await db.riskfinding.delete_many()
    await db.clause.delete_many()
    await db.document.delete_many()
    await db.playbookrule.delete_many()
    await db.countrycompliancerule.delete_many()
    await db.user.delete_many()
    await db.role.delete_many()
        
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
        "overrides": json.dumps([])
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
