# ContractLens — Team Workflow Guide

> **Last updated:** July 14, 2025
> **Branch base:** `vinayak_feature`

---

## 🔒 Golden Rule

**Each person owns one folder/module. Never edit another person's files without discussion.**

### Shared Files (require team discussion before changes)

| File | Primary Owner |
|---|---|
| `prisma/schema.prisma` | Person 1 |
| `lib/schemas.ts` | Person 1 |
| `package.json` | One person at a time |
| `app/globals.css` | Person 4 |

---

## 🌿 Branch Setup

```bash
git switch vinayak_feature

# Each person creates their branch:
git switch -c feature/backend-db        # Person 1
git switch -c feature/parser            # Person 2
git switch -c feature/ai-risk-engine    # Person 3
git switch -c feature/frontend-ui       # Person 4
git switch -c feature/demo-benchmark    # Person 5
```

### Merge Order

```
1. feature/backend-db       → vinayak_feature
2. feature/demo-benchmark   → vinayak_feature
3. feature/parser           → vinayak_feature
4. feature/ai-risk-engine   → vinayak_feature
5. feature/frontend-ui      → vinayak_feature   (last, depends on final API shape)
```

---

## 👤 Person 1 — Backend + Database

### Ownership

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

### Tasks

- [ ] **Task 1.1 — Finalize Prisma Schema**
  - Open `prisma/schema.prisma`
  - Add missing models if needed:
    - `RedlineSuggestion` (clauseId, originalText, suggestedText, status, reviewerAction)
    - `LegalSource` (name, act, section, summary)
  - Add fields to existing models:
    - `Document`: add `status` field (e.g., `uploaded`, `parsed`, `analyzed`, `reviewed`)
    - `Clause`: add `title`, `clauseType` fields
    - `Risk`: add `status` (evaluated / not_evaluated), add `evidence` JSON field
  - Run `npx prisma generate` after changes
  - Run `npx prisma db push` or create migration

- [ ] **Task 1.2 — Implement Document APIs** (`app/api/documents/route.ts`)
  - `POST /api/documents` — Accept document upload (name, type, content), save to DB, return document ID
  - `GET /api/documents` — List all documents with clause counts and risk summary
  - `GET /api/documents/:id` — Get single document with all clauses, risks, audit logs
  - Wire up functions from `lib/db/documents.ts`

- [ ] **Task 1.3 — Implement Playbook APIs** (`app/api/playbook/route.ts`)
  - `POST /api/playbook` — Create new playbook rule
  - `GET /api/playbook` — List all rules (with active/inactive filter)
  - `PATCH /api/playbook/:id` — Activate/deactivate a rule
  - `DELETE /api/playbook/:id` — Remove a rule
  - Wire up functions from `lib/db/playbook.ts`

- [ ] **Task 1.4 — Implement Audit APIs** (`app/api/audit/route.ts`)
  - `POST /api/audit` — Create audit event (actor, action, clauseId, before/after)
  - `GET /api/audit` — Get full audit timeline (ordered by timestamp desc)
  - `GET /api/audit?clauseId=xxx` — Filter audit events by clause
  - Wire up functions from `lib/db/audit.ts`

- [ ] **Task 1.5 — Maintain Shared Zod Schemas** (`lib/schemas.ts`)
  - Keep `ClauseDTO` and `RiskFindingDTO` types in sync with Prisma models
  - Add Zod schemas for API request/response validation
  - Coordinate with Person 2, 3, 4 if they need type changes

### Output Contract

```ts
// POST /api/documents response:
{ id: string; name: string; type: string; createdAt: string }

// GET /api/documents response:
{ documents: Array<{ id, name, type, createdAt, clauseCount, riskCount }> }

// POST /api/audit response:
{ id: string; timestamp: string; actor: string; action: string }
```

### ❌ Do NOT Touch

```
components/*
lib/parser/*
lib/agents/*
lib/risk/*
lib/graph/*
lib/redline/*
Frontend pages (except API integration examples)
```

---

## 👤 Person 2 — Document Parser

### Ownership

```
lib/parser/*
app/api/parse/route.ts
```

### Files to Implement

