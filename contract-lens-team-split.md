# ContractLens — 5-Person Work Split + Antigravity Prompts

## Strategy: contract-first, so no one blocks on anyone else

Everyone builds against two things that never change once agreed:

1. **The data contract** — `ClauseDTO` and `RiskFindingDTO` from the brief, Section 5.
2. **A shared mock dataset** — 2 fake related documents (an MSA + SOW) already run through the pipeline, saved as static JSON. Person 2 produces this *first, on day one*, even before the real pipeline is solid, so Persons 3/4/5 have something real to build UI against immediately instead of waiting.

Nobody waits on a "finished" backend or "finished" AI pipeline. They wait on **the shape of the JSON**, which is fixed from hour one.

Roles map to the seams in the architecture that don't require touching each other's code day-to-day:

| # | Person | Owns | Depends on from others |
|---|--------|------|------------------------|
| 1 | Backend & Data Platform Lead | DB schema, API, auth, roles, audit log, orchestration endpoint | Nothing to start (defines the contract others consume) |
| 2 | AI Pipeline Engineer | All 10 pipeline steps (Section 4) as Claude-agent calls with strict JSON schemas | Nothing to start |
| 3 | Frontend — Reviewer Workspace | Upload, Clause Viewer, Cross-Doc Comparison, Redline UI, AI chat assistant | Mock JSON from Person 2, API stub from Person 1 |
| 4 | Frontend — Admin & Compliance | Admin panel, playbook/country rule management, user mgmt, Audit Trail, Compliance dashboard/analytics | Mock JSON from Person 2, API stub from Person 1 |
| 5 | PDF/Graph/Reports & Integration | PDF viewer with highlight overlays, dependency graph rendering, report export, final wiring + deploy | Everyone's outputs, late-stage |

Person 1 and Person 2 should each spend their first ~2 hours publishing a stub (an OpenAPI/mock API for Person 1, a sample JSON output file for Person 2) to a shared repo folder before going deep — that's what unblocks 3, 4, and 5.

---

## Person 1 — Backend & Data Platform Lead

### Antigravity prompt

```
You are the backend lead on ContractLens, an AI contract-review platform. I'm giving you
the full architectural context, then your specific scope.

ARCHITECTURAL CONSTRAINTS (do not deviate):
- This is NOT a real multi-agent system. "Agents" are just LLM API calls with different
  system prompts and forced JSON schemas. Don't build an orchestration framework — build
  a simple sequential pipeline caller that another module (owned by a teammate) will
  implement the actual LLM calls inside.
- No fine-tuned models. No real graph computation engine — dependency graphs are just
  JSON with {clause_id, references[], overrides[]} that the frontend renders.

YOUR SCOPE — backend & data platform:
1. Design and implement the Postgres schema (via Prisma or SQLAlchemy — your call) for:
   documents, clauses, risk findings, playbook rules, country compliance rules, users,
   roles, audit log entries. Model clauses and risk findings to match EXACTLY these
   TypeScript shapes (treat as source of truth, translate to your ORM):

   type DocumentType = "MSA" | "SOW" | "SLA" | "NDA" | "EXHIBIT" | "PLAYBOOK" | "LAW";
   type RiskLevel = "low" | "medium" | "high" | "critical";
   type EvaluationStatus = "evaluated" | "not_evaluated";

   type ClauseDTO = {
     id: string; documentId: string; documentName: string; documentType: DocumentType;
     sectionNumber?: string; title?: string; page?: number; text: string;
     clauseType?: string; references: string[]; overrides: string[]; tableData?: unknown;
   };

   type RiskFindingDTO = {
     id: string; clauseId: string; riskLevel: RiskLevel; status: EvaluationStatus;
     reason: string; playbookRuleViolated?: string;
     evidence: { documentName: string; page?: number; section?: string; quote: string }[];
     missingDocuments?: string[];
     redline?: { originalText: string; suggestedText: string; diffHtml?: string };
   };

2. Build REST endpoints for: document upload (returns a documentId, stores file, triggers
   processing status), CRUD on playbook versions and country rule sets, user/role
   management (Admin / Legal Reviewer / Compliance Officer), audit log write + query,
   and a single orchestration endpoint POST /documents/:id/analyze that will — for now —
   call a stubbed function `runAnalysisPipeline(documents, playbookId, countryCode)`
   that just returns mock ClauseDTO[]/RiskFindingDTO[] data. A teammate is implementing
   the real pipeline behind that exact function signature — don't build the LLM calls
   yourself, just the seam.
3. Auth: role-based access control for the three roles above. Simple JWT or session-based
   is fine — this is a demo-grade build, not enterprise SSO.
4. Publish an OpenAPI spec (or Postman collection) for every endpoint as your FIRST
   deliverable, before deep implementation, so two frontend teammates can build against
   it with a mock server immediately.

OUT OF SCOPE (explicitly, per project scope cuts — do not build):
- More than 2 related documents per analysis batch
- More than one jurisdiction's compliance rules active at once
- Auto-learning playbook from past approvals
- Multi-format export logic (that's a report-generation concern, not yours)

Deliverable structure: /backend with README explaining how to run it, seed script with
2-3 fake documents/clauses/risks matching the DTO shapes, and the OpenAPI spec checked
in at the repo root so teammates can mock against it. Ask me only if something about
role permissions or endpoint shape is genuinely ambiguous — otherwise make the call and
document your assumption in the README.
```

