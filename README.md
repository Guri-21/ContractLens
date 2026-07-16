# ContractLens

AI contract review, governed by evidence.

ContractLens is an enterprise Contract and SOW Risk Analyzer built for the Tech Mahindra CODE Hackathon. It compares Statements of Work and other legal documents against an admin-published governing MSA, detects legal and commercial risk, preserves source evidence, produces redline suggestions, and refuses to evaluate missing referenced documents instead of guessing.

## Branch Status

The latest working prototype is available on both `main` and `production`.

`main` has been overwritten to match `production`, so both branches currently contain the same full ContractLens prototype, including backend, frontend, pipeline, saved-analysis flow, seeded users, admin workspace, legal advisor workspace, analytics, and README.

Use either branch for demos:

```powershell
git checkout main
git pull origin main

# or
git checkout production
git pull origin production
```


## Demo Video

Project walkthrough video:

```text
https://drive.google.com/file/d/1m1piL5Cg4cOORZp4VHtDhDsjTE665NuZ/view?usp=sharing
```

## What Works

- Seeded login with one Admin and five Legal Advisors stored in the connected database.
- Admin portal for MSA upload, advisor assignment, advisor monitoring, analytics, audit logs, and settings.
- Legal Advisor workspace for selecting assigned MSAs, uploading SOW or other contract documents, running analysis, and reviewing saved analyses.
- Saved analyses persist in PostgreSQL and are scoped by advisor, so one advisor cannot see another advisor's work.
- Contract pipeline parses documents, segments clauses, classifies clauses, extracts references and overrides, detects contradictions, handles missing-document refusal, assigns risk, generates redlines, and produces summaries.
- Indian-law grounding via extracted statutory references and ChromaDB ingestion support.
- Dependency graph renders extracted clause relationships, references, overrides, conflicts, and risk status.
- Legal advice panel answers from the current analysis with source-grounded references.
- Admin analytics are calculated from saved analysis data, not static frontend placeholders.

## Tech Stack

- Frontend: React, Vite, TypeScript, TailwindCSS, React Flow, Recharts, React PDF.
- Backend: FastAPI, Prisma Python, PostgreSQL, PyJWT.
- AI pipeline: Groq/Grok-compatible LLM routing, Claude-compatible modules, Hugging Face classifier benchmarks, deterministic fallback logic.
- Retrieval: ChromaDB for embedded legal/statutory chunks.
- Graph logic: JSON clause references plus frontend graph rendering.

## Repository Structure

```text
ContractLens/
  backend/
    app/
      api/                 FastAPI route modules
      core/                auth/security helpers
      database.py          Prisma connection
    pipeline/              10-step legal analysis pipeline
    prisma/schema.prisma   PostgreSQL schema
    scripts/               seed, benchmark, OpenAPI, law ingestion scripts
    requirements.txt
  frontend/
    src/                   React app, admin portal, advisor workspace
    package.json
  shared/mock-data/        DTO-shaped mock clauses and findings
  Dataset/                 Local legal datasets and law PDFs
  docs/                    Project notes and implementation docs
  openapi.json             API contract snapshot
```

## Demo Accounts

The backend ensures these accounts exist on startup.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@contractlens.com` | `12345` |
| Legal Advisor 1 | `advisor1@contractlens.com` | `1` |
| Legal Advisor 2 | `advisor2@contractlens.com` | `2` |
| Legal Advisor 3 | `advisor3@contractlens.com` | `3` |
| Legal Advisor 4 | `advisor4@contractlens.com` | `4` |
| Legal Advisor 5 | `advisor5@contractlens.com` | `5` |

## Environment

Create `backend/.env` from `backend/.env.example` and fill real values:

```env
DATABASE_URL="postgresql://..."

GROQ_API_KEY=
GROQ_API_KEY_2=
GROQ_BASE_URL=https://api.groq.com/openai/v1
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile

ANTHROPIC_API_KEY=
AGENT_ROUTER_API_KEY=
OPENROUTER_API_KEY=
```

Do not commit `.env` or API keys.

## Run Locally

Backend:

```powershell
cd "C:\Users\vinay\OneDrive\Desktop\All my projects\TechM\ContractLens\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
prisma generate
prisma db push
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
cd "C:\Users\vinay\OneDrive\Desktop\All my projects\TechM\ContractLens\frontend"
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

If Vite chooses another port, `http://localhost:5174` is also allowed by backend CORS.

## Demo Flow