```
lib/parser/types.ts              ← already created (review and update)
lib/parser/extract-text.ts       ← already created (implement PDF support)
lib/parser/extract-clauses.ts    ← already created (implement clause detection)
lib/parser/extract-tables.ts     ← already created (implement table parsing)
lib/parser/extract-references.ts ← already created (implement ref/override detection)
lib/parser/index.ts              ← already created (wire everything together)
```

### Tasks

- [ ] **Task 2.1 — Text Extraction** (`lib/parser/extract-text.ts`)
  - Accept plain text input (already done)
  - Add PDF text extraction using `pdf-parse` or `pdfjs-dist`
  - If adding a package, coordinate with team on `package.json` update
  - Implement `splitPages()` for page boundary detection

- [ ] **Task 2.2 — Clause Extraction** (`lib/parser/extract-clauses.ts`)
  - Detect section numbers: `1.1`, `2.3`, `5(a)`, `Article II`
  - Detect clause titles: `Payment Terms`, `Liability`, `Termination`, `Confidentiality`
  - Handle nested sub-sections (e.g., `2.1.a`, `3(ii)`)
  - Preserve clause ordering and parent-child relationships
  - Each clause gets a generated ID

- [ ] **Task 2.3 — Table Extraction** (`lib/parser/extract-tables.ts`)
  - Detect markdown-style tables (`| col | col |`)
  - Detect tab/space-aligned tabular data
  - Output as `ExtractedTable` JSON (headers + rows)

- [ ] **Task 2.4 — Reference & Override Detection** (`lib/parser/extract-references.ts`)
  - Detect references to:
    - `Section 5`, `Clause 9.2`
    - `Exhibit B`, `Schedule A`, `Annexure 1`
    - `the MSA`, `the DPA`
  - Detect override/precedence language:
    - `notwithstanding`
    - `subject to`
    - `except as provided`
    - `in case of conflict`
    - `shall prevail`
    - `takes precedence`
  - Return keyword + surrounding context

- [ ] **Task 2.5 — Wire Parse API** (`app/api/parse/route.ts`)
  - `POST /api/parse` — Accept `{ documentId, content }`, return `ParsedDocument`
  - Call `parseDocument()` from `lib/parser/index.ts`
  - Return structured JSON response

- [ ] **Task 2.6 — Missing Reference Detection** (`lib/parser/index.ts`)
  - After extracting all references, check which ones point to documents/sections not present
  - Populate `missingReferences` array in `ParsedDocument`

### Output Contract

```ts
// POST /api/parse response:
type ParsedDocument = {
  documentId: string;
  clauses: ParsedClause[];     // { id, sectionNumber, title, text, page, references, overrides }
  tables: ExtractedTable[];    // { headers, rows, rawText }
  missingReferences: string[]; // ["Exhibit B", "Annexure 1"]
};
```

### ❌ Do NOT Touch

```
components/* (any UI file)
lib/agents/*, lib/risk/*, lib/graph/*, lib/redline/*
prisma/schema.prisma (unless parser needs a new field — discuss first)
```

---

## 👤 Person 3 — AI + Risk Engine

### Ownership

```
lib/agents/*
lib/risk/*
lib/graph/*
lib/redline/*
app/api/analyze/route.ts
```

### Files to Implement

```
lib/agents/classify-clause.ts    ← already created (implement LLM classification)
lib/agents/playbook-check.ts     ← already created (implement rule matching)
lib/agents/legal-grounding.ts    ← already created (implement legal citation)

lib/risk/detect-contradictions.ts ← already created (implement conflict detection)
lib/risk/refusal-engine.ts       ← already created (implement refusal logic)
lib/risk/risk-score.ts           ← already created (implement scoring algorithm)

lib/graph/build-dependency-graph.ts ← already created (implement graph construction)
lib/graph/detect-cycles.ts         ← already created (implement DFS cycle detection)

lib/redline/generate-redline.ts  ← already created (implement LLM redline generation)
lib/redline/diff-words.ts        ← already created (implement word-level diff)
```

### Tasks

