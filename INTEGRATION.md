# Integration & Deployment Strategy (Part E)

This document outlines the final phase of wiring the cross-cutting frontend components with the backend systems, establishing the E2E testing strategy, and handling deployment.

## 1. System Integration Wiring

Once the backend APIs (Person 1) and AI pipeline (Person 2) are ready, the mock data mode in the frontend will be disabled via the `.env` flag: `VITE_USE_MOCK_DATA=false`.

### Data Flow
1. **Upload & Ingestion**: The `UploadFlow` component will `POST` the documents to the `/api/documents/parse` endpoint.
2. **Analysis Trigger**: Upon successful parse, a `POST` to `/api/analyze` triggers the AI pipeline.
3. **Data Hydration**: The `ClauseViewer`, `DependencyGraph`, and `PdfViewer` will fetch the resulting JSON representing `ClauseDTO[]` and `RiskFindingDTO[]` via `GET /api/documents/:id/analysis`.
4. **Redline Actions**: Accepting a redline in `RedlineView` will trigger a `PUT /api/clauses/:id/redline` followed by a localized re-trigger of the analysis pipeline for that specific clause.

## 2. Refusal Engine Enforcement

A critical requirement is the end-to-end enforcement of the AI's "refusal to guess" state.

- **Pipeline Contract**: The AI pipeline must explicitly output `status: "not_evaluated"` rather than attempting to synthesize answers when dependencies are missing.
- **Frontend Contract**: The `ClauseViewer` and `ReportExport` components are strictly coded to render a distinct UI state (grey, dashed borders) for `not_evaluated` risk findings.
- **Testing**: A dedicated E2E test must intentionally withhold a referenced document (e.g., Exhibit B) and assert that the `not_evaluated` UI state is rendered to the user.

## 3. End-to-End Testing

We will utilize Playwright or Cypress for E2E testing to cover the primary happy path:
1. Navigate to Upload screen.
2. Upload `mock_msa.pdf` and `mock_sow.pdf`.
3. Wait for the mock parsing and analysis pipeline to complete.
4. Assert that the Clause Viewer renders the clauses on the left.
5. Click a clause with a 'medium' risk.
6. Assert that the `RedlineView` appears and the `CrossDocumentComparison` highlights the contradiction.
7. Click "Accept" on the Redline and assert the re-analysis loading state.
8. Click "Download PDF Report" and assert the blob generation triggers successfully.

## 4. Deployment Pipeline

### Frontend (Vercel)
- The React/Vite frontend will be deployed on Vercel.
- Environment variables will point `VITE_API_BASE_URL` to the production backend URL.

### Backend (Render / Railway)
- The Python backend (FastAPI/Flask) will be containerized via Docker and deployed to Render or Railway.
- Database connections (PostgreSQL) will be managed via the platform's managed database offerings.
- Note: For a live local demo, both can be run locally using `docker-compose` to spin up the DB, backend, and frontend simultaneously.
