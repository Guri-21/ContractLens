import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prisma import Json, Prisma


ADMIN_EMAIL = "admin@contractlens.com"
ADVISOR_EMAIL = "advisor1@contractlens.com"
PREFIX = "advisor1-diverse"


PORTFOLIOS = [
    {
        "slug": "northstar",
        "client": "Northstar Logistics",
        "msa_name": "NorthstarLogistics_Governing_MSA.pdf",
        "sow_name": "NorthstarLogistics_Route_Optimization_SOW.pdf",
        "value": "INR 1.8 crore",
        "msa": [
            ("1", "Scope Framework", "Services will be ordered only through signed Statements of Work that reference this MSA.", "scope"),
            ("3.2", "Payment Terms", "Client shall pay undisputed invoices within thirty (30) days of receipt.", "payment"),
            ("5.4", "Operational Data", "Operational shipment data may be processed only for route planning, audit, and support purposes.", "data_protection"),
            ("8.1", "Service Credits", "Aggregate service credits shall not exceed five percent (5%) of the monthly fees for the affected service.", "service_levels"),
            ("11", "Governing Law", "This Agreement is governed by the laws of India and disputes shall be arbitrated in Mumbai.", "governing_law"),
        ],
        "sow": [
            ("1", "Route Optimization Services", "Vendor will configure route optimization workflows for 23 distribution hubs and integrate shipment feeds from Client systems.", "scope", ["msa-1"], []),
            ("4.1", "Invoice Milestones", "Implementation fees will be invoiced at go-live and payable within sixty (60) days after invoice date.", "payment", ["msa-3-2"], []),
            ("5", "Shipment Data Use", "Vendor may retain raw shipment and driver-location data for model improvement and benchmarking across customers.", "data_protection", ["msa-5-4"], []),
            ("7", "Uptime Credits", "Any outage above two hours triggers service credits equal to twenty percent (20%) of monthly fees.", "service_levels", ["msa-8-1"], ["msa-8-1"]),
            ("10", "Jurisdiction", "The SOW shall be governed by English law with courts in London having exclusive jurisdiction.", "governing_law", ["msa-11"], ["msa-11"]),
        ],
        "risks": [
            ("payment", "sow-4-1", "medium", "msa_conflict", "Payment timing extends beyond the MSA's 30-day invoice window.", "Indian Contract Act, 1872 - delayed payment can affect damages and breach analysis.", "Client shall pay undisputed implementation invoices within thirty (30) days of receipt."),
            ("data", "sow-5", "critical", "country_law_violation", "SOW permits cross-customer model improvement using raw driver-location data without purpose limitation.", "Digital Personal Data Protection Act, 2023 - purpose limitation and lawful processing risk.", "Vendor may retain shipment data only for this engagement and must anonymize any analytics outputs."),
            ("sla", "sow-7", "high", "msa_conflict", "SOW service credits exceed the five percent cap agreed in the MSA.", "Penalty exposure should remain within the governing MSA cap.", "Service credits shall not exceed five percent (5%) of monthly fees for the affected service."),
            ("law", "sow-10", "high", "msa_conflict", "SOW moves disputes from Indian arbitration to English courts.", "Arbitration and Conciliation Act, 1996 - inconsistent arbitration forum risk.", "This SOW shall follow the governing law and arbitration seat stated in Section 11 of the MSA."),
        ],
    },
    {
        "slug": "asterbank",
        "client": "AsterBank",
        "msa_name": "AsterBank_Master_Services_Agreement.pdf",
        "sow_name": "AsterBank_Payment_Gateway_SOW.pdf",
        "value": "INR 3.4 crore",
        "msa": [
            ("2", "Regulated Services", "Vendor shall provide technology services subject to Client's banking security and audit controls.", "scope"),
            ("4.3", "Fees", "All recurring fees are payable monthly within thirty (30) days from receipt of a valid invoice.", "payment"),
            ("6.1", "Liability Cap", "Vendor's aggregate liability is capped at one times the fees paid under the affected SOW in the preceding twelve months.", "liability"),
            ("7.2", "Audit Rights", "Client may audit Vendor once annually with ten (10) business days prior written notice.", "audit"),
            ("10", "Confidentiality", "Banking credentials, customer records, and transaction logs are Client Confidential Information.", "confidentiality"),
        ],
        "sow": [
            ("1", "Gateway Integration", "Vendor will connect Client's payment switch to card networks, UPI rails, and fraud scoring services.", "scope", ["msa-2"], []),
            ("3.3", "Transaction Reconciliation", "Daily reconciliation reports must be delivered before 9:00 AM IST on each banking day.", "reporting", ["msa-2"], []),
            ("4.2", "Quarterly Billing", "Gateway platform fees will be invoiced quarterly and payable within seventy-five (75) days.", "payment", ["msa-4-3"], []),
            ("6", "Chargeback Liability", "Notwithstanding Section 6.1, Vendor shall indemnify Client without limitation for chargebacks, fraud losses, and payment reversals.", "liability", ["msa-6-1"], ["msa-6-1"]),
            ("9", "Emergency Audit", "Client may perform immediate onsite audits after any suspected fraud incident without prior notice.", "audit", ["msa-7-2"], []),
        ],
        "risks": [
            ("payment", "sow-4-2", "high", "msa_conflict", "SOW changes monthly 30-day billing into quarterly 75-day payment.", "Indian Contract Act, 1872 - material commercial term conflict.", "Gateway platform fees shall be invoiced monthly and payable within thirty (30) days."),
            ("liability", "sow-6", "critical", "msa_conflict", "SOW creates unlimited indemnity for chargebacks and fraud losses despite the MSA liability cap.", "Indian Contract Act, 1872 - indemnity exposure and uncapped damages risk.", "Vendor indemnity shall remain subject to Section 6.1 except for finally adjudicated fraud by Vendor."),
            ("audit", "sow-9", "medium", "playbook_violation", "Immediate onsite audit right removes the MSA's notice period and may be operationally disruptive.", "Reasonable audit notice fallback required unless emergency access is tightly scoped.", "Emergency audits may begin on twenty-four (24) hours notice and only for systems linked to the suspected incident."),
        ],
    },
    {
        "slug": "medaxis",
        "client": "MedAxis Care",
        "msa_name": "MedAxisCare_Data_Platform_MSA.pdf",
        "sow_name": "MedAxisCare_Patient_Portal_SOW.pdf",
        "value": "INR 2.6 crore",
        "msa": [
            ("1.4", "Healthcare Platform", "Services include implementation and support for patient engagement software described in each SOW.", "scope"),
            ("3.1", "Acceptance", "Deliverables are deemed accepted only after written sign-off or fifteen (15) days without rejection.", "acceptance"),
            ("5", "Personal Data", "Vendor shall process personal data only on documented instructions and shall implement reasonable security safeguards.", "data_protection"),
            ("6.5", "Indirect Damages", "Neither party shall be liable for indirect, incidental, special, or consequential damages.", "liability"),
            ("12", "Dispute Resolution", "Disputes shall be resolved by arbitration seated in Bengaluru under Indian law.", "governing_law"),
        ],
        "sow": [
            ("2", "Patient Portal Build", "Vendor will build appointment booking, lab-result access, and patient messaging modules for Client hospitals.", "scope", ["msa-1-4"], []),
            ("3", "Acceptance Procedure", "Deliverables are automatically accepted two (2) business days after deployment unless Client reports a severity-one defect.", "acceptance", ["msa-3-1"], ["msa-3-1"]),
            ("5.2", "Patient Data", "Vendor may use de-identified patient records to train support automation tools and clinical triage prompts.", "data_protection", ["msa-5"], []),
            ("6", "Consequential Loss", "Vendor shall be responsible for consequential losses arising from patient notification delays.", "liability", ["msa-6-5"], ["msa-6-5"]),
            ("8", "Security Schedule", "Security controls are described in Schedule C and will be finalized after project kickoff.", "data_security", [], []),
        ],
        "risks": [
            ("acceptance", "sow-3", "medium", "msa_conflict", "SOW shortens acceptance from 15 days to 2 business days and limits rejection to severity-one defects.", "Specific Relief Act, 1963 - acceptance and enforcement ambiguity.", "Deliverables shall follow the acceptance process and cure period in Section 3.1 of the MSA."),
            ("data", "sow-5-2", "high", "country_law_violation", "SOW allows training on patient records without clearly documented instructions, consent basis, or safeguards.", "Digital Personal Data Protection Act, 2023 - health/personal data processing risk.", "Vendor may use only anonymized and aggregated records after Client's written approval and documented lawful basis."),
            ("liability", "sow-6", "critical", "msa_conflict", "SOW makes Vendor liable for consequential losses that the MSA expressly excludes.", "Indian Contract Act, 1872 - damages exclusion conflict.", "Vendor liability shall exclude consequential losses as stated in Section 6.5 of the MSA."),
            ("schedule", "sow-8", "high", "missing_clause", "Security Schedule C is referenced but not uploaded or finalized.", "Incomplete-data refusal: security obligations cannot be evaluated without Schedule C.", None, "not_evaluated", ["Schedule C"]),
        ],
    },
    {
        "slug": "urbangrid",
        "client": "UrbanGrid Energy",
        "msa_name": "UrbanGridEnergy_Framework_MSA.pdf",
        "sow_name": "UrbanGridEnergy_Metering_Analytics_SOW.pdf",
        "value": "INR 95 lakh",
        "msa": [
            ("1", "Work Orders", "Each SOW must define deliverables, assumptions, dependencies, and excluded services.", "scope"),
            ("2.5", "Change Control", "Material changes require a signed change order before work begins.", "change_control"),
            ("4", "Milestones", "Milestones must include objective acceptance criteria and dependency assumptions.", "milestones"),
            ("6", "Warranty", "Vendor warrants deliverables will materially conform to the agreed specifications for ninety (90) days.", "warranty"),
            ("9", "IP Ownership", "Pre-existing Vendor tools remain Vendor property, while Client-specific deliverables are owned by Client after full payment.", "intellectual_property"),
        ],
        "sow": [
            ("1", "Metering Analytics", "Vendor will deploy analytics for smart-meter exception detection across three city zones.", "scope", ["msa-1"], []),
            ("2", "Dependencies", "Client will provide meter data exports, field-device inventories, and network topology files by project week two.", "dependencies", ["msa-1"], []),
            ("4.1", "Milestone Table", "Phase 2 is due by 31 August, but acceptance criteria will be mutually agreed during sprint planning.", "milestones", ["msa-4"], []),
            ("6.1", "Warranty Disclaimer", "Vendor provides all analytics outputs as-is because field data quality is outside Vendor control.", "warranty", ["msa-6"], ["msa-6"]),
            ("9.2", "Reusable Models", "Client will own all algorithms, model weights, dashboards, and pre-existing connectors used in the solution.", "intellectual_property", ["msa-9"], ["msa-9"]),
        ],
        "risks": [
            ("milestone", "sow-4-1", "medium", "playbook_violation", "Milestone date exists but acceptance criteria are deferred to later sprint planning.", "Milestone terms must include objective acceptance criteria before signature.", "Phase 2 acceptance criteria shall be listed in this SOW before execution."),
            ("warranty", "sow-6-1", "high", "msa_conflict", "SOW disclaims warranty entirely despite the MSA's 90-day conformity warranty.", "Indian Contract Act, 1872 - warranty disclaimer conflicts with governing agreement.", "Analytics outputs remain subject to the ninety (90) day conformity warranty in Section 6 of the MSA."),
            ("ip", "sow-9-2", "high", "msa_conflict", "SOW transfers Vendor's pre-existing tools and model weights to Client, contrary to the MSA IP split.", "Copyright Act, 1957 and contract ownership risk for pre-existing software assets.", "Client owns Client-specific dashboards after payment; Vendor retains pre-existing tools, connectors, and model weights."),
        ],
    },
]


