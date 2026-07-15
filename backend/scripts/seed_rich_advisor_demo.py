import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prisma import Json, Prisma

from app.core.security import get_password_hash


ADMIN_EMAIL = "admin@contractlens.com"
ADMIN_PASSWORD = "12345"
ADVISORS = [
    ("advisor1@contractlens.com", "1", "AcmeCorp"),
    ("advisor2@contractlens.com", "2", "FinEdge"),
    ("advisor3@contractlens.com", "3", "HealthPlus"),
    ("advisor4@contractlens.com", "4", "CloudNova"),
    ("advisor5@contractlens.com", "5", "RetailGrid"),
]


PORTFOLIOS = [
    {
        "client": "AcmeCorp",
        "theme": "software implementation",
        "msa_payment": "Client shall pay all undisputed invoices within thirty (30) days from receipt.",
        "sow_payment": "Client shall pay invoices within ninety (90) days from invoice date.",
        "msa_liability": "Vendor's aggregate liability shall not exceed the fees paid in the twelve (12) months preceding the claim.",
        "sow_liability": "Vendor accepts uncapped liability for all service failures and delay claims.",
        "msa_sla": "Service credits shall be capped at five percent (5%) of monthly fees.",
        "sow_sla": "Service credits shall be twenty percent (20%) of monthly fees for any missed milestone.",
        "msa_law": "This Agreement is governed by the laws of India with arbitration seated in Bengaluru.",
        "sow_law": "This SOW is governed by Delaware law with courts in New York having exclusive jurisdiction.",
    },
    {
        "client": "FinEdge",
        "theme": "payment gateway integration",
        "msa_payment": "All undisputed amounts are payable within thirty (30) days of receipt of invoice.",
        "sow_payment": "Fees shall be payable within seventy-five (75) days after quarterly invoice submission.",
        "msa_liability": "Total liability is capped at one times the annual fees paid under the applicable SOW.",
        "sow_liability": "Vendor shall indemnify Client without limitation for transaction losses and chargebacks.",
        "msa_sla": "Penalty credits are capped at ten percent (10%) of the affected monthly service fee.",
        "sow_sla": "Penalty credits shall be thirty percent (30%) of the total quarterly fee for each outage.",
        "msa_law": "Indian law governs and disputes shall be resolved by arbitration in Mumbai.",
        "sow_law": "The parties submit to Singapore courts and waive arbitration for urgent disputes.",
    },
    {
        "client": "HealthPlus",
        "theme": "patient data platform",
        "msa_payment": "Payment shall be made within thirty (30) days of receipt of a valid invoice.",
        "sow_payment": "Client may defer payment until ninety (90) days after production acceptance.",
        "msa_liability": "Neither party is liable for indirect damages, and direct damages are capped at twelve months of fees.",
        "sow_liability": "Vendor shall be responsible for consequential damages arising from data migration issues.",
        "msa_sla": "SLA remedies are sole and exclusive remedies and shall not exceed five percent (5%) of monthly fees.",
        "sow_sla": "SLA breaches trigger service credits plus separate liquidated damages of INR 50 lakh per incident.",
        "msa_law": "This MSA is governed by Indian law and arbitration under the Arbitration and Conciliation Act, 1996.",
        "sow_law": "Disputes under this SOW shall be filed before courts in London, England.",
    },
    {
        "client": "CloudNova",
        "theme": "managed cloud migration",
        "msa_payment": "Invoices are due and payable within thirty (30) days from receipt.",
        "sow_payment": "Cloud migration milestone invoices are payable within one hundred twenty (120) days.",
        "msa_liability": "Liability for service claims is capped at the fees paid during the prior twelve (12) months.",
        "sow_liability": "Vendor liability for cloud downtime shall be unlimited until final migration acceptance.",
        "msa_sla": "Monthly service credits shall not exceed ten percent (10%) of recurring monthly fees.",
        "sow_sla": "Each failed migration wave carries a twenty-five percent (25%) service credit plus refund rights.",
        "msa_law": "The agreement is governed by India law with arbitration seated in Hyderabad.",
        "sow_law": "This SOW will be governed by California law and litigated in San Francisco courts.",
    },
    {
        "client": "RetailGrid",
        "theme": "omnichannel commerce rollout",
        "msa_payment": "Client shall pay undisputed fees within thirty (30) days after invoice receipt.",
        "sow_payment": "Client shall pay rollout fees within sixty (60) days after each regional go-live.",
        "msa_liability": "Aggregate liability is limited to fees paid under the affected SOW in the prior twelve months.",
        "sow_liability": "Vendor shall bear unlimited liability for store revenue loss during rollout delays.",
        "msa_sla": "Service level credits are capped at five percent (5%) of monthly recurring fees.",
        "sow_sla": "Missed launch dates result in fifteen percent (15%) monthly credits and separate penalties.",
        "msa_law": "Indian law applies and disputes shall be arbitrated in Delhi.",
        "sow_law": "All disputes shall be subject to courts in Dubai International Financial Centre.",
    },
]


