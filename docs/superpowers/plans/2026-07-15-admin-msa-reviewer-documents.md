# Admin MSA and Reviewer Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin the exclusive MSA uploader while giving Legal Advisors separate assigned-MSA, SOW, and supporting-document areas that preserve MSA/SOW contradiction detection.

**Architecture:** A pure backend document-workflow module owns allowed types and package validation. API routes enforce role/type/access rules before invoking the existing pipeline. The pipeline identifies the primary MSA/SOW pair by type, while the React upload screen builds the package through three distinct sections and sends an explicit role-aware payload.

**Tech Stack:** FastAPI, Pydantic, Prisma Client Python, pytest, React 18, TypeScript, Vite 7, Tailwind CSS, Vitest.

## Global Constraints

- Admin upload always stores `MSA`.
- Legal Reviewer upload cannot create `MSA`, `PLAYBOOK`, or `LAW`.
- Exactly one assigned MSA and one uploaded SOW are required for analysis.
- Supporting types are `NDA`, `SLA`, `EXHIBIT`, `AMENDMENT`, `ORDER_FORM`, `DPA`, and `OTHER`.
- Supporting documents participate in parsing, refusal, playbook, evidence, and redline context.
- Only the selected MSA and SOW are passed to contradiction detection.
- Missing referenced documents remain `not_evaluated`.

---

### Task 1: Backend Document Workflow Contract

**Files:**
- Create: `backend/app/document_workflow.py`
- Create: `backend/tests/test_document_workflow.py`
- Modify: `backend/app/schemas.py`

**Interfaces:**
- Produces: `DocumentType`, `REVIEWER_UPLOAD_TYPES`, `SUPPORTING_DOCUMENT_TYPES`, `validate_reviewer_upload_type(document_type)`, and `validate_analysis_package(documents, msa_id, sow_id, supporting_ids)`.
- `validate_analysis_package` returns documents ordered as MSA, SOW, then supporting documents.

- [ ] **Step 1: Write failing workflow tests**

Cover accepted supporting types, rejected reviewer MSA upload, required MSA/SOW types, duplicate IDs, and primary-first ordering with lightweight objects containing `id` and `document_type`.

- [ ] **Step 2: Verify the tests fail**

Run: `python -m pytest tests/test_document_workflow.py -q`

Expected: collection failure because `app.document_workflow` does not exist.

- [ ] **Step 3: Implement the pure workflow module**

Use exact constants:

```python
DOCUMENT_TYPES = {
    "MSA", "SOW", "SLA", "NDA", "EXHIBIT", "AMENDMENT",
    "ORDER_FORM", "DPA", "OTHER", "PLAYBOOK", "LAW",
}
REVIEWER_UPLOAD_TYPES = DOCUMENT_TYPES - {"MSA", "PLAYBOOK", "LAW"}
SUPPORTING_DOCUMENT_TYPES = REVIEWER_UPLOAD_TYPES - {"SOW"}
```

Raise `ValueError` with a user-facing reason for every invalid package.

- [ ] **Step 4: Extend backend DTO document types and run tests**

Run: `python -m pytest tests/test_document_workflow.py -q`

Expected: all workflow tests pass.

- [ ] **Step 5: Commit the backend contract**

```powershell
git add backend/app/document_workflow.py backend/app/schemas.py backend/tests/test_document_workflow.py
git commit -m "feat: define role-aware document workflow"
```

### Task 2: Upload and Analysis API Enforcement

**Files:**
- Modify: `backend/app/api/documents.py`
- Modify: `backend/app/api/analyze.py`
- Create: `backend/tests/test_document_api_contract.py`

**Interfaces:**
- `POST /api/documents/upload`: multipart `file` plus `document_type`.
- `POST /api/documents/admin-upload`: always persists `MSA`.
- `POST /api/analyze`: `msaDocumentId`, `sowDocumentId`, `supportingDocumentIds`, `playbookId`, `countryCode`.

- [ ] **Step 1: Write failing API-contract tests**

Test pure route helpers for Admin MSA enforcement, reviewer type rejection, and request parsing. Test package validation with accessible document fixtures rather than a live database.

- [ ] **Step 2: Verify the tests fail**

Run: `python -m pytest tests/test_document_api_contract.py -q`

Expected: failures because explicit type enforcement and the role-aware request fields are absent.

- [ ] **Step 3: Enforce explicit upload types**

Add `document_type: str = Form(...)` to reviewer upload, normalize with `.upper()`, call `validate_reviewer_upload_type`, and return HTTP 422 for invalid values. Hardcode `document_type: "MSA"` in Admin upload. Validate assignments target a Legal Reviewer and accept `null` for unassignment.

- [ ] **Step 4: Replace the analysis request contract**

Load the unique requested IDs through `_document_access_filter`, map by ID, call `validate_analysis_package`, and convert `ValueError` to HTTP 422. Pass the returned ordered documents to the pipeline and persist all clauses/findings.

