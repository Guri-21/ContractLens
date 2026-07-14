# Person 4 — Frontend UI

## Branch

```bash
git switch -c feature/frontend-ui
```

## Ownership

```
app/page.tsx
app/(dashboard)/*
app/(viewer)/*
app/(admin)/*
app/globals.css
app/layout.tsx
components/*
```

## Files to Implement

```
components/layout/app-shell.tsx
components/upload/document-upload.tsx
components/dashboard/risk-summary.tsx
components/dashboard/clause-distribution.tsx
components/dashboard/recent-documents.tsx
components/document-viewer/document-panel.tsx
components/document-viewer/clause-list.tsx
components/document-viewer/source-citation.tsx
components/risk/risk-card.tsx
components/risk/risk-level-badge.tsx
components/graph/dependency-graph.tsx
components/redline/redline-viewer.tsx
components/redline/redline-actions.tsx
components/audit/audit-timeline.tsx
components/admin/playbook-editor.tsx
```

## Tasks

> ⚠️ **Build everything with mock data first** (`mock/sample-analysis.ts`, `mock/sample-risks.ts`). Connect APIs later. This prevents blocking + reduces merge conflicts.

- [ ] **Task 4.1 — App Shell** (`components/layout/app-shell.tsx`)
  - Sidebar: Dashboard, Documents, Redline, Audit Trail, Admin
  - Top header bar
  - Responsive (collapsible sidebar on mobile)

- [ ] **Task 4.2 — Replace Homepage** (`app/page.tsx`)
  - Remove Next.js starter page
  - Upload + dashboard entry point

- [ ] **Task 4.3 — Document Upload** (`components/upload/document-upload.tsx`)
  - Drag-and-drop zone
  - Document type selector (MSA, SOW, SLA, NDA, EXHIBIT)
  - Upload progress indicator
  - Multiple file support

- [ ] **Task 4.4 — Dashboard Page** (`app/(dashboard)/dashboard/page.tsx`)
  - `RiskSummary` — stat cards (total docs, risks, high-risk, pending)
  - `ClauseDistribution` — chart of clause types
  - `RecentDocuments` — recent uploads with badges

- [ ] **Task 4.5 — Document Viewer** (`app/(viewer)/document/[id]/page.tsx`)
  - Left: `ClauseList` with risk badges
  - Right: `DocumentPanel` with `SourceCitation` + `RiskCard`
  - Click clause → show detail

- [ ] **Task 4.6 — Risk Cards** (`components/risk/risk-card.tsx`)
  - `RiskLevelBadge`, clause ref, reason, evidence, redline preview

- [ ] **Task 4.7 — Redline Page** (`app/(dashboard)/redline/page.tsx`)
  - `RedlineViewer` + `RedlineActions`
  - Deleted: red strikethrough / Inserted: green underline
  - Accept / Reject / Edit → logs audit event

- [ ] **Task 4.8 — Audit Trail** (`app/(dashboard)/audit-trail/page.tsx`)
  - Vertical timeline: uploaded → analyzed → redline → accepted/rejected
  - Actor badge (AI / Human), timestamp, before/after diff

- [ ] **Task 4.9 — Admin Page** (`app/(admin)/admin/page.tsx`)
  - `PlaybookEditor` — CRUD for rules, active/inactive toggle

- [ ] **Task 4.10 — Dependency Graph** (`components/graph/dependency-graph.tsx`)
  - Use react-flow, d3, or vis-network
  - Nodes = clauses, Edges = references
  - Red highlight for cycles

- [ ] **Task 4.11 — Connect APIs** (after backend ready)
  - Replace mock imports with `fetch()` to `/api/*`

## ❌ Do NOT Touch

```
lib/parser/*
lib/agents/*, lib/risk/*, lib/graph/*, lib/redline/*
lib/db/*
prisma/schema.prisma
app/api/* routes
```