async def ensure_role(db: Prisma, name: str):
    role = await db.role.find_unique(where={"name": name})
    if role:
        return role
    return await db.role.create(data={"name": name})


async def upsert_user(db: Prisma, email: str, password: str, role_id: str):
    existing = await db.user.find_unique(where={"email": email})
    data = {
        "hashed_password": get_password_hash(password),
        "role_id": role_id,
    }
    if existing:
        return await db.user.update(where={"id": existing.id}, data=data)
    return await db.user.create(data={"email": email, **data})


async def remove_existing_demo(db: Prisma) -> None:
    documents = await db.document.find_many()
    demo_document_ids = [
        document.id
        for document in documents
        if document.id.startswith("rich-demo-") or document.id.startswith("demo-advisor-")
    ]
    if not demo_document_ids:
        return
    await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": {"in": demo_document_ids}}}})
    await db.clause.delete_many(where={"document_id": {"in": demo_document_ids}})
    await db.document.delete_many(where={"id": {"in": demo_document_ids}})
    print(f"Removed {len(demo_document_ids)} previous demo documents.")


def portfolio_clauses(index: int, portfolio: dict) -> list[dict]:
    prefix = f"rich-{index}"
    client = portfolio["client"]
    return [
        clause(prefix, "msa", "1", "Definitions", 1, f"Services means the {portfolio['theme']} services described in an applicable Statement of Work.", "definitions"),
        clause(prefix, "msa", "3.1", "Payment Terms", 3, portfolio["msa_payment"], "payment"),
        clause(prefix, "msa", "5.1", "Limitation of Liability", 5, portfolio["msa_liability"], "liability"),
        clause(prefix, "msa", "6.2", "Service Credits", 6, portfolio["msa_sla"], "service_levels"),
        clause(prefix, "msa", "9", "Governing Law", 9, portfolio["msa_law"], "governing_law"),
        clause(prefix, "sow", "1", "Scope of Work", 1, f"Vendor shall deliver {portfolio['theme']} for {client}, including design, configuration, testing, and go-live support.", "scope_of_work", references=[f"{prefix}-msa-1"]),
        clause(prefix, "sow", "3", "Milestones", 2, "Milestones and acceptance criteria are listed in Schedule A and are subject to the acceptance procedure in the MSA.", "milestones", references=[f"{prefix}-msa-1"]),
        clause(prefix, "sow", "4.1", "Payment Schedule", 4, portfolio["sow_payment"], "payment", references=[f"{prefix}-msa-3-1"]),
        clause(prefix, "sow", "6", "SLA Penalties", 6, portfolio["sow_sla"], "service_levels", references=[f"{prefix}-msa-6-2"]),
        clause(prefix, "sow", "7", "Liability Override", 7, portfolio["sow_liability"], "liability", references=[f"{prefix}-msa-5-1"], overrides=[f"{prefix}-msa-5-1"]),
        clause(prefix, "sow", "8", "Security Exhibit", 8, "Vendor shall comply with the security controls and audit obligations set out in Exhibit B.", "data_security"),
        clause(prefix, "sow", "10", "Dispute Resolution", 10, portfolio["sow_law"], "governing_law", references=[f"{prefix}-msa-9"], overrides=[f"{prefix}-msa-9"]),
    ]


