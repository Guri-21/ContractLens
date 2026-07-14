# Person 3 — AI + Risk Engine

## Branch

```bash
git switch -c feature/ai-risk-engine
```

## Ownership

```
lib/agents/*
lib/risk/*
lib/graph/*
lib/redline/*
app/api/analyze/route.ts
```

## Files to Implement

```
lib/agents/classify-clause.ts
lib/agents/playbook-check.ts
lib/agents/legal-grounding.ts
lib/agents/index.ts

lib/risk/detect-contradictions.ts
lib/risk/refusal-engine.ts
lib/risk/risk-score.ts
lib/risk/index.ts

lib/graph/build-dependency-graph.ts
lib/graph/detect-cycles.ts
lib/graph/index.ts

lib/redline/generate-redline.ts
lib/redline/diff-words.ts
lib/redline/index.ts
```

## Tasks

- [ ] **Task 3.1 — Clause Classification** (`lib/agents/classify-clause.ts`)
  - Use Claude/LLM to classify clauses into: `payment`, `liability`, `termination`, `arbitration`, `confidentiality`, `SLA`, `penalty`, `governing_law`, `indemnification`, `force_majeure`, `other`
  - Batch classify for efficiency
  - Use `lib/claude.ts` helper

- [ ] **Task 3.2 — Playbook Compliance** (`lib/agents/playbook-check.ts`)
  - Compare clauses against active playbook rules
  - Flag violations with risk level + explanation

- [ ] **Task 3.3 — Legal Grounding** (`lib/agents/legal-grounding.ts`)
  - Match clause types to Indian legal provisions
  - Reference `lib/legal-corpus/india-acts-index.ts`
  - Provide citations (Act, Section, relevance)

- [ ] **Task 3.4 — Contradiction Detection** (`lib/risk/detect-contradictions.ts`)
  - Compare MSA ↔ SOW ↔ Exhibits for conflicts:
    - Payment: 45 vs 30 days
    - Liability: capped vs uncapped
    - Arbitration: Bengaluru vs Mumbai
  - Use LLM for semantic comparison
  - Return severity per contradiction

- [ ] **Task 3.5 — Refusal Engine** (`lib/risk/refusal-engine.ts`)
  - If referenced Exhibit/Schedule/DPA is not uploaded → mark `not_evaluated`
  - Consume `missingReferences` from parser
  - **Key demo:** SOW references Exhibit B, not uploaded → `not_evaluated`

- [ ] **Task 3.6 — Risk Scoring** (`lib/risk/risk-score.ts`)
  - Score 0–100 per clause based on: contradiction severity, playbook violations, missing refs, overrides
  - Map: low (0–25), medium (26–50), high (51–75), critical (76–100)

- [ ] **Task 3.7 — Dependency Graph** (`lib/graph/build-dependency-graph.ts`)
  - Nodes from clauses, edges from references
  - Clause A → Clause B, SOW → MSA, SOW → Exhibit B

- [ ] **Task 3.8 — Cycle Detection** (`lib/graph/detect-cycles.ts`)
  - DFS-based cycle detection
  - Return all cycles (e.g., A → B → C → A)
  - Flag as high risk

- [ ] **Task 3.9 — Redline Generation** (`lib/redline/generate-redline.ts`)
  - LLM suggests improved text for risky clauses
  - Original + suggested + reason

- [ ] **Task 3.10 — Word-Level Diff** (`lib/redline/diff-words.ts`)
  - Word diff: `equal`, `insert`, `delete` segments
  - `renderDiffHtml()` for strikethrough/underline

- [ ] **Task 3.11 — Wire Analyze API** (`app/api/analyze/route.ts`)
  - `POST /api/analyze` — Full pipeline: classify → playbook → contradictions → refusals → score → graph → cycles → redlines

## Output Contract

```ts
type AnalysisResult = {
  risks: RiskFinding[];
  graph: DependencyGraph;        // { nodes, edges }
  redlines: RedlineSuggestion[];
  auditEvents: AuditEntry[];
  refusals: RefusalResult[];
  cycles: string[][];
};
```

## ❌ Do NOT Touch

```
components/*
lib/parser/*
prisma/schema.prisma (unless needed — discuss with Person 1)
```