---

## Person 2 — AI Pipeline Engineer

### Antigravity prompt

```
You are the AI pipeline engineer on ContractLens, an AI contract-review platform.

CRITICAL CONSTRAINT — read this twice: there is no multi-agent framework, no fine-tuned
model, no real graph engine. "Agent" means: one Claude API call, one system prompt, one
FORCED JSON output schema, nothing more. You are building ~10 independent, composable
functions, each calling the Claude API once (or using deterministic code where noted),
each with a strict input/output contract. Treat CUAD/LEDGAR public legal-clause datasets
only as few-shot reference examples inside prompts, never for training.

YOUR SCOPE — implement each of these as a standalone, independently testable module:

1. Document Parsing (deterministic, not LLM): extract text + page/position metadata from
   PDF/DOCX, OCR fallback for scanned pages, table extraction.
2. Clause Extraction & Segmentation (regex-based section-number splitting, e.g. "4.2",
   "5(a)", with a light LLM cleanup pass for edge cases the regex misses).
3. Clause Classification (LLM agent): label each clause's type — payment, confidentiality,
   SLA, liability, insurance, warranty, force majeure, IP, termination, penalty,
   governing law, etc.
4. Dependency/Reference Extraction (LLM agent): find clauses that reference/override/nest
   inside others (trigger phrases: "notwithstanding," "subject to," "except as provided,"
   "in case of conflict"). Output {clause_id, references: [...], overrides: [...]}.
5. Contradiction Detection (LLM agent): given two documents' clause sets, find conflicting
   terms, missing obligations, inconsistent timelines (e.g. MSA says 30-day payment, SOW
   says 90-day payment).
6. Playbook Validation (LLM agent): compare clauses against active playbook rules, flag
   violations and missing required clauses.
7. Country Compliance Validation (LLM agent): check clauses against ONE selected
   jurisdiction's rules (multi-jurisdiction is explicitly out of scope).
8. Risk Assessment: assign low/medium/high/critical per finding, compute overall risk score.
9. Redline Generation (LLM agent): for flagged clauses, propose specific alternative
   wording as {originalText, suggestedText} pairs for word-level diffing.
10. Report Generation (LLM agent + templating): produce executive summary + structured
    findings for the final export.

SPECIAL REQUIREMENT — the refusal engine: if a clause references a document that wasn't
uploaded (e.g. SOW references "Exhibit B" but it's missing), you MUST NOT let the LLM
guess what it says. Set that finding's status to "not_evaluated" and list the missing
document in missingDocuments. This is a hard requirement, not a nice-to-have — write a
test case for it.

OUTPUT CONTRACT — every function's output must conform exactly to these shapes:

  type ClauseDTO = {
    id: string; documentId: string; documentName: string;
    documentType: "MSA"|"SOW"|"SLA"|"NDA"|"EXHIBIT"|"PLAYBOOK"|"LAW";
    sectionNumber?: string; title?: string; page?: number; text: string;
    clauseType?: string; references: string[]; overrides: string[]; tableData?: unknown;
  };

  type RiskFindingDTO = {
    id: string; clauseId: string; riskLevel: "low"|"medium"|"high"|"critical";
    status: "evaluated"|"not_evaluated"; reason: string; playbookRuleViolated?: string;
    evidence: { documentName: string; page?: number; section?: string; quote: string }[];
    missingDocuments?: string[];
    redline?: { originalText: string; suggestedText: string; diffHtml?: string };
  };

Every risk finding's `evidence` must contain an exact quote from source text — never
paraphrase evidence. This "show your evidence" requirement is central and non-negotiable.

TOP PRIORITY FIRST DELIVERABLE (do this before polishing the pipeline): generate a static
sample output — run 2 fake related documents (write them yourself: a short MSA + SOW with
one deliberate contradiction, e.g. differing payment terms) through your pipeline and save
the resulting ClauseDTO[]/RiskFindingDTO[] as JSON files in /shared/mock-data/. Three
teammates building frontend need this file today to build against, before your pipeline
is fully correct.

Deliverable structure: /pipeline with each of the 10 steps as a separate module + a
top-level `runAnalysisPipeline(documents, playbookId, countryCode)` that composes them in
order, callable independently of any backend/frontend code, with its own test script using
the sample documents.
```

