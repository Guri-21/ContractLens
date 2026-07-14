# Person 1 — Backend + Database

## Branch

```bash
git switch -c feature/backend-db
```

## Ownership

```
prisma/schema.prisma
lib/db/*
lib/prisma.ts
lib/schemas.ts
lib/audit/index.ts
app/api/documents/route.ts
app/api/playbook/route.ts
app/api/audit/route.ts
```

## Tasks

- [ ] **Task 1.1 — Finalize Prisma Schema** (`prisma/schema.prisma`)
  - Add missing models:
    - `RedlineSuggestion` (clauseId, originalText, suggestedText, status, reviewerAction)
    - `LegalSource` (name, act, section, summary)
  - Add fields to existing models:
    - `Document`: add `status` (uploaded / parsed / analyzed / reviewed)
    - `Clause`: add `title`, `clauseType`
    - `Risk`: add `status` (evaluated / not_evaluated), add `evidence` JSON
  - Run `npx prisma generate` and `npx prisma db push`

- [ ] **Task 1.2 — Implement Document APIs** (`app/api/documents/route.ts`)
  - `POST /api/documents` — Accept upload (name, type, content), save to DB, return ID
  - `GET /api/documents` — List all docs with clause counts and risk summary
  - `GET /api/documents/:id` — Single doc with clauses, risks, audit logs
  - Wire `lib/db/documents.ts`

- [ ] **Task 1.3 — Implement Playbook APIs** (`app/api/playbook/route.ts`)
  - `POST /api/playbook` — Create rule
  - `GET /api/playbook` — List rules (active/inactive filter)
  - `PATCH /api/playbook/:id` — Activate/deactivate
  - `DELETE /api/playbook/:id` — Remove rule
  - Wire `lib/db/playbook.ts`

- [ ] **Task 1.4 — Implement Audit APIs** (`app/api/audit/route.ts`)
  - `POST /api/audit` — Create event (actor, action, clauseId, before/after)
  - `GET /api/audit` — Full timeline (ordered desc)
  - `GET /api/audit?clauseId=xxx` — Filter by clause
  - Wire `lib/db/audit.ts`

- [ ] **Task 1.5 — Maintain Shared Zod Schemas** (`lib/schemas.ts`)
  - Keep `ClauseDTO` and `RiskFindingDTO` in sync with Prisma
  - Add Zod schemas for API request/response validation
  - Coordinate with Person 2, 3, 4 for type changes

## Output Contract

```ts
// POST /api/documents → { id, name, type, createdAt }
// GET /api/documents  → { documents: [{ id, name, type, createdAt, clauseCount, riskCount }] }
// POST /api/audit     → { id, timestamp, actor, action }
```

## ❌ Do NOT Touch

```
components/*
lib/parser/*
lib/agents/*
lib/risk/*, lib/graph/*, lib/redline/*
Frontend pages
```