def clause_id(portfolio_slug: str, document_kind: str, section: str) -> str:
    return f"{PREFIX}-{portfolio_slug}-{document_kind}-{section.replace('.', '-')}"


def evidence(document_name: str, page: int, section: str, quote: str) -> dict:
    return {
        "documentName": document_name,
        "page": page,
        "section": section,
        "quote": quote,
    }


async def remove_existing_seed(db: Prisma) -> None:
    documents = await db.document.find_many(where={"id": {"startsWith": PREFIX}})
    document_ids = [document.id for document in documents]
    if not document_ids:
        return
    await db.auditlog.delete_many(where={"target_id": {"in": document_ids}})
    await db.financialsummary.delete_many(where={"document_id": {"in": document_ids}})
    await db.countrylawcompliance.delete_many(where={"document_id": {"in": document_ids}})
    await db.missingmandatoryclause.delete_many(where={"document_id": {"in": document_ids}})
    await db.approval.delete_many(where={"document_id": {"in": document_ids}})
    await db.riskfinding.delete_many(where={"clause": {"is": {"document_id": {"in": document_ids}}}})
    await db.clause.delete_many(where={"document_id": {"in": document_ids}})
    await db.document.delete_many(where={"id": {"in": document_ids}})
    print(f"Removed {len(document_ids)} previous Advisor 1 diverse documents.")


