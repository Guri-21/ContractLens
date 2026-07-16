<div align="center">
  <h1>🔍 ContractLens</h1>
  <p><strong>AI-Powered Contract Risk Analyzer & Review Platform</strong></p>
</div>

ContractLens is an intelligent contract review platform that automates the extraction, analysis, and validation of legal documents. By combining advanced LLM pipelines with deterministic parsing, ContractLens identifies risks, detects contradictions across related documents (e.g., MSA vs. SOW), flags playbook violations, and generates inline redlines—saving legal and compliance teams hours of manual review.

✨ Key Features
🧠 Multi-Step AI Pipeline: A comprehensive 10-step AI workflow that performs clause extraction, classification, dependency mapping, contradiction detection, and redline generation.
⚖️ Cross-Document Analysis: Automatically detects conflicting terms between related documents (e.g., conflicting payment timelines between a Master Services Agreement and a Statement of Work).
🛡️ Playbook & Compliance Validation: Validates clauses against your company's custom playbook rules and specific country laws.
👥 Role-Based Workspaces:
Legal Reviewers: Interactive clause viewer, redline acceptance, and AI chat assistant.
Admin & Compliance Officers: System-wide monitoring, aggregate risk dashboards, and playbook management.
🔎 Evidence-Backed Findings: Every AI-generated risk finding includes the exact quote, page, and section from the source text. The pipeline includes a strict "refusal engine" that prevents hallucination when referenced documents are missing.
📄 Seamless Export & Redlines: Accept AI-suggested redlines and instantly download the updated, track-changes-style .docx file, or export formal PDF audit dossiers.
🛠️ Technology Stack
Frontend

React + Vite + TypeScript
TailwindCSS + shadcn/ui
React-PDF (PDF highlighting) & Recharts (Analytics dashboards)
Docx & File-Saver (Client-side redlined document generation)
Backend & Data Platform

Python 3.10+ & FastAPI
Prisma ORM + Neon Serverless Postgres
JWT Authentication & RBAC
AI & Pipeline

LLM Providers: Claude API / Groq
Document Parsing: pdfplumber, PyMuPDF, python-docx
Architecture: Independent, strict JSON-contract agent steps instead of a monolithic black-box.
🚀 Getting Started
Prerequisites
Node.js (v18+)
Python 3.10+
A PostgreSQL database (e.g., Neon Serverless Postgres)
API Keys for your chosen LLM provider (Groq / Claude)
Backend Setup
Environment Variables:

bash

cd backend
cp .env.example .env
Edit .env to include your DATABASE_URL and LLM_PROVIDER credentials.

Install Dependencies & Database Setup:

bash

python -m venv venv
# On Mac / Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
pip install -r requirements.txt
prisma db push
prisma generate
Run the Backend Server:

bash

uvicorn main:app --reload
The API will be available at http://127.0.0.1:8000. You can view the Swagger UI at http://127.0.0.1:8000/docs.

Frontend Setup
Install Dependencies:

bash

cd frontend
npm install
Run the Development Server:

bash

npm run dev
The application will be available at http://localhost:5173.

🏗️ Architecture & Pipeline Flow
The ContractLens intelligence engine operates on a strict JSON-contract basis, where each step is independently verifiable:

Parsing & Extraction: Deterministic text and metadata extraction from PDF/DOCX.
Segmentation: Regex and LLM-assisted splitting of text into distinct clauses.
Classification: Tagging clauses (e.g., Liability, Payment, Termination).
Dependency Mapping: Identifying clauses that reference or override one another.
Contradiction Detection: Cross-referencing multiple documents to find logical conflicts.
Playbook & Law Validation: Checking against internal rules and jurisdictional law.
Risk Scoring: Assigning severity (Low, Medium, High, Critical) based on findings.
Redlining: Proposing specific word-level rewrites (originalText vs suggestedText) to mitigate risks.
👥 Demo Roles
To test the application, you can log in using the following seed accounts (password for all is password123):

admin@contractlens.com (Admin / Config)
reviewer@contractlens.com (Legal Reviewer Workspace)
compliance@contractlens.com (Analytics Dashboard)

📸Video Demo of the Project

Built by Team 6:
- Gurnoor Partap Singh Bhogal
- Himani Agarwal
- Vinayak Koli
- Vishal Kumar
- Vriti Goyal