---

## Person 3 — Frontend: Reviewer Workspace

### Antigravity prompt

```
You are building the primary reviewer-facing UI for ContractLens, an AI contract-review
platform, using React + Vite + TailwindCSS + shadcn/ui.

CONTEXT: legal reviewers upload contracts, the system runs an AI pipeline (already
handled by a teammate — you don't build it), and reviewers work through clause-by-clause
findings. Every AI claim in this product must show its evidence (exact quote + page/
section) — that's a core design principle, keep it visible in the UI, don't hide it
behind extra clicks.

DATA CONTRACT you build against (do not invent new shapes):

  type ClauseDTO = {
    id: string; documentId: string; documentName: string;
    documentType: "MSA"|"SOW"|"SLA"|"NDA"|"EXHIBIT"|"PLAYBOOK"|"LAW";
    sectionNumber?: string; title?: string; page?: number; text: string;
    clauseType?: string; references: string[]; overrides: string[]; tableData?: unknown;
  };

  type RiskFindingDTO = {
    id: string; clauseId: string; riskLevel: "low"|"medium"|"high"|"critical";
    status: "evaluated"|"not_evaluated"; reason: string; playbookRuleViolated?: string;
    evidence: { documentName: string; page?: number; section?: string; quote: string }[];
    missingDocuments?: string[];
    redline?: { originalText: string; suggestedText: string; diffHtml?: string };
  };

A "not_evaluated" status means the AI explicitly refused to guess (usually because a
referenced document, like an Exhibit, wasn't uploaded) — render this distinctly, not as
just another risk level. Never let the UI imply a guess was made.

YOUR SCOPE — build these screens/components:
1. Upload flow: upload 1-2 related documents (max 2 — that's a hard product limit, don't
   design for more), select playbook version + country + contract type, show processing
   status (parsing / analyzing / done).
2. Clause Viewer: list of every clause with a risk badge; clicking one opens a detail
   panel with original text, AI's explanation, related/referenced clause links, related
   risk findings, and suggested fixes.
3. Cross-Document Comparison: side-by-side view surfacing contradictions between two
   documents (e.g. MSA vs SOW payment terms).
4. Redline view: word-level diff of AI-suggested rewording (originalText vs
   suggestedText) with Accept / Reject / Modify actions. Accepting should be wired to
   trigger a re-analysis call (stub this as a function prop for now — teammate on
   backend owns the real endpoint).
5. Inline clause editing with a "re-run analysis on this clause" trigger.
6. AI Legal Assistant chat panel — simple chat UI where the user can ask things like
   "Explain Clause 12" or "Why is this clause risky?" (stub the actual LLM call behind a
   function prop; you're building the UI, not the assistant's backend).

BUILD AGAINST MOCK DATA FIRST: I'll provide (or you should stub) sample ClauseDTO[]/
RiskFindingDTO[] JSON representing a small MSA+SOW with one flagged contradiction and one
"not_evaluated" finding. Build and demo entirely against that mock before wiring to any
real API — assume the real backend and AI pipeline are being built in parallel by
teammates and won't be ready immediately.

OUT OF SCOPE: admin screens, compliance analytics/dashboards, PDF rendering with overlay
highlighting, and the dependency graph visualization — those belong to other teammates.
You can assume a `<DependencyGraph clauseId={...} />` and a `<PdfViewer .../>` component
will be dropped into your Clause Viewer later; leave clearly marked slots for them.

Deliverable: /frontend/reviewer-workspace as a self-contained set of routes/components,
with a mock-data mode toggled by an env var so it runs standalone without any backend.
```