async def create_document(db: Prisma, doc_id: str, name: str, doc_type: str, uploader_id: str, advisor_id: str):
    return await db.document.create(
        data={
            "id": doc_id,
            "name": name,
            "document_type": doc_type,
            "status": "analyzed",
            "file_path": f"uploads/{name}",
            "uploaded_by_id": uploader_id,
            "assigned_to_id": advisor_id,
        }
    )


async def seed_portfolio(db: Prisma, admin, advisor, portfolio: dict) -> None:
    slug = portfolio["slug"]
    msa_id = f"{PREFIX}-{slug}-msa"
    sow_id = f"{PREFIX}-{slug}-sow"
    await create_document(db, msa_id, portfolio["msa_name"], "MSA", admin.id, advisor.id)
    await create_document(db, sow_id, portfolio["sow_name"], "SOW", advisor.id, advisor.id)

    section_map: dict[str, str] = {}
    for page, (section, title, text, clause_type) in enumerate(portfolio["msa"], start=1):
        cid = clause_id(slug, "msa", section)
        section_map[f"msa-{section.replace('.', '-')}"] = cid
        await db.clause.create(
            data={
                "id": cid,
                "document_id": msa_id,
                "document_name": portfolio["msa_name"],
                "document_type": "MSA",
                "section_number": section,
                "title": title,
                "page": page,
                "text": text,
                "clause_type": clause_type,
                "references": Json([]),
                "overrides": Json([]),
                "entities": Json([]),
            }
        )

    sow_quotes: dict[str, tuple[str, int, str, str]] = {}
    for page, (section, title, text, clause_type, references, overrides) in enumerate(portfolio["sow"], start=1):
        cid = clause_id(slug, "sow", section)
        section_map[f"sow-{section.replace('.', '-')}"] = cid
        sow_quotes[f"sow-{section.replace('.', '-')}"] = (cid, page, section, text)
        await db.clause.create(
            data={
                "id": cid,
                "document_id": sow_id,
                "document_name": portfolio["sow_name"],
                "document_type": "SOW",
                "section_number": section,
                "title": title,
                "page": page,
                "text": text,
                "clause_type": clause_type,
                "references": Json([section_map[key] for key in references if key in section_map]),
                "overrides": Json([section_map[key] for key in overrides if key in section_map]),
                "entities": Json([]),
            }
        )

    for risk in portfolio["risks"]:
        suffix, sow_key, level, contradiction_type, reason, rule, suggested, *rest = risk
        status = rest[0] if rest else "evaluated"
        missing = rest[1] if len(rest) > 1 else []
        clause_ref = sow_quotes[sow_key]
        redline = None
        if suggested:
            redline = {
                "originalText": clause_ref[3],
                "suggestedText": suggested,
                "diffHtml": None,
            }
        risk_data = {
            "id": f"{PREFIX}-{slug}-risk-{suffix}",
            "clause_id": clause_ref[0],
            "risk_level": level,
            "status": status,
            "reason": reason,
            "evidence": Json([evidence(portfolio["sow_name"], clause_ref[1], clause_ref[2], clause_ref[3])]),
            "missing_documents": Json(missing),
            "contradiction_type": contradiction_type,
            "confidence": 0.88 if level == "medium" else 0.94,
            "comparison_text": Json({"package": portfolio["client"], "reviewTheme": contradiction_type}),
        }
        if rule:
            risk_data["playbook_rule_violated"] = rule
        if redline:
            risk_data["redline"] = Json(redline)
        await db.riskfinding.create(data=risk_data)

    await db.financialsummary.create(
        data={
            "document_id": sow_id,
            "contract_value": portfolio["value"],
            "payment_terms": next((item[2] for item in portfolio["sow"] if item[3] == "payment"), None),
            "liability_cap": next((item[2] for item in portfolio["msa"] if item[3] == "liability"), None),
            "penalty": next((item[2] for item in portfolio["sow"] if item[3] == "service_levels"), None),
            "warranty_period": next((item[2] for item in portfolio["msa"] if item[3] == "warranty"), None),
        }
    )
    await db.countrylawcompliance.create(
        data={
            "document_id": sow_id,
            "law_name": "Indian statutory corpus",
            "status": "at_risk" if any(risk[3] == "country_law_violation" for risk in portfolio["risks"]) else "review_required",
            "details": "Mapped against Indian contract, arbitration, data protection, and IP law references.",
        }
    )
    await db.auditlog.create(
        data={
            "user_id": admin.id,
            "action": "ASSIGN_MSA",
            "target_type": "Document",
            "target_id": msa_id,
        }
    )
    await db.auditlog.create(
        data={
            "user_id": advisor.id,
            "action": "ANALYZE_CONTRACT_PACKAGE",
            "target_type": "Document",
            "target_id": sow_id,
        }
    )


async def main():
    db = Prisma()
    await db.connect()
    try:
        admin = await db.user.find_unique(where={"email": ADMIN_EMAIL})
        advisor = await db.user.find_unique(where={"email": ADVISOR_EMAIL})
        if not admin or not advisor:
            raise RuntimeError("Required admin/advisor1 users are missing. Start the backend once to seed access users.")

        await remove_existing_seed(db)
        for portfolio in PORTFOLIOS:
            await seed_portfolio(db, admin, advisor, portfolio)

        print(f"Advisor 1 diverse analytics seeded: {len(PORTFOLIOS)} MSA/SOW packages.")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
