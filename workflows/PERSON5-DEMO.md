# Person 5 — Demo Data + Benchmark + Reports

## Branch

```bash
git switch -c feature/demo-benchmark
```

## Ownership

```
mock/*
scripts/*
lib/demo/*
lib/legal-corpus/*
README.md
```

## Files to Implement

```
mock/demo-msa.ts
mock/demo-sow.ts
mock/demo-exhibit-a.ts
mock/sample-documents.ts
mock/sample-analysis.ts
mock/sample-risks.ts

scripts/benchmark/run-clause-benchmark.ts
scripts/benchmark/run-refusal-benchmark.ts
scripts/benchmark/run-risk-benchmark.ts
scripts/seed-demo.ts
scripts/extract-cuad-samples.ts

lib/legal-corpus/india-acts-index.ts
lib/demo/demo-scenarios.ts
lib/demo/index.ts
lib/legal-corpus/index.ts
```

## Tasks

> ⚠️ **Priority:** Deliver `mock/sample-analysis.ts` and `mock/sample-risks.ts` FIRST — Person 4 is waiting on these.

- [ ] **Task 5.1 — Mock Analysis Results** (`mock/sample-analysis.ts`)
  - Realistic analysis output for Person 4's UI:
    - `risks[]` (6–8 findings), `graph` (nodes + edges), `redlines[]` (3–4), `refusals[]` (1–2)
  - Cover all risk types: contradiction, playbook violation, missing doc, circular ref

- [ ] **Task 5.2 — Mock Risk Data** (`mock/sample-risks.ts`)
  - `RiskFindingDTO[]` matching shared schema
  - Seeded risks:
    - Payment conflict (MSA Net-45 vs SOW Net-30) → `high`
    - Liability conflict (capped vs uncapped) → `critical`
    - Arbitration conflict (Bengaluru vs Mumbai) → `high`
    - Vague deadline → `medium`
    - Missing Exhibit B → `not_evaluated`
    - Circular reference → `high`

- [ ] **Task 5.3 — Demo Documents** (`mock/demo-msa.ts`, `demo-sow.ts`, `demo-exhibit-a.ts`)
  - Create 3–5 realistic MSA/SOW pairs
  - Each pair has clear, demonstrable conflicts
  - Barrel export in `mock/sample-documents.ts`

- [ ] **Task 5.4 — Seed Script** (`scripts/seed-demo.ts`)
  - `npx ts-node scripts/seed-demo.ts`
  - Insert demo docs → trigger parse → trigger analyze

- [ ] **Task 5.5 — Clause Benchmark** (`scripts/benchmark/run-clause-benchmark.ts`)
  - CUAD/LEDGAR samples → run parser → compare to expected → report precision/recall/F1

- [ ] **Task 5.6 — Refusal Benchmark** (`scripts/benchmark/run-refusal-benchmark.ts`)
  - Missing docs → expect `not_evaluated`
  - All docs present → expect `evaluated`
  - Report pass/fail

- [ ] **Task 5.7 — Risk Benchmark** (`scripts/benchmark/run-risk-benchmark.ts`)
  - Expected risks per demo pair → run analysis → compare → report precision/recall/F1

- [ ] **Task 5.8 — CUAD/LEDGAR Samples** (`scripts/extract-cuad-samples.ts`)
  - Extract clause samples from CUAD, classification samples from LEDGAR

- [ ] **Task 5.9 — Expand Legal Corpus** (`lib/legal-corpus/india-acts-index.ts`)
  - Add: Companies Act, Consumer Protection Act, DPDP Act 2023
  - Key sections with summaries

- [ ] **Task 5.10 — README & Demo Script** (`README.md`)
  - Setup: clone → install → .env → prisma → dev
  - Demo walkthrough: upload → view → risks → redline → refusal → audit

## ❌ Do NOT Touch

```
app/api/*
components/*
lib/parser/*, lib/agents/*, lib/risk/*, lib/graph/*, lib/redline/*
lib/db/*
prisma/schema.prisma
```