- [ ] **Task 3.1 — Clause Classification** (`lib/agents/classify-clause.ts`)
  - Use Claude/LLM to classify each clause into:
    - `payment`, `liability`, `termination`, `arbitration`, `confidentiality`
    - `SLA`, `penalty`, `governing_law`, `indemnification`, `force_majeure`, `other`
  - Batch classify for efficiency
  - Use `lib/claude.ts` `callClaude()` helper or implement new LLM call

- [ ] **Task 3.2 — Playbook Compliance Check** (`lib/agents/playbook-check.ts`)
  - Compare each clause against active playbook rules from DB
  - Flag violations with risk level and explanation
  - Example rule: "Payment terms must be Net-45 or longer"

- [ ] **Task 3.3 — Legal Grounding** (`lib/agents/legal-grounding.ts`)
  - Match clause types to relevant Indian legal provisions
  - Reference `lib/legal-corpus/india-acts-index.ts` for act metadata
  - Provide citations (Act name, Section, relevance summary)

- [ ] **Task 3.4 — Contradiction Detection** (`lib/risk/detect-contradictions.ts`)
  - Compare clauses across MSA ↔ SOW ↔ Exhibits for conflicts:
    - Payment: 45 days vs 30 days
    - Liability: capped vs uncapped
    - Arbitration: Bengaluru vs Mumbai
    - SLA: different uptime guarantees
  - Use LLM for semantic comparison of clause pairs
  - Return severity rating for each contradiction

- [ ] **Task 3.5 — Refusal Engine** (`lib/risk/refusal-engine.ts`)
  - If a clause references Exhibit/Schedule/DPA/MSA that is **not uploaded**, mark `not_evaluated`
  - Consume `missingReferences` from parser output
  - Return `RefusalResult` with missing document list
  - **Key demo scenario:** SOW references Exhibit B, Exhibit B not uploaded → `not_evaluated`

- [ ] **Task 3.6 — Risk Scoring** (`lib/risk/risk-score.ts`)
  - Compute overall risk score (0–100) per clause based on:
    - Contradiction severity (weight: high)
    - Playbook violations (weight: medium)
    - Missing references (weight: high)
    - Override complexity (weight: low)
  - Map score to `RiskLevel`: low (0–25), medium (26–50), high (51–75), critical (76–100)

- [ ] **Task 3.7 — Dependency Graph** (`lib/graph/build-dependency-graph.ts`)
  - Build graph nodes from clauses
  - Build edges from cross-references:
    - Clause A references Clause B → edge A→B
    - SOW references MSA → edge SOW→MSA
    - SOW references Exhibit B → edge SOW→Exhibit B
  - Use parsed references from Person 2's output

- [ ] **Task 3.8 — Circular Reference Detection** (`lib/graph/detect-cycles.ts`)
  - Implement DFS-based cycle detection on the dependency graph
  - Return all cycles found (e.g., A → B → C → A)
  - Flag as high risk

- [ ] **Task 3.9 — Redline Generation** (`lib/redline/generate-redline.ts`)
  - Use LLM to suggest improved clause text for risky clauses
  - Provide: original text, suggested text, reason for change
  - Example: "Change 'Net-30' to 'Net-45' to align with MSA"

- [ ] **Task 3.10 — Word-Level Diff** (`lib/redline/diff-words.ts`)
  - Implement word-level diff between original and suggested text
  - Return `DiffSegment[]` with type: `equal`, `insert`, `delete`
  - Implement `renderDiffHtml()` for strikethrough/underline HTML output

- [ ] **Task 3.11 — Wire Analyze API** (`app/api/analyze/route.ts`)
  - `POST /api/analyze` — Accept parsed clauses, run full analysis pipeline:
    1. Classify clauses
    2. Check playbook compliance
    3. Detect contradictions
    4. Run refusal engine
    5. Compute risk scores
    6. Build dependency graph
    7. Detect cycles
    8. Generate redlines for risky clauses
  - Return `AnalysisResult`

### Output Contract

```ts
// POST /api/analyze response:
type AnalysisResult = {
  risks: RiskFinding[];          // risk per clause
  graph: DependencyGraph;        // { nodes, edges }
  redlines: RedlineSuggestion[]; // suggested changes
  auditEvents: AuditEntry[];     // what the AI did
  refusals: RefusalResult[];     // not_evaluated clauses
  cycles: string[][];            // circular references
};
```