---

## Person 4 — Frontend: Admin & Compliance

### Antigravity prompt

```
You are building the Admin and Compliance Officer UI for ContractLens, an AI
contract-review platform, using React + Vite + TailwindCSS + shadcn/ui + recharts for
charts.

CONTEXT: this product has three roles. Legal Reviewers do contract review (another
teammate owns that UI). You own the other two: Admin (configures the platform) and
Compliance Officer (monitors aggregate risk posture, doesn't review individual contracts).

DATA CONTRACT — everything you display is built from these shapes (owned by teammates
producing the actual data; you consume it):

  type RiskFindingDTO = {
    id: string; clauseId: string; riskLevel: "low"|"medium"|"high"|"critical";
    status: "evaluated"|"not_evaluated"; reason: string; playbookRuleViolated?: string;
    evidence: { documentName: string; page?: number; section?: string; quote: string }[];
    missingDocuments?: string[];
    redline?: { originalText: string; suggestedText: string; diffHtml?: string };
  };

  type ClauseDTO = {
    id: string; documentId: string; documentName: string;
    documentType: "MSA"|"SOW"|"SLA"|"NDA"|"EXHIBIT"|"PLAYBOOK"|"LAW";
    sectionNumber?: string; title?: string; page?: number; text: string;
    clauseType?: string; references: string[]; overrides: string[]; tableData?: unknown;
  };

YOUR SCOPE:

Admin panel:
1. Playbook management: upload a new playbook version, view version history, set active
   version. (Playbook is a set of rules like "payment terms must be ≤30 days" — you don't
   need to parse rule logic yourself, just store/display/version the uploaded
   document(s).)
2. Country compliance rules: upload/manage rule sets — but note the product supports only
   ONE active jurisdiction at a time, don't design a multi-jurisdiction selector.
3. User & role management: create/edit users, assign one of Admin / Legal Reviewer /
   Compliance Officer.
4. System-wide monitoring: table of all uploaded contracts, their processing status, and
   review history across all reviewers.
5. Audit Trail view: who uploaded what, when, what risk score resulted, what action a
   reviewer took on each finding. This view is shared conceptually with reviewers (they
   see their own contracts' trail) but you're building the system-wide Admin version.

Compliance Officer dashboard:
1. Aggregate dashboard: contracts reviewed, pending reviews, high-risk contract count,
   average risk score.
2. Risk analytics: risk distribution, trends over time, department-wise / country-wise /
   clause-type-wise risk breakdowns — use recharts for all of these.
3. Clause analytics: which clause types (payment, confidentiality, liability, etc.) are
   most commonly flagged risky.
4. Business analytics: contracts by client, by country, by department, average review
   time, AI accuracy (if you don't have a real accuracy metric available, stub it clearly
   as a placeholder, don't fabricate a number that looks real).
5. Export analytics reports as PDF only — DOCX/Excel export is explicitly out of scope
   for this build, don't build multi-format export.

BUILD AGAINST MOCK DATA FIRST: stub a realistic set of aggregate JSON (10-20 fake
contracts' worth of risk findings) and build entirely against that before any real API is
ready. Assume the real backend is being built in parallel.

OUT OF SCOPE: the reviewer's Clause Viewer, Redline UI, Cross-Document Comparison, and AI
chat assistant — another teammate owns those.

Deliverable: /frontend/admin-compliance as a self-contained route set with a mock-data
mode toggle, independent of any live backend.
```

---

## Person 5 — PDF Viewer, Dependency Graph, Reports & Integration

### Antigravity prompt