1. Sign in as Admin.
2. Upload or confirm a governing MSA in the MSA repository.
3. Assign that MSA to a Legal Advisor.
4. Sign out and sign in as that advisor.
5. Select the assigned MSA.
6. Upload a SOW, NDA, or other contract document.
7. Run analysis.
8. Review Overview, Clauses, Risks, Dependency Graph, Redlines, Legal Advice, and Audit Export.

For Advisor 1 testing, use the assigned `AcmeCorp_Governing_MSA.pdf` and a matching AcmeCorp SOW test document if present in the local demo files.

## Pipeline

The pipeline lives in `backend/pipeline/`.

| Step | File | Purpose |
| --- | --- | --- |
| 1 | `step01_parse.py` | Extract text, pages, and tables from PDF/DOCX/TXT inputs. |
| 2 | `step02_segment.py` | Split contracts into legal clauses and section-level units. |
| 3 | `step03_classify.py` | Classify clause types such as payment, liability, SLA, confidentiality, termination, and governing law. |
| 4 | `step04_references.py` | Extract references, overrides, and dependency phrases like "notwithstanding" or "subject to". |
| 5 | `step05_contradict.py` | Detect MSA vs SOW contradictions and inconsistent terms. |
| 6 | `step06_refusal.py` | Deterministically marks missing exhibits/documents as `not_evaluated`. |
| 7 | `step07_playbook.py` | Checks clauses against active legal/compliance expectations. |
| 8 | `step08_risk.py` | Computes risk level and risk score from findings. |
| 9 | `step09_redline.py` | Generates suggested fallback language and redline text. |
| 10 | `step10_report.py` | Builds the executive summary and report data. |

The main entrypoint is:

```python
backend/pipeline/run_pipeline.py
```

## Important API Surfaces

| Area | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/token` |
| Seeded users | `GET /api/auth/available-users` |
| Documents | `GET /api/documents/`, `POST /api/documents/upload`, `POST /api/documents/admin-upload` |
| MSA assignment | `POST /api/documents/{document_id}/assign` |
| Analysis | `POST /api/analyze`, `GET /api/analyze`, `POST /api/analyze/run` |
| Admin analytics | `GET /api/admin/analytics`, `GET /api/admin/advisors/{advisor_id}/analytics` |
| Audit | `GET /api/audit/` |
| Settings | `GET /api/settings/`, `PUT /api/settings/` |

## Data Model

Core tables are defined in `backend/prisma/schema.prisma`:

- `User`, `Role`
- `Document`
- `Clause`
- `RiskFinding`
- `AuditLog`
- `ClauseVersion`
- `CountryLawCompliance`
- `FinancialSummary`
- `Approval`
- `Notification`

The most important analysis shapes are:

- Clause: original text, section, page, type, references, overrides, table data, embedding id.
- Risk finding: risk level, status, reason, evidence quotes, missing documents, redline, contradiction metadata, confidence.

## Indian Law Grounding

Indian law PDFs live under `Dataset/`. The ingestion script is:

```powershell
cd backend
python scripts/ingest_indian_laws.py
```

The intended ChromaDB metadata shape is:

```text
act_name
section_number
section_title
source_pdf
page_number
jurisdiction = India
law_type = statute
```

This lets the product show which Indian laws are exposed or breached and cite the source rather than hallucinating legal advice.

## Benchmarks

Benchmark scripts are under `backend/scripts/benchmark/`.

Useful commands:

```powershell
cd backend
python scripts/benchmark/run_groq_benchmark.py
python scripts/benchmark/run_refusal_benchmark.py
python scripts/benchmark/run_classifier_benchmark.py
```

Benchmark outputs are written beside the scripts as JSON/log files.

## Verification

Before pushing production changes, run:

```powershell
cd backend
python -m compileall main.py app pipeline

cd ..\frontend
npm run build
```

Optional frontend tests:

```powershell
npm test -- --run
```

## Team Workflow

- `main` and `production` currently contain the same complete working prototype.
- Use `main` for final submission visibility.
- Use `production` as the integration/demo branch if the team wants a separate staging branch again.
- Feature branches should be merged carefully into `production` first, tested, and then copied or merged into `main`.
- Keep `.env`, local server logs, `.codegraph/`, generated caches, and local uploads out of commits.
- If frontend and backend behavior disagree, treat backend persisted analysis data as the source of truth and fix the derived UI calculation.

## Demo Principle

ContractLens should never say "probably" when legal source data is missing. Every risk must show evidence, and missing exhibits or governing documents must produce a refusal state instead of an invented answer.

## Contributors:

- Gurnoor Partap Singh Bhogal
- Himani Agarwal
- Vinayak Koli
- Vishal Kumar
- Vriti Goyal