### ❌ Do NOT Touch

```
components/* (any UI/frontend pages)
lib/parser/* (parser internals)
prisma/schema.prisma (unless risk engine needs a new field — discuss first)
```

---

## 👤 Person 4 — Frontend UI

### Ownership

```
app/page.tsx
app/(dashboard)/*
app/(viewer)/*
app/(admin)/*
components/*
app/globals.css
```

### Files to Implement

```
components/layout/app-shell.tsx               ← already created (implement full shell)
components/upload/document-upload.tsx          ← already created (implement drag-drop)
components/dashboard/risk-summary.tsx          ← already created (implement stat cards)
components/dashboard/clause-distribution.tsx   ← already created (implement chart)
components/dashboard/recent-documents.tsx      ← already created (implement doc list)
components/document-viewer/document-panel.tsx  ← already created (implement viewer)
components/document-viewer/clause-list.tsx     ← already created (implement list)
components/document-viewer/source-citation.tsx ← already created (implement citations)
components/risk/risk-card.tsx                  ← already created (implement card)
components/risk/risk-level-badge.tsx           ← already created (done, review)
components/graph/dependency-graph.tsx          ← already created (implement viz)
components/redline/redline-viewer.tsx          ← already created (implement diff view)
components/redline/redline-actions.tsx         ← already created (implement buttons)
components/audit/audit-timeline.tsx            ← already created (implement timeline)
components/admin/playbook-editor.tsx           ← already created (implement editor)
```

### Tasks

> ⚠️ **Important:** Build everything using mock data first (`mock/sample-analysis.ts`, `mock/sample-risks.ts`). Connect real APIs later. This prevents blocking on backend and reduces merge conflicts.

- [ ] **Task 4.1 — App Shell** (`components/layout/app-shell.tsx`)
  - Sidebar navigation with links:
    - 📊 Dashboard (`/dashboard`)
    - 📄 Documents (leads to upload or list)
    - 🔴 Redline (`/redline`)
    - 📋 Audit Trail (`/audit-trail`)
    - ⚙️ Admin (`/admin`)
  - Top header bar with app title
  - Responsive layout (collapsible sidebar on mobile)

- [ ] **Task 4.2 — Replace Homepage** (`app/page.tsx`)
  - Remove the Next.js starter page
  - Replace with upload + dashboard entry point
  - Show `DocumentUpload` component and link to Dashboard

- [ ] **Task 4.3 — Document Upload UI** (`components/upload/document-upload.tsx`)
  - Drag-and-drop zone for files
  - Document type selector (MSA, SOW, SLA, NDA, EXHIBIT)
  - Upload progress indicator
  - Support multiple files
  - On upload: call `POST /api/documents` (or use mock for now)

- [ ] **Task 4.4 — Dashboard Page** (`app/(dashboard)/dashboard/page.tsx`)
  - Import and render:
    - `RiskSummary` — stat cards (total docs, total risks, high-risk, pending review)
    - `ClauseDistribution` — bar/pie chart of clause types
    - `RecentDocuments` — recent uploads with status/risk badges
  - Use mock data initially, swap for API calls later

- [ ] **Task 4.5 — Document Viewer Page** (`app/(viewer)/document/[id]/page.tsx`)
  - Two-panel layout:
    - Left: `ClauseList` — scrollable list of clauses with risk badges
    - Right: `DocumentPanel` — selected clause detail with `SourceCitation` and `RiskCard`
  - Click a clause in the list → show detail on right
  - Show dependency graph below or in a tab

- [ ] **Task 4.6 — Risk Cards** (`components/risk/risk-card.tsx`)
  - Display each risk finding:
    - `RiskLevelBadge` (color-coded)
    - Clause reference
    - Risk reason/explanation
    - Evidence citations (document, page, quote)
    - Redline suggestion preview (if available)
    - "View Redline" button

- [ ] **Task 4.7 — Redline Page** (`app/(dashboard)/redline/page.tsx`)
  - Import `RedlineViewer` and `RedlineActions`
  - Show original vs suggested text with word-level diff
  - Deleted words: red strikethrough
  - Inserted words: green underline
  - Action buttons: Accept / Reject / Edit
  - On action: call `POST /api/audit` to log event