```
You own the most cross-cutting slice of ContractLens: the two visual components that plug
into the reviewer's Clause Viewer (built by a teammate), plus final report export, plus
being the person who wires all five people's work together and deploys it. Expect your
work to ramp up in the second half of the build as other pieces land.

PART A — PDF Viewer with highlight overlays:
Build a `<PdfViewer document={...} highlightClauseId={...} />` component using
react-pdf/pdf.js that renders the source PDF and, given a clause's page/position metadata,
draws a highlight overlay at that exact spot — so clicking a risk finding jumps the PDF
view to and highlights the exact source clause. This is what makes the "show your
evidence" principle real for the user, not just text in a sidebar.

PART B — Dependency Graph:
Build a `<DependencyGraph clauses={ClauseDTO[]} />` component using react-flow or
vis-network. IMPORTANT ARCHITECTURAL NOTE: there is no real graph computation engine in
this system — the LLM outputs `{clause_id, references: [...], overrides: [...]}` per
clause, and your job is purely to RENDER that JSON as a graph. The only computation you
should add on top is simple cycle detection (for warning display, e.g. "circular
reference detected"), nothing more sophisticated.

PART C — Report Generation (export):
Take the structured executive-summary + findings JSON (produced by a teammate's "Report
Generation" pipeline step) and render it into an exportable PDF (risk score, findings
list, evidence, suggested fixes). PDF-only — DOCX/Excel export is explicitly out of scope,
don't build it even if it seems easy to add.

PART D — Version comparison:
Build the old-vs-new contract version view: given two versions of the same document's
clauses, highlight added / removed / modified clauses. This is used both standalone and
inside the reviewer's Cross-Document Comparison screen.

PART E — Integration & deployment (do this last, once other pieces exist):
1. Wire the four teammates' pieces together: backend API (Person 1) + AI pipeline
   (Person 2) + reviewer UI (Person 3) + admin/compliance UI (Person 4) + your own
   components, replacing everyone's mock-data mode with real API calls.
2. Deploy: frontend on Vercel, backend on Render or Railway (or both running locally for
   a live demo if that's the constraint — confirm with the team which).
3. Write basic end-to-end tests covering: upload → analysis → clause review → redline
   accept → report export, using the shared sample MSA+SOW documents.
4. Confirm the refusal-engine behavior end-to-end: a clause referencing a missing
   document (e.g. "Exhibit B") must show status "not_evaluated" with the missing document
   named, all the way through from pipeline output to UI — never silently dropped or
   guessed.

DATA CONTRACT reference (same as everyone else, don't deviate):

  type ClauseDTO = {
    id: string; documentId: string; documentName: string;
    documentType: "MSA"|"SOW"|"SLA"|"NDA"|"EXHIBIT"|"PLAYBOOK"|"LAW";
    sectionNumber?: string; title?: string; page?: number; text: string;
    clauseType?: string; references: string[]; overrides: string[]; tableData?: unknown;
  };

  type RiskFindingDTO = {
    id: string; clauseId: string; riskLevel: "low"|"medium"|"high"|"critical";
    status: "evaluated"|"not_evaluated"; reason: string; playbookRuleViolated?: string;
    evidence: { documentName: string; page?: number; section?: string; quote: string }[];
    missingDocuments?: string[];
    redline?: { originalText: string; suggestedText: string; diffHtml?: string };
  };

Start on Parts A-D independently using the shared mock JSON (same sample MSA+SOW dataset
the frontend team is using) so you're not idle waiting for Part E's dependencies to land.
Deliverable: /frontend/shared-components for A/B/D, /reports for C, and a root-level
INTEGRATION.md documenting how you wired everything once Part E is underway.
```

---

## Suggested sequencing across the team

- **Day 1:** Person 1 publishes the OpenAPI stub; Person 2 publishes the sample mock JSON (fake MSA+SOW run through the pipeline, including one deliberate contradiction and one `not_evaluated` case). Everyone else starts against those two artifacts immediately.
- **Days 2-4:** Persons 3, 4, 5 build UI against mock data in parallel while Persons 1 and 2 harden the real backend and pipeline.
- **Final stretch:** Person 5 leads integration — swapping mock data for real API calls — since they're the one who understands every seam.

This keeps all five people fully occupied from hour one, with the only hard sync points being "the JSON shape" (fixed up front) and the final integration pass.