def clause(prefix, doc, section, title, page, text, clause_type, references=None, overrides=None):
    return {
        "id": f"{prefix}-{doc}-{section.replace('.', '-')}",
        "document": doc,
        "section": section,
        "title": title,
        "page": page,
        "text": text,
        "type": clause_type,
        "references": references or [],
        "overrides": overrides or [],
    }


def portfolio_risks(index: int, portfolio: dict) -> list[dict]:
    prefix = f"rich-{index}"
    client = portfolio["client"]
    return [
        risk(
            f"{prefix}-risk-payment",
            f"{prefix}-sow-4-1",
            "high",
            "msa_conflict",
            f"{client} SOW payment timeline conflicts with the governing MSA 30-day payment requirement.",
            "Payment terms must not exceed 30 days under Indian-law grounded corporate playbook.",
            [
                evidence(f"{client}_Governing_MSA.pdf", 3, "3.1", portfolio["msa_payment"]),
                evidence(f"{client}_Statement_of_Work.pdf", 4, "4.1", portfolio["sow_payment"]),
            ],
            portfolio["sow_payment"],
            "Client shall pay invoices within thirty (30) days from invoice receipt, consistent with the governing MSA.",
        ),
        risk(
            f"{prefix}-risk-liability",
            f"{prefix}-sow-7",
            "critical",
            "msa_conflict",
            f"{client} SOW overrides the MSA liability cap and exposes Vendor to uncapped liability.",
            "Fallback requires liability to remain capped unless approved by legal leadership.",
            [
                evidence(f"{client}_Governing_MSA.pdf", 5, "5.1", portfolio["msa_liability"]),
                evidence(f"{client}_Statement_of_Work.pdf", 7, "7", portfolio["sow_liability"]),
            ],
            portfolio["sow_liability"],
            "Vendor liability shall remain subject to the limitation of liability in Section 5.1 of the MSA.",
        ),
        risk(
            f"{prefix}-risk-sla",
            f"{prefix}-sow-6",
            "high",
            "msa_conflict",
            f"{client} SOW service credits exceed the MSA cap and create duplicate penalty exposure.",
            "Service credits and penalties must remain within the MSA cap.",
            [
                evidence(f"{client}_Governing_MSA.pdf", 6, "6.2", portfolio["msa_sla"]),
                evidence(f"{client}_Statement_of_Work.pdf", 6, "6", portfolio["sow_sla"]),
            ],
            portfolio["sow_sla"],
            "Service credits shall be the sole remedy and shall not exceed the cap stated in Section 6.2 of the MSA.",
        ),
        risk(
            f"{prefix}-risk-exhibit",
            f"{prefix}-sow-8",
            "high",
            "missing_clause",
            "Cannot evaluate security obligations because Exhibit B was referenced but not uploaded.",
            None,
            [evidence(f"{client}_Statement_of_Work.pdf", 8, "8", "Vendor shall comply with the security controls and audit obligations set out in Exhibit B.")],
            None,
            None,
            status="not_evaluated",
            missing=["Exhibit B"],
        ),
        risk(
            f"{prefix}-risk-law",
            f"{prefix}-sow-10",
            "medium",
            "country_law_violation",
            f"{client} SOW changes governing law/forum away from the India-governed MSA.",
            "Governing law and dispute resolution should remain aligned with the governing MSA unless expressly approved.",
            [
                evidence(f"{client}_Governing_MSA.pdf", 9, "9", portfolio["msa_law"]),
                evidence(f"{client}_Statement_of_Work.pdf", 10, "10", portfolio["sow_law"]),
            ],
            portfolio["sow_law"],
            "This SOW shall be governed by Indian law and disputes shall follow the arbitration mechanism in Section 9 of the MSA.",
        ),
    ]