- [ ] **Task 4.8 — Audit Trail Page** (`app/(dashboard)/audit-trail/page.tsx`)
  - Import `AuditTimeline`
  - Vertical timeline showing:
    - 📤 Document uploaded
    - 🤖 AI analysis completed
    - ✏️ Redline suggested
    - ✅ Reviewer accepted / ❌ Reviewer rejected
  - Each event: timestamp, actor badge (AI / Human), action description
  - Before/after diff for redline events

- [ ] **Task 4.9 — Admin Page** (`app/(admin)/admin/page.tsx`)
  - Import `PlaybookEditor`
  - CRUD interface for playbook rules:
    - List existing rules with active/inactive toggle
    - "Add Rule" form (name + description)
    - Delete button with confirmation

- [ ] **Task 4.10 — Dependency Graph Visualization** (`components/graph/dependency-graph.tsx`)
  - Use a library (e.g., `react-flow`, `d3-force`, `vis-network`)
  - Nodes = clauses/documents
  - Edges = references/overrides
  - Highlight circular references in red
  - Clickable nodes → navigate to clause detail

- [ ] **Task 4.11 — Connect APIs (after backend is ready)**
  - Replace mock data imports with `fetch()` calls to:
    - `GET /api/documents`
    - `GET /api/documents/:id`
    - `POST /api/documents`
    - `POST /api/parse`
    - `POST /api/analyze`
    - `GET /api/audit`
    - `GET /api/playbook`

### ❌ Do NOT Touch

```
lib/parser/*
lib/agents/*
lib/risk/*
lib/graph/* (logic files, not the component)
lib/redline/* (logic files, not the component)
lib/db/*
prisma/schema.prisma
app/api/* routes
```

---

## 👤 Person 5 — Demo Data + Benchmark + Reports

### Ownership

```
mock/*
scripts/*
lib/demo/*
lib/legal-corpus/*
README.md
```

### Files to Implement

```
mock/demo-msa.ts          ← already created (review and expand)
mock/demo-sow.ts          ← already created (review and expand)
mock/demo-exhibit-a.ts    ← already created (review and expand)
mock/sample-documents.ts  ← already created (review)
mock/sample-analysis.ts   ← needs creation
mock/sample-risks.ts      ← needs creation

scripts/benchmark/run-clause-benchmark.ts    ← needs creation
scripts/benchmark/run-refusal-benchmark.ts   ← needs creation
scripts/benchmark/run-risk-benchmark.ts      ← needs creation
scripts/seed-demo.ts                         ← needs creation
scripts/extract-cuad-samples.ts              ← needs creation

lib/legal-corpus/india-acts-index.ts ← already created (expand)
lib/demo/demo-scenarios.ts          ← already created (expand)
```

### Tasks

- [ ] **Task 5.1 — Create Mock Analysis Results** (`mock/sample-analysis.ts`)
  - Create realistic analysis output that Person 4 can use immediately:
    ```ts
    export const SAMPLE_ANALYSIS = {
      risks: [ /* 6-8 sample risk findings */ ],
      graph: { nodes: [...], edges: [...] },
      redlines: [ /* 3-4 sample redline suggestions */ ],
      refusals: [ /* 1-2 not_evaluated examples */ ],
    };
    ```
  - Include all risk types: contradiction, playbook violation, missing doc, circular ref

- [ ] **Task 5.2 — Create Mock Risk Data** (`mock/sample-risks.ts`)
  - Pre-built `RiskFindingDTO[]` matching the shared schema
  - Seeded risks:
    - ⚠️ Payment conflict (MSA Net-45 vs SOW Net-30) → `high`
    - ⚠️ Liability conflict (capped vs uncapped) → `critical`
    - ⚠️ Arbitration conflict (Bengaluru vs Mumbai) → `high`
    - ⚠️ Vague deadline ("reasonable time") → `medium`
    - ⚠️ Missing Exhibit B → `not_evaluated`
    - ⚠️ Circular reference (A → B → C → A) → `high`

