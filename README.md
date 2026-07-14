# ContractLens

ContractLens is an AI-powered contract risk analyzer.

## How to run

### Backend
1. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to include your Neon Postgres `DATABASE_URL`.*

2. Install dependencies and set up the database:
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows (Command Prompt / PowerShell):
   venv\Scripts\activate
   
   # On Mac / Linux / WSL:
   source venv/bin/activate
   
   pip install -r requirements.txt
   prisma db push
   prisma generate
   ```

3. Run the application:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Assumptions for Backend Data Platform
- **Database (Neon & Prisma)**: We use **Prisma ORM Python** connected to a **Neon Serverless Postgres** database. Prisma Client handles all database access asynchronously. 
- **Authentication**: Implementing simple JWT token-based auth (`/api/auth/token`). Replaced `passlib` with raw `bcrypt` due to a known bug in passlib when verifying hashes with `bcrypt >= 4.0.0`.
- **RBAC**: Three roles created (`Admin`, `Legal Reviewer`, `Compliance Officer`). Seed users created for each role (`admin@contractlens.com` etc).
- **Orchestration**: The `POST /api/documents/{id}/analyze` endpoint is a simple seam that fetches and returns dummy clauses and risks from the database.
- **Deliverables**: The OpenAPI spec is published to the repo root (`openapi.json`). A seed script is located at `backend/scripts/seed_demo.py`.
