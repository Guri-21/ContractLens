# Person 2 — Document Parser

## Branch

```bash
git switch -c feature/parser
```

## Ownership

```
lib/parser/*
app/api/parse/route.ts
```

## Files to Implement

```
lib/parser/types.ts
lib/parser/extract-text.ts
lib/parser/extract-clauses.ts
lib/parser/extract-tables.ts
lib/parser/extract-references.ts
lib/parser/index.ts
```

## Tasks

- [ ] **Task 2.1 — Text Extraction** (`lib/parser/extract-text.ts`)
  - Accept plain text input
  - Add PDF extraction (pdf-parse or pdfjs-dist)
  - Coordinate with team on `package.json` if adding a package
  - Implement `splitPages()` for page boundaries

- [ ] **Task 2.2 — Clause Extraction** (`lib/parser/extract-clauses.ts`)
  - Detect section numbers: `1.1`, `2.3`, `5(a)`, `Article II`
  - Detect clause titles: `Payment Terms`, `Liability`, `Termination`, `Confidentiality`
  - Handle nested sub-sections (e.g., `2.1.a`, `3(ii)`)
  - Preserve ordering and parent-child relationships
  - Each clause gets a generated ID

- [ ] **Task 2.3 — Table Extraction** (`lib/parser/extract-tables.ts`)
  - Detect markdown-style tables (`| col | col |`)
  - Detect tab/space-aligned tabular data
  - Output as `ExtractedTable` JSON (headers + rows)

- [ ] **Task 2.4 — Reference & Override Detection** (`lib/parser/extract-references.ts`)
  - Detect references: `Section 5`, `Clause 9.2`, `Exhibit B`, `Schedule A`, `Annexure 1`
  - Detect overrides: `notwithstanding`, `subject to`, `except as provided`, `in case of conflict`, `shall prevail`, `takes precedence`
  - Return keyword + surrounding context

- [ ] **Task 2.5 — Wire Parse API** (`app/api/parse/route.ts`)
  - `POST /api/parse` — Accept `{ documentId, content }`, return `ParsedDocument`
  - Call `parseDocument()` from `lib/parser/index.ts`

- [ ] **Task 2.6 — Missing Reference Detection** (`lib/parser/index.ts`)
  - After extracting all references, check which point to missing docs/sections
  - Populate `missingReferences` array

## Output Contract

```ts
type ParsedDocument = {
  documentId: string;
  clauses: ParsedClause[];     // { id, sectionNumber, title, text, page, references, overrides }
  tables: ExtractedTable[];    // { headers, rows, rawText }
  missingReferences: string[]; // ["Exhibit B", "Annexure 1"]
};
```

## ❌ Do NOT Touch

```
components/*
lib/agents/*, lib/risk/*, lib/graph/*, lib/redline/*
prisma/schema.prisma (unless parser needs a field — discuss with Person 1)
```