def risk(risk_id, clause_id, level, contradiction_type, reason, rule, evidence_items, original, suggested, status="evaluated", missing=None):
    payload = {
        "id": risk_id,
        "clause_id": clause_id,
        "risk_level": level,
        "status": status,
        "reason": reason,
        "playbook_rule_violated": rule,
        "evidence": evidence_items,
        "missing_documents": missing or [],
        "contradiction_type": contradiction_type,
        "confidence": 0.94,
    }
    if original and suggested:
        payload["redline"] = {
            "originalText": original,
            "suggestedText": suggested,
            "diffHtml": None,
        }
    return payload


def evidence(document_name, page, section, quote):
    return {
        "documentName": document_name,
        "page": page,
        "section": section,
        "quote": quote,
    }


async def create_portfolio(db: Prisma, index: int, advisor_id: str, admin_id: str, portfolio: dict) -> None:
    client = portfolio["client"]
    msa_id = f"rich-demo-{index}-msa"
    sow_id = f"rich-demo-{index}-sow"

    await db.document.create(
        data={
            "id": msa_id,
            "name": f"{client}_Governing_MSA.pdf",
            "document_type": "MSA",
            "status": "analyzed",
            "file_path": f"uploads/{client}_Governing_MSA.pdf",
            "uploaded_by_id": admin_id,
            "assigned_to_id": advisor_id,
        }
    )
    await db.document.create(
        data={
            "id": sow_id,
            "name": f"{client}_Statement_of_Work.pdf",
            "document_type": "SOW",
            "status": "analyzed",
            "file_path": f"uploads/{client}_Statement_of_Work.pdf",
            "uploaded_by_id": advisor_id,
            "assigned_to_id": advisor_id,
        }
    )

    for item in portfolio_clauses(index, portfolio):
        document_id = msa_id if item["document"] == "msa" else sow_id
        document_type = "MSA" if item["document"] == "msa" else "SOW"
        await db.clause.create(
            data={
                "id": item["id"],
                "document_id": document_id,
                "document_name": f"{client}_{document_type}.pdf",
                "document_type": document_type,
                "section_number": item["section"],
                "title": item["title"],
                "page": item["page"],
                "text": item["text"],
                "clause_type": item["type"],
                "references": Json(item["references"]),
                "overrides": Json(item["overrides"]),
                "entities": Json([]),
            }
        )

    for item in portfolio_risks(index, portfolio):
        data = {
            "id": item["id"],
            "clause_id": item["clause_id"],
            "risk_level": item["risk_level"],
            "status": item["status"],
            "reason": item["reason"],
            "evidence": Json(item["evidence"]),
            "missing_documents": Json(item["missing_documents"]),
            "contradiction_type": item["contradiction_type"],
            "confidence": item["confidence"],
        }
        if item["playbook_rule_violated"]:
            data["playbook_rule_violated"] = item["playbook_rule_violated"]
        if item.get("redline"):
            data["redline"] = Json(item["redline"])
        await db.riskfinding.create(data=data)


async def seed():
    db = Prisma()
    await db.connect()
    try:
        admin_role = await ensure_role(db, "Admin")
        advisor_role = await ensure_role(db, "Legal Reviewer")

        admin = await upsert_user(db, ADMIN_EMAIL, ADMIN_PASSWORD, admin_role.id)
        advisors = [
            await upsert_user(db, email, password, advisor_role.id)
            for email, password, _client in ADVISORS
        ]

        await remove_existing_demo(db)

        for index, (advisor, portfolio) in enumerate(zip(advisors, PORTFOLIOS), start=1):
            await create_portfolio(db, index, advisor.id, admin.id, portfolio)

        print("Rich advisor demo ready:")
        print(f"  Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        for index, (email, password, client) in enumerate(ADVISORS, start=1):
            print(f"  Legal Advisor {index}: {email} / {password} -> {client} MSA/SOW analysis")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed())