- [ ] **Task 5.3 — Expand Demo Documents** (existing mock files)
  - Review and enrich `demo-msa.ts`, `demo-sow.ts`, `demo-exhibit-a.ts`
  - Add 1-2 more document pairs (e.g., NDA, SLA) if time permits
  - Ensure each pair has clear, demonstrable conflicts

- [ ] **Task 5.4 — Create Seed Script** (`scripts/seed-demo.ts`)
  - Script that populates the database with demo data:
    ```bash
    npx ts-node scripts/seed-demo.ts
    ```
  - Insert demo documents, trigger parse, trigger analyze
  - Useful for setting up demo environment quickly

- [ ] **Task 5.5 — Clause Benchmark** (`scripts/benchmark/run-clause-benchmark.ts`)
  - Use CUAD/LEDGAR samples for clause extraction testing
  - Define expected outputs (expected clauses, types, references)
  - Run parser on samples, compare to expected, report accuracy
  - Output: precision, recall, F1 for clause extraction

- [ ] **Task 5.6 — Refusal Benchmark** (`scripts/benchmark/run-refusal-benchmark.ts`)
  - Test cases where documents are intentionally missing
  - Verify system correctly returns `not_evaluated`
  - Test cases where all docs are present → should return `evaluated`
  - Output: pass/fail per test case

- [ ] **Task 5.7 — Risk Benchmark** (`scripts/benchmark/run-risk-benchmark.ts`)
  - Define expected risks for each demo document pair
  - Run analysis pipeline, compare to expected
  - Report: found risks, missed risks, false positives
  - Output: precision, recall, F1 for risk detection

- [ ] **Task 5.8 — CUAD/LEDGAR Samples** (`scripts/extract-cuad-samples.ts`)
  - Extract relevant clause samples from CUAD dataset
  - Extract clause classification samples from LEDGAR
  - Format for use in benchmarks

- [ ] **Task 5.9 — Expand Legal Corpus** (`lib/legal-corpus/india-acts-index.ts`)
  - Add more acts: Companies Act, Consumer Protection Act, DPDP Act 2023
  - Add key sections with summaries for each act
  - This data is consumed by Person 3's legal grounding agent

- [ ] **Task 5.10 — Demo Script & README** (`README.md`)
  - Write setup instructions:
    ```
    1. Clone repo
    2. npm install
    3. Set up .env (DATABASE_URL, ANTHROPIC_API_KEY)
    4. npx prisma db push
    5. npm run dev
    ```
  - Write demo walkthrough:
    - Step 1: Upload demo MSA + SOW
    - Step 2: View parsed clauses in document viewer
    - Step 3: See risk dashboard with flagged contradictions
    - Step 4: Open redline page → see suggested changes
    - Step 5: Show refusal → upload SOW without Exhibit B → `not_evaluated`
    - Step 6: Accept a redline → see audit trail event
  - Include screenshots placeholders

### ❌ Do NOT Touch

```
app/api/* (core API routes)
components/* (except verifying mock data import shapes)
lib/parser/* (parser internals)
lib/agents/*, lib/risk/*, lib/graph/*, lib/redline/* (engine internals)
lib/db/*
prisma/schema.prisma
```

---

## 🔗 Integration Milestones

### Milestone 1 — Independent Modules Work ✅

| Person | Deliverable | Validates |
|---|---|---|
| Person 1 | APIs return proper JSON responses | DB layer works |
| Person 2 | Parser returns clauses from demo MSA text | Clause extraction works |
| Person 3 | Risk engine returns risks from mock clauses | AI analysis works |
| Person 4 | Mock UI renders dashboard, viewer, redline | Frontend works without backend |
| Person 5 | Demo MSA/SOW pairs ready, mock data files complete | Test data ready |

### Milestone 2 — End-to-End Upload → Dashboard

```
Upload document → POST /api/documents → POST /api/parse → POST /api/analyze → Dashboard shows risks
```

**Integration touchpoints:**
- Person 1's API accepts upload and stores document
- Person 2's parser extracts clauses from stored content
- Person 3's engine analyzes parsed clauses
- Person 4's dashboard displays results
- Person 5's demo data validates the flow

