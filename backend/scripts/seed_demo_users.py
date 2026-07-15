import asyncio
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prisma import Json, Prisma

from app.core.security import get_password_hash


ADMIN_EMAIL = "admin@contractlens.com"
ADMIN_PASSWORD = "12345"
ADVISORS = [
    ("advisor1@contractlens.com", "1"),
    ("advisor2@contractlens.com", "2"),
    ("advisor3@contractlens.com", "3"),
    ("advisor4@contractlens.com", "4"),
    ("advisor5@contractlens.com", "5"),
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
    return await db.user.create(
        data={
            "email": email,
            **data,
        }
    )


async def assign_existing_documents(db: Prisma, admin_id: str, advisor_ids: list[str]) -> None:
    documents = await db.document.find_many(
        include={"clauses": {"include": {"risks": True}}},
        order={"name": "asc"},
    )
    analyzed = [
        document
        for document in documents
        if document.clauses and sum(len(clause.risks or []) for clause in document.clauses) > 0
    ]
    if not analyzed:
        print("No analyzed documents with risks found. Creating demo analyzed portfolios.")
        await create_demo_portfolios(db, admin_id, advisor_ids)
        return

    pending = [document for document in documents if document not in analyzed]
    ordered_documents = [*analyzed, *pending]

    for index, document in enumerate(ordered_documents):
        advisor_id = advisor_ids[index % len(advisor_ids)]
        data = {"assigned_to_id": advisor_id}
        if document.document_type == "MSA":
            data["uploaded_by_id"] = admin_id
        else:
            data["uploaded_by_id"] = advisor_id

        await db.document.update(where={"id": document.id}, data=data)

    print(f"Assigned {len(ordered_documents)} existing documents across {len(advisor_ids)} legal advisors.")


async def create_demo_portfolios(db: Prisma, admin_id: str, advisor_ids: list[str]) -> None:
    await remove_existing_demo_portfolios(db)

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    clauses_path = os.path.join(base_dir, "shared", "mock-data", "clauses.json")
    risks_path = os.path.join(base_dir, "shared", "mock-data", "risks.json")

    with open(clauses_path, "r", encoding="utf-8") as file:
        base_clauses = json.load(file)
    with open(risks_path, "r", encoding="utf-8") as file:
        base_risks = json.load(file)

    for index, advisor_id in enumerate(advisor_ids, start=1):
        msa_id = f"demo-advisor-{index}-msa"
        sow_id = f"demo-advisor-{index}-sow"
        client_name = f"Demo Advisor {index}"

        await db.document.create(
            data={
                "id": msa_id,
                "name": f"{client_name}_Governing_MSA.pdf",
                "document_type": "MSA",
                "status": "analyzed",
                "file_path": f"uploads/{client_name}_Governing_MSA.pdf",
                "uploaded_by_id": admin_id,
                "assigned_to_id": advisor_id,
            }
        )
        await db.document.create(
            data={
                "id": sow_id,
                "name": f"{client_name}_Statement_of_Work.pdf",
                "document_type": "SOW",
                "status": "analyzed",
                "file_path": f"uploads/{client_name}_Statement_of_Work.pdf",
                "uploaded_by_id": advisor_id,
                "assigned_to_id": advisor_id,
            }
        )

        clause_id_map = {}
        for clause in base_clauses:
            source_document_type = clause["documentType"]
            document_id = msa_id if source_document_type == "MSA" else sow_id
            new_clause_id = f"advisor-{index}-{clause['id']}"
            clause_id_map[clause["id"]] = new_clause_id
            clause_payload = {
                "id": new_clause_id,
                "document_id": document_id,
                "document_name": f"{client_name}_{source_document_type}.pdf",
                "document_type": source_document_type,
                "section_number": clause.get("sectionNumber"),
                "title": clause.get("title"),
                "page": clause.get("page"),
                "text": clause["text"],
                "clause_type": clause.get("clauseType"),
                "references": Json([
                    clause_id_map.get(reference, reference)
                    for reference in clause.get("references", [])
                ]),
                "overrides": Json([
                    clause_id_map.get(override, override)
                    for override in clause.get("overrides", [])
                ]),
                "entities": Json([]),
            }
            if clause.get("tableData") is not None:
                clause_payload["table_data"] = Json(clause.get("tableData"))
            await db.clause.create(data=clause_payload)

        for risk_position, risk in enumerate(base_risks, start=1):
            contradiction_type = None
            if risk_position == 1:
                contradiction_type = "msa_conflict"
            elif risk.get("status") == "not_evaluated":
                contradiction_type = "missing_clause"
            elif risk.get("playbookRuleViolated"):
                contradiction_type = "playbook_violation"

            risk_payload = {
                "id": f"advisor-{index}-{risk['id']}",
                "clause_id": clause_id_map[risk["clauseId"]],
                "risk_level": risk["riskLevel"],
                "status": risk["status"],
                "reason": risk["reason"],
                "evidence": Json(risk.get("evidence", [])),
                "missing_documents": Json(risk.get("missingDocuments", [])),
                "confidence": 0.92,
            }
            if risk.get("playbookRuleViolated") is not None:
                risk_payload["playbook_rule_violated"] = risk.get("playbookRuleViolated")
            if risk.get("redline") is not None:
                risk_payload["redline"] = Json(risk.get("redline"))
            if contradiction_type is not None:
                risk_payload["contradiction_type"] = contradiction_type
            await db.riskfinding.create(data=risk_payload)

    print(f"Created {len(advisor_ids)} demo analyzed portfolios from shared mock-data.")


async def remove_existing_demo_portfolios(db: Prisma) -> None:
    documents = await db.document.find_many()
    demo_document_ids = [
        document.id
        for document in documents
        if document.id.startswith("demo-advisor-")
    ]
    if not demo_document_ids:
        return

    await db.riskfinding.delete_many(
        where={"clause": {"is": {"document_id": {"in": demo_document_ids}}}}
    )
    await db.clause.delete_many(where={"document_id": {"in": demo_document_ids}})
    await db.document.delete_many(where={"id": {"in": demo_document_ids}})
    print(f"Removed {len(demo_document_ids)} existing partial demo documents.")


async def seed():
    db = Prisma()
    await db.connect()
    try:
        admin_role = await ensure_role(db, "Admin")
        advisor_role = await ensure_role(db, "Legal Reviewer")

        admin = await upsert_user(db, ADMIN_EMAIL, ADMIN_PASSWORD, admin_role.id)
        advisors = [
            await upsert_user(db, email, password, advisor_role.id)
            for email, password in ADVISORS
        ]

        await create_demo_portfolios(db, admin.id, [advisor.id for advisor in advisors])

        print("Demo accounts ready:")
        print(f"  Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        for index, (email, password) in enumerate(ADVISORS, start=1):
            print(f"  Legal Advisor {index}: {email} / {password}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed())