- [ ] **Step 5: Run backend tests**

Run: `python -m pytest -q`

Expected: all existing and new tests pass.

- [ ] **Step 6: Commit API enforcement**

```powershell
git add backend/app/api/documents.py backend/app/api/analyze.py backend/tests/test_document_api_contract.py
git commit -m "feat: enforce MSA SOW document packages"
```

### Task 3: Preserve Primary Contradiction Detection

**Files:**
- Modify: `backend/pipeline/run_pipeline.py`
- Create: `backend/tests/test_pipeline_document_package.py`

**Interfaces:**
- Produces: `_select_primary_pair(documents)` returning the MSA and SOW document dictionaries or `None`.
- `run_analysis_pipeline` continues parsing every input document.

- [ ] **Step 1: Write a failing primary-pair test**

Provide MSA, SOW, and EXHIBIT documents in shuffled order and assert `_select_primary_pair` returns MSA then SOW. Patch pipeline steps and assert contradiction detection receives only primary clauses while playbook validation receives all eligible clauses.

- [ ] **Step 2: Verify the test fails**

Run: `python -m pytest tests/test_pipeline_document_package.py -q`

Expected: failure because contradiction detection still depends on `len(documents) == 2`.

- [ ] **Step 3: Implement type-based primary selection**

Replace the length check with selection by `document["type"]`. Keep parsing, refusal, playbook validation, risk scoring, redlines, and report generation over all documents.

- [ ] **Step 4: Run pipeline and full backend tests**

Run: `python -m pytest -q`

Expected: all tests pass, including the existing two-document compatibility tests.

- [ ] **Step 5: Commit pipeline behavior**

```powershell
git add backend/pipeline/run_pipeline.py backend/tests/test_pipeline_document_package.py
git commit -m "feat: preserve contradictions with supporting documents"
```

### Task 4: Reviewer Package Builder UI

**Files:**
- Create: `frontend/src/reviewer-workspace/documentPackage.ts`
- Create: `frontend/src/reviewer-workspace/documentPackage.test.ts`
- Modify: `frontend/src/reviewer-workspace/components/UploadFlow.tsx`
- Modify: `frontend/src/api/documents.ts`
- Modify: `frontend/src/api/analyze.ts`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/reviewer-workspace/types.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

**Interfaces:**
- `uploadDocument(file, documentType)` uploads an explicit type.
- `fetchBackendAnalyze({ msaDocumentId, sowDocumentId, supportingDocumentIds, playbookId, countryCode })` submits the package.
- Supporting rows use `{ id, file, documentType }` and preserve user selection by generated local ID.

- [ ] **Step 1: Add Vitest and write failing package-builder tests**

Test supported-type options, duplicate filename rejection, and analysis readiness requiring MSA plus SOW.

- [ ] **Step 2: Verify the frontend tests fail**

Run: `npm test -- --run`

Expected: failure because `documentPackage.ts` is absent.

- [ ] **Step 3: Implement package helpers and shared types**

Export the exact supporting options and pure readiness/deduplication helpers. Extend all document-type unions with `AMENDMENT`, `ORDER_FORM`, `DPA`, and `OTHER`.

- [ ] **Step 4: Implement the three-section UploadFlow**

Build:

- a read-only **Governing MSA** selector populated from `fetchBackendDocuments()`;
- one required **Statement of Work** file control;
- an optional **Supporting Documents** multi-file control with per-file type menu and removal;
- an **Analyze Contract Package** command disabled without MSA/SOW or during processing;
- inline empty, upload, validation, and failure states.

Use lucide icons and Himani's burgundy/ivory theme tokens. Do not reintroduce an MSA file picker in the reviewer workspace.

- [ ] **Step 5: Run frontend tests and production build**

Run: `npm test -- --run`

Run: `npm run build`

Expected: tests and TypeScript/Vite build pass.

- [ ] **Step 6: Commit reviewer UI**

```powershell
git add frontend
git commit -m "feat: add reviewer contract package workflow"
```

### Task 5: Integrated Verification

**Files:**
- Modify only files required by observed integration defects.

- [ ] **Step 1: Validate database and backend**

Run: `python -m prisma validate`

Run: `python -m pytest -q`

- [ ] **Step 2: Validate frontend and dependencies**

Run: `npm test -- --run`

Run: `npm run build`

Run: `npm audit --audit-level=high`

- [ ] **Step 3: Run local workflow smoke checks**

Verify Admin MSA upload/assignment, reviewer MSA visibility, explicit SOW/support uploads, authenticated package analysis, contradiction output, and refusal behavior. Confirm anonymous API requests return 401 and Legal Reviewer MSA upload returns 422.

- [ ] **Step 4: Push production**

```powershell
git push origin production
```