### Milestone 3 — Refusal Demo

```
Upload SOW (references Exhibit B) → Exhibit B is missing → System shows "not_evaluated"
```

**Integration touchpoints:**
- Person 2's parser detects `Exhibit B` reference
- Person 3's refusal engine checks available documents
- Person 4's UI shows `not_evaluated` status badge
- Person 5's demo SOW has the seeded reference

### Milestone 4 — Redline + Audit Trail

```
AI suggests redline → Reviewer accepts → Audit event created → Timeline shows event
```

**Integration touchpoints:**
- Person 3's redline generator produces suggestion
- Person 4's redline viewer shows diff with accept/reject buttons
- Person 1's audit API records the event
- Person 4's audit timeline displays the history

---

## 📁 Full File Ownership Map

```
Person 1: app/api/documents/*     ← owns
          app/api/playbook/*      ← owns
          app/api/audit/*         ← owns
          prisma/*                ← owns
          lib/db/*                ← owns
          lib/prisma.ts           ← owns
          lib/schemas.ts          ← owns
          lib/audit/*             ← owns

Person 2: lib/parser/*            ← owns
          app/api/parse/*         ← owns

Person 3: lib/agents/*            ← owns
          lib/risk/*              ← owns
          lib/graph/*             ← owns
          lib/redline/*           ← owns
          app/api/analyze/*       ← owns

Person 4: app/page.tsx            ← owns
          app/(dashboard)/*       ← owns
          app/(viewer)/*          ← owns
          app/(admin)/*           ← owns
          app/globals.css         ← owns
          app/layout.tsx          ← owns
          components/*            ← owns

Person 5: mock/*                  ← owns
          scripts/*               ← owns
          lib/demo/*              ← owns
          lib/legal-corpus/*      ← owns
          README.md               ← owns

Shared:   lib/claude.ts           ← Person 3 primary, Person 1 may use
          lib/utils.ts            ← anyone can use, avoid conflicts
          package.json            ← one person at a time
          .env                    ← not committed, everyone has their own
```

---

## 💬 Communication Protocol

1. **Before editing a shared file:** Post in team chat with the change you want to make
2. **Before adding a package:** Announce in team chat, only one person updates `package.json` at a time
3. **If you need a new field in Prisma schema:** File a request with Person 1
4. **If you need a new type in `lib/schemas.ts`:** File a request with Person 1
5. **Daily sync:** Each person reports: done / in-progress / blocked

---

## 🚀 Quick Start for Each Person

### Person 1
```bash
git switch -c feature/backend-db
# Start with prisma/schema.prisma → add missing models
# Then implement app/api/documents/route.ts
# Then app/api/playbook/route.ts and app/api/audit/route.ts
```

### Person 2
```bash
git switch -c feature/parser
# Start with lib/parser/extract-clauses.ts → implement clause detection
# Then extract-references.ts → implement cross-reference detection
# Then wire app/api/parse/route.ts
# Test with: import { DEMO_MSA } from "@/mock/demo-msa" and parse it
```

### Person 3
```bash
git switch -c feature/ai-risk-engine
# Start with lib/agents/classify-clause.ts → implement LLM classification
# Then lib/risk/detect-contradictions.ts → implement conflict detection
# Then lib/risk/refusal-engine.ts → implement refusal logic
# Then lib/graph/ → build graph + cycle detection
# Then lib/redline/ → generate suggestions + diff
# Finally wire app/api/analyze/route.ts
```

### Person 4
```bash
git switch -c feature/frontend-ui
# Start by importing mock data: import { SAMPLE_RISKS } from "@/mock/sample-risks"
# Build components/layout/app-shell.tsx → full navigation shell
# Then dashboard page with RiskSummary + RecentDocuments
# Then document viewer with ClauseList + DocumentPanel
# Then redline page + audit trail page
# Connect real APIs LAST
```

### Person 5
```bash
git switch -c feature/demo-benchmark
# Start with mock/sample-analysis.ts and mock/sample-risks.ts
# Person 4 is WAITING on these files — deliver first!
# Then expand demo documents
# Then write benchmark scripts
# Then write README demo walkthrough
```
