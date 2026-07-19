# ContractLens

> AI contract review, governed by evidence.

ContractLens is an AI-powered Contract and SOW Risk Analyzer built for the Tech Mahindra CODE Hackathon. It helps legal and business teams compare Statements of Work, NDAs, and related contract documents against an approved governing MSA, detect hidden contradictions, surface risky clauses, generate redline suggestions, and cite the exact evidence behind every finding.

The core design principle is simple: **the system should not guess**. If a contract references a missing exhibit, governing document, or source, ContractLens marks the issue as `not_evaluated` instead of inventing an answer.

---

## Table Of Contents

- [Project Status](#project-status)
- [Demo Video](#demo-video)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Capabilities](#key-capabilities)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Demo Accounts](#demo-accounts)
- [Environment Setup](#environment-setup)
- [Run Locally](#run-locally)
- [Demo Walkthrough](#demo-walkthrough)
- [AI Pipeline](#ai-pipeline)
- [Risk And Compliance Scoring](#risk-and-compliance-scoring)
- [RAG And Indian Law Grounding](#rag-and-indian-law-grounding)
- [Dependency Graph](#dependency-graph)
- [Data Model](#data-model)
- [API Surface](#api-surface)
- [Benchmarks](#benchmarks)
- [Testing And Verification](#testing-and-verification)
- [Responsible AI Design](#responsible-ai-design)
- [Genuine Project KPIs](#genuine-project-kpis)
- [Known Constraints](#known-constraints)
- [Team Workflow](#team-workflow)

---

## Project Status

The latest working prototype is available on both `main` and `production`.

`main` has been overwritten to match `production`, so both branches currently contain the same prototype:

- Backend API
- Frontend application
- Contract analysis pipeline
- Saved-analysis flow
- Seeded users
- Admin workspace
- Legal Advisor workspace
- Analytics dashboards
- Indian law grounding support
- README and handover documentation

Use either branch for demos:

```powershell
git checkout main
git pull origin main

# or
git checkout production
git pull origin production
```

---

## Demo Video

Project walkthrough:

```text
https://drive.google.com/file/d/1m1piL5Cg4cOORZp4VHtDhDsjTE665NuZ/view?usp=sharing
```

---

## The Problem

Legal teams often review MSAs, SOWs, SLAs, NDAs, exhibits, and addendums manually. This creates three major risks:

1. **Hidden contradictions**  
   A SOW may quietly override or conflict with the governing MSA. Example: the MSA says invoices are payable in 30 days, but the SOW says 90 days.

2. **Missing dependency risk**  
   Contracts often refer to exhibits, schedules, security policies, or external documents. If those are missing, a normal AI assistant may still guess. That is dangerous in legal review.

3. **Poor review traceability**  
   Human reviewers need to know exactly which clause, page, section, and quote caused a risk. A vague summary is not enough for legal decisions.

---

## The Solution

ContractLens gives teams an evidence-first contract review workflow:

1. Admin uploads and assigns the governing MSA.
2. Legal Advisor uploads a SOW or related contract.
3. The system parses both documents into clauses.
4. The pipeline classifies clauses, extracts references, detects contradictions, checks missing documents, scores risk, and generates redline suggestions.
5. The reviewer sees a structured analysis with source evidence, dependency graph, legal advice, and an audit trail.

The product is built around **source-grounded review**, not blind AI generation.

---

## Key Capabilities

| Capability | What It Does |
| --- | --- |
| MSA to SOW comparison | Compares a new SOW against an assigned governing MSA. |
| Clause extraction | Splits contract text into section-level clauses with metadata. |
| Clause classification | Labels clauses such as payment, liability, confidentiality, SLA, termination, governing law, and data protection. |
| Dependency detection | Finds references, overrides, nested conditions, and missing exhibits. |
| Contradiction detection | Flags conflicts between MSA and SOW terms. |
| Refusal engine | Refuses to evaluate incomplete references instead of guessing. |
| Redline suggestions | Generates fallback wording for risky clauses. |
| Source citation | Shows evidence quotes, page, document, and section where available. |
| Dependency graph | Visualizes clause relationships and risk links. |
| Saved analyses | Stores completed analysis results for later review. |
| Role-based access | Admin sees platform data; advisors see their assigned work. |
| Analytics | Shows risk distribution, high-risk contracts, clause analytics, and business exposure. |
| Indian law grounding | Retrieves relevant Indian statutory sections through ChromaDB RAG support. |
| Audit trail | Tracks uploads, analysis actions, reviewer decisions, and system activity. |

---

## Architecture

```text
                    +-----------------------------+
                    |        React Frontend       |
                    |  Admin + Legal Advisor UI   |
                    +--------------+--------------+
                                   |
                                   | REST API
                                   v
                    +-----------------------------+
                    |        FastAPI Backend      |
                    | Auth, documents, analytics  |
                    +--------------+--------------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
                 v                                   v
      +-----------------------+          +-----------------------+
      |   PostgreSQL + Prisma |          |  10-step AI Pipeline  |
      | users, docs, risks,   |          | parse, classify, risk |
      | clauses, audit logs   |          | redline, report       |
      +-----------------------+          +-----------+-----------+
                                                   |
                          +------------------------+------------------------+
                          |                                                 |
                          v                                                 v
              +-----------------------+                         +----------------------+
              | ChromaDB Legal RAG    |                         | LLM / Model Layer    |
              | Indian law sections   |                         | Groq/Grok compatible |
              +-----------------------+                         +----------------------+
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Graphs | React Flow |
| PDF rendering/export | React PDF, `@react-pdf/renderer` |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| ORM | Prisma Python |
| Auth | JWT, PyJWT, passlib |
| Document parsing | pdfplumber, PyMuPDF, python-docx |
| AI/LLM routing | Groq/Grok-compatible client, Claude-compatible modules |
| Model benchmarking | Hugging Face Transformers, Torch |
| Vector search | ChromaDB |
| Graph enrichment | JSON clause references, NetworkX support, Neo4j-ready dependency layer |

---

## Repository Structure

```text
ContractLens/
  backend/
    app/
      api/                    FastAPI route modules
      core/                   auth and security helpers
      intelligence/           ChromaDB, RAG, legal corpus, graph enrichment
      database.py             Prisma database connection
    pipeline/                 10-step legal analysis pipeline
    prisma/schema.prisma      PostgreSQL schema
    scripts/                  seed, benchmark, OpenAPI, law ingestion scripts
    tests/                    backend tests
    requirements.txt

  frontend/
    src/
      api/                    frontend API clients and cache helpers
      components/             shared layout and UI components
      pages/                  admin, sign-in, and route pages
      reviewer-workspace/     advisor upload, analysis, saved reviews
      shared-components/      dependency graph, PDF viewer, reports
    package.json

  shared/mock-data/           DTO-shaped sample clauses and findings
  Dataset/                    local legal datasets and law PDFs
  demo/                       demo and test documents
  docs/                       project notes and implementation docs
  openapi.json                API contract snapshot
  README.md                   this file
```

---

## Demo Accounts

The backend seeds one Admin and five Legal Advisors.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@contractlens.com` | `12345` |
| Legal Advisor 1 | `advisor1@contractlens.com` | `1` |
| Legal Advisor 2 | `advisor2@contractlens.com` | `2` |
| Legal Advisor 3 | `advisor3@contractlens.com` | `3` |
| Legal Advisor 4 | `advisor4@contractlens.com` | `4` |
| Legal Advisor 5 | `advisor5@contractlens.com` | `5` |

Role behavior:

- Admin can upload MSAs, assign advisors, manage users, view analytics, audit logs, and settings.
- Legal Advisors can only view assigned MSAs and their own saved analyses.

---

## Environment Setup

Create `backend/.env` from `backend/.env.example`.

Required:

```env
DATABASE_URL="postgresql://..."
```

LLM configuration:

```env
GROQ_API_KEY=
GROQ_API_KEY_2=
GROQ_BASE_URL=https://api.groq.com/openai/v1
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile
```

Optional provider keys:

```env
ANTHROPIC_API_KEY=
AGENT_ROUTER_API_KEY=
OPENROUTER_API_KEY=
```

Do not commit `.env`, API keys, local server logs, generated caches, or uploaded private contracts.

---

## Run Locally

### 1. Backend

```powershell
cd "C:\Users\vinay\OneDrive\Desktop\All my projects\TechM\ContractLens\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
prisma generate
prisma db push
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

```text
API:  http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs
```

If port `8000` is already in use, a backend server is probably already running.

### 2. Frontend

```powershell
cd "C:\Users\vinay\OneDrive\Desktop\All my projects\TechM\ContractLens\frontend"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

If the app appears unstyled, stop the frontend server, remove Vite cache, and restart from the `frontend` folder:

```powershell
Remove-Item -Recurse -Force .\node_modules\.vite
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## Demo Walkthrough

### Admin Flow

1. Open `http://127.0.0.1:5173/`.
2. Sign in as `admin@contractlens.com` with password `12345`.
3. Go to **MSA Repository**.
4. Upload or confirm a governing MSA.
5. Assign the MSA to a Legal Advisor.
6. Open **Legal Advisors**, **Analytics**, or **Audit Logs** to review platform activity.

### Legal Advisor Flow

1. Sign out.
2. Sign in as one advisor, for example `advisor1@contractlens.com` with password `1`.
3. Go to **Review Workspace**.
4. Select the assigned governing MSA.
5. Upload a SOW, NDA, or related contract document.
6. Run analysis.
7. Review:
   - Overview
   - Clauses
   - Risks
   - Dependency Graph
   - Redlines
   - Legal Advice
   - Audit & Export

### Suggested Demo Pair

For Advisor 1 testing, use the assigned AcmeCorp governing MSA and a matching AcmeCorp SOW test document if present in local demo files.

A rich local SOW was also generated during development:

```text
C:\Users\vinay\Desktop\AcmeCorp_SOW_Strong_MSA_Relations.pdf
```

It intentionally references MSA payment, liability, service credit, governing law, and missing-exhibit terms so the dependency graph and contradiction detection have meaningful edges.

---

## AI Pipeline

The analysis pipeline lives in `backend/pipeline/`.

| Step | File | Purpose |
| --- | --- | --- |
| 1 | `step01_parse.py` | Extract text, page metadata, and tables from PDF, DOCX, or TXT inputs. |
| 2 | `step02_segment.py` | Split contracts into legal clauses and section-level units. |
| 3 | `step03_classify.py` | Classify clause types such as payment, liability, SLA, confidentiality, termination, data protection, and governing law. |
| 4 | `step04_references.py` | Extract references, overrides, and dependency language such as "subject to", "notwithstanding", and "except as provided". |
| 5 | `step05_contradict.py` | Compare MSA and SOW terms to detect hidden contradictions. |
| 6 | `step06_refusal.py` | Deterministically marks missing exhibits or external documents as `not_evaluated`. |
| 7 | `step07_playbook.py` | Checks clauses against configured legal/compliance expectations. |
| 8 | `step08_risk.py` | Assigns risk level and score from findings. |
| 9 | `step09_redline.py` | Generates fallback wording and redline suggestions. |
| 10 | `step10_report.py` | Produces executive summary and report data. |

Main entrypoints:

```text
backend/pipeline/run_pipeline.py
backend/pipeline/streaming_orchestrator.py
```

The pipeline is intentionally modular so each step can be tested or replaced independently.

---

## Risk And Compliance Scoring

Risk scoring is based on weighted findings, not just a raw count.

Implemented frontend scoring logic is in:

```text
frontend/src/reviewer-workspace/analysisScoring.ts
```

Current weights:

| Risk Level | Base Weight |
| --- | --- |
| Low | 1 |
| Medium | 4 |
| High | 7 |
| Critical | 10 |
| Not evaluated | at least 5 |

Additional multipliers are applied for high-impact clause families:

| Clause Family | Example Keywords | Multiplier Purpose |
| --- | --- | --- |
| Liability / indemnity | liability, uncapped, indemnity, damages | Higher legal exposure |
| Governing law / dispute | governing law, jurisdiction, arbitration | Jurisdictional risk |
| Payment | payment, invoice, fees, payable | Commercial risk |
| Data / privacy / security | data, privacy, security, DPDP, confidential | Data and confidentiality risk |
| SLA / milestones | SLA, service level, service credit, penalty | Delivery and service risk |

The compliance score is derived from risk:

```text
Compliance Score = 100 - Risk Score
```

This means a contract can contain a few high-risk findings but still have a moderate overall risk score if most clauses are clean. The UI separates:

- Risk score
- Number of high-risk findings
- Not-evaluated findings
- Clause-level risks
- Portfolio-level averages

---

## RAG And Indian Law Grounding

ContractLens supports Indian law grounding through ChromaDB.

Purpose:

- Retrieve relevant statutory sections for a risky clause.
- Show which Indian laws are exposed or potentially breached.
- Give the legal advice assistant source context.
- Reduce hallucination by grounding answers in contract evidence and statute text.

Indian law ingestion code:

```text
backend/app/intelligence/legal_corpus.py
backend/scripts/ingest_indian_laws.py
```

Run ingestion:

```powershell
cd backend
python scripts/ingest_indian_laws.py
```

Each stored law section is represented with metadata:

```text
act_name
section_number
section_title
source_pdf
page_number
jurisdiction = India
law_type = statute
```

ChromaDB collection:

```text
indian_statutes
```

Important: legal advice should cite retrieved source material. If the answer is not supported by uploaded documents or statute retrieval, the assistant should refuse or ask for the missing source.

---

## Dependency Graph

The dependency graph visualizes relationships extracted from contract clauses.

Graph nodes may represent:

- MSA clauses
- SOW clauses
- Risk findings
- Missing exhibits
- Legal/statutory references

Graph edges may represent:

- `references`
- `overrides`
- `conflicts_with`
- `depends_on`
- `missing_document`

Relationship extraction is hybrid:

1. **Deterministic rules** detect explicit text patterns like `subject to Section X`, `notwithstanding Section X`, and `Exhibit B`.
2. **Semantic comparison** helps identify related clauses between the MSA and SOW.
3. **LLM reasoning** can be used for contradiction meaning and redline suggestions.

Frontend graph components:

```text
frontend/src/shared-components/DependencyGraph.tsx
frontend/src/shared-components/dependency-graph/
```

---

## Data Model

Core schema file:

```text
backend/prisma/schema.prisma
```

Main tables:

| Table | Purpose |
| --- | --- |
| `User` | Admin and Legal Advisor accounts |
| `Role` | Role definitions |
| `Document` | Uploaded MSAs, SOWs, NDAs, and related documents |
| `Clause` | Extracted clause text and metadata |
| `RiskFinding` | Risk level, status, reason, evidence, missing docs, redlines |
| `AuditLog` | System and reviewer activity |
| `ClauseVersion` | Edited clause history |
| `MissingMandatoryClause` | Required-but-missing clause tracking |
| `CountryLawCompliance` | Country/statutory compliance results |
| `FinancialSummary` | Payment, penalty, liability, warranty summary |
| `Approval` | Review decision state |
| `Notification` | User notifications |

Important analysis fields:

```text
Clause:
  id
  document_id
  document_name
  document_type
  section_number
  title
  page
  text
  clause_type
  references
  overrides
  table_data
  embedding_id

RiskFinding:
  id
  clause_id
  risk_level
  status
  reason
  evidence
  missing_documents
  redline
  contradiction_type
  confidence
```

---

## API Surface

Important backend routes:

| Area | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/token` |
| Seeded users | `GET /api/auth/available-users` |
| Legacy demo users | `GET /api/auth/demo-users` |
| Documents | `GET /api/documents/` |
| User document upload | `POST /api/documents/upload` |
| Admin MSA upload | `POST /api/documents/admin-upload` |
| MSA assignment | `POST /api/documents/{document_id}/assign` |
| Delete document | `DELETE /api/documents/{document_id}` |
| Update document status | `PUT /api/documents/{document_id}/status` |
| Analysis | `POST /api/analyze` |
| Saved analyses | `GET /api/analyze` |
| Run analysis | `POST /api/analyze/run` |
| Admin analytics | `GET /api/admin/analytics` |
| Advisor analytics | `GET /api/admin/advisors/{advisor_id}/analytics` |
| Audit logs | `GET /api/audit/` |
| Playbook rules | `GET /api/playbook/`, `POST /api/playbook/` |
| Country rules | `GET /api/country-rules/`, `POST /api/country-rules/` |
| Users | `GET /api/users/`, `POST /api/users/`, `DELETE /api/users/{user_id}` |
| Settings | `GET /api/settings/`, `PUT /api/settings/` |

OpenAPI snapshot:

```text
openapi.json
```

Live API docs:

```text
http://127.0.0.1:8000/docs
```

---

## Benchmarks

Benchmark scripts are under:

```text
backend/scripts/benchmark/
```

Useful commands:

```powershell
cd backend
python scripts/benchmark/run_groq_benchmark.py
python scripts/benchmark/run_refusal_benchmark.py
python scripts/benchmark/run_classifier_benchmark.py
```

Datasets used or referenced for evaluation:

- CUAD
- LEDGAR
- ContractNLI-style data

What was benchmarked:

- Clause type classification
- Risk classification
- Missing-document refusal behavior
- Model speed/cost practicality for hackathon use

Accuracy is measured by comparing model output against expected labels:

```text
accuracy = correct_predictions / total_examples
```

Do not claim production-grade legal accuracy unless a formal evaluation set and review protocol are completed.

---

## Testing And Verification

Backend compile check:

```powershell
cd backend
python -m compileall main.py app pipeline
```

Frontend build:

```powershell
cd frontend
npm run build
```

Frontend tests:

```powershell
cd frontend
npm test -- --run
```

Useful backend tests:

```powershell
cd backend
pytest
```

Before final demos, verify:

- Admin login works.
- All five Legal Advisors are visible.
- Admin can upload and assign an MSA.
- Advisor can only see assigned MSA and own saved analyses.
- SOW upload runs analysis.
- Risks show evidence.
- Missing exhibit produces `not_evaluated`.
- Dependency graph uses current analysis data.
- Saved analysis remains after page refresh.
- Admin analytics reflect persisted analysis data.

---

## Responsible AI Design

ContractLens includes several safety-oriented design choices:

1. **Evidence-first answers**  
   Findings must cite source evidence instead of only producing summaries.

2. **Missing-data refusal**  
   Missing exhibits or governing documents produce `not_evaluated` findings.

3. **Human review loop**  
   Reviewers can accept, modify, or reject AI suggestions.

4. **Audit trail**  
   Uploads, decisions, and analysis actions are tracked for review.

5. **Grounded legal advice**  
   Legal advice uses analyzed clauses and retrieved legal sources instead of unsupported free-form guesses.

6. **Role-based visibility**  
   Advisors see only their assigned work. Admins see platform-wide data.

---

## Genuine Project KPIs

These are implementation metrics that are genuinely present in the project.

| Metric | Value |
| --- | --- |
| Legal AI pipeline modules | 10 steps |
| Seeded demo users | 6 users |
| Admin accounts | 1 |
| Legal Advisor accounts | 5 |
| Main analysis tabs | 7 |
| Core persisted models | 12 Prisma models |
| Benchmark dataset families | 3 |
| Primary database | PostgreSQL |
| Vector database | ChromaDB |
| Main backend framework | FastAPI |
| Main frontend framework | React + Vite |
| Responsible AI refusal status | `not_evaluated` |

Resume-safe phrasing:

```text
Built a 10-step legal AI pipeline with role-scoped saved analyses, PostgreSQL persistence, ChromaDB-based legal retrieval, human review actions, source citation, and deterministic refusal handling for missing documents.
```

Avoid unsupported claims such as:

- "Reduced review time by 90%"
- "Achieved 99% legal accuracy"
- "Processed millions of contracts"
- "Enterprise certified"

Those require formal measurement and production validation.

---

## Known Constraints

This is a hackathon prototype, not a production legal system.

Known constraints:

- Legal outputs require human review.
- Accuracy depends on uploaded document quality and extracted text quality.
- Scanned PDFs may need OCR improvements.
- Indian law grounding requires the law PDFs to be ingested into ChromaDB.
- Model API behavior depends on provider limits and API keys.
- Some analytics are only as complete as the saved analysis data in PostgreSQL.
- Benchmark scripts are useful for model comparison but not a substitute for legal expert evaluation.

---

## Team Workflow

Current branch guidance:

- `main` and `production` currently contain the same complete working prototype.
- Use `main` for final submission visibility.
- Use `production` as the integration/demo branch if the team wants a separate staging branch.
- Merge feature branches into `production` first, test, then move into `main`.

Keep out of commits:

<<<<<<< HEAD
ContractLens should never say "probably" when legal source data is missing. Every risk must show evidence, and missing exhibits or governing documents must produce a refusal state instead of an invented answer.

## Contributors:

- Gurnoor Partap Singh Bhogal
- Himani Agarwal
- Vinayak Koli
- Vishal Kumar
- Vriti Goyal
=======
```text
.env
.codegraph/
backend/*server*.log
frontend/*server*.log
node_modules/
__pycache__/
generated caches
private uploaded contracts
large local model weights
```

When frontend and backend disagree, treat persisted backend analysis data as the source of truth and fix UI-derived calculations.

---

## Final Demo Principle

ContractLens should never pretend to know what it has not seen.

Every serious finding should answer:

```text
What is risky?
Where is the exact source text?
Which MSA/SOW clause caused it?
Is any required document missing?
What fallback wording is suggested?
What did the human reviewer decide?
```

That is the core value of the project: **AI contract review that is traceable, reviewable, and governed by evidence.**
>>>>>>> 983d6ff (fix: cross-document graph arrows, MSA pairing, and tab UI improvements)
