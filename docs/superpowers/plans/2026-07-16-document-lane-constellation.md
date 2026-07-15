# Document-Lane Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an understandable, risk-aware MSA/SOW dependency constellation with document lanes, semantic relationships, focus mode, filtering, fullscreen controls, and exact evidence inspection.

**Architecture:** Keep `DependencyGraph` as the public React entry point and preserve its existing `clauses` and `risks` props. Move deterministic graph construction, lane layout, filtering, cycle detection, and focus derivation into pure TypeScript helpers; render those results through React Flow custom nodes and focused UI components.

**Tech Stack:** React 18, TypeScript, React Flow 11, Tailwind CSS, Lucide React, Vitest.

## Global Constraints

- Do not change pipeline analysis, DTO definitions, risk scoring, contradiction detection, or refusal behavior.
- Use existing ContractLens navy, gold, crimson, green, and gray visual tokens.
- Color must never be the only status indicator.
- Preserve exact evidence quotations from `RiskFindingDTO`.
- Respect reduced-motion preferences for animated conflict paths.
- Keep `DependencyGraphProps` compatible with current reviewer and saved-analysis mounts.
- Use stable node dimensions and responsive layouts that do not overlap controls, nodes, lane headers, legend, or inspector.

---

### Task 1: Pure Graph Model And Lane Layout

**Files:**
- Create: `frontend/src/shared-components/dependency-graph/graphModel.ts`
- Create: `frontend/src/shared-components/dependency-graph/graphModel.test.ts`

**Interfaces:**
- Consumes: `ClauseDTO[]`, `RiskFindingDTO[]` from `frontend/src/reviewer-workspace/types.ts`.
- Produces: `buildGraphModel(clauses, risks): GraphModel`, `filterGraphModel(model, filters): GraphModel`, `getFocusedElementIds(model, nodeId): Set<string>`, and typed `ClauseNodeData`, `DocumentLane`, `GraphFilters` values.

- [ ] **Step 1: Write failing graph-model tests**

Create fixtures containing one MSA, one SOW, a safe clause, a risky clause, a missing-document refusal, a reference, an override, a contradiction, and a two-node cycle. Assert that:

```ts
const model = buildGraphModel(clauses, risks);

expect(model.lanes.map(lane => lane.documentType)).toEqual(['MSA', 'SOW']);
expect(model.nodes.find(node => node.id === 'msa-payment')?.data.status).toBe('safe');
expect(model.nodes.find(node => node.id === 'sow-payment')?.data.status).toBe('risk');
expect(model.nodes.find(node => node.id === 'sow-exhibit')?.data.status).toBe('not_evaluated');
expect(model.edges.map(edge => edge.data?.relationship)).toEqual(
  expect.arrayContaining(['reference', 'override', 'conflict']),
);
expect(model.cycleNodeIds).toEqual(expect.arrayContaining(['cycle-a', 'cycle-b']));
```

Add separate tests for section-aware ordering, unresolved references, filtering, and focused-neighbor derivation.

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd frontend && npm test -- src/shared-components/dependency-graph/graphModel.test.ts --run`

Expected: FAIL because `graphModel.ts` and its exports do not exist.

- [ ] **Step 3: Implement graph-model types and builders**

Implement immutable graph construction with these central types:

```ts
export type ClauseVisualStatus = 'safe' | 'risk' | 'not_evaluated';
export type RelationshipType = 'reference' | 'override' | 'conflict' | 'unresolved';

export interface ClauseNodeData {
  clause: ClauseDTO;
  risks: RiskFindingDTO[];
  status: ClauseVisualStatus;
  highestRisk?: RiskFindingDTO['riskLevel'];
  incomingCount: number;
  outgoingCount: number;
  hasOverride: boolean;
  inCycle: boolean;
}

export interface DocumentLane {
  id: string;
  documentId: string;
  documentName: string;
  documentType: ClauseDTO['documentType'];
  clauseCount: number;
  riskCount: number;
  x: number;
  width: number;
}
```

Use a `Map` for clause/risk lookup, numeric-aware section sorting, deterministic lane positions, and DFS that returns participating cycle node IDs rather than a boolean only. Build unresolved edges for missing targets and retain the source clause.

- [ ] **Step 4: Run graph-model tests and verify GREEN**

Run: `cd frontend && npm test -- src/shared-components/dependency-graph/graphModel.test.ts --run`

Expected: all graph-model tests pass.

- [ ] **Step 5: Commit the graph model**

```powershell
git add frontend/src/shared-components/dependency-graph/graphModel.ts frontend/src/shared-components/dependency-graph/graphModel.test.ts
git commit -m "feat: add document-lane graph model"
```

### Task 2: Custom Clause Nodes And Evidence Inspector

**Files:**
- Create: `frontend/src/shared-components/dependency-graph/ClauseNode.tsx`
- Create: `frontend/src/shared-components/dependency-graph/EvidenceInspector.tsx`
- Create: `frontend/src/shared-components/dependency-graph/GraphLegend.tsx`
- Modify: `frontend/src/shared-components/DependencyGraph.tsx`

**Interfaces:**
- Consumes: `ClauseNodeData`, selected `ClauseDTO`, selected risks, incoming/outgoing graph edges.
- Produces: React Flow node type `clause`, accessible evidence panel, semantic legend.

- [ ] **Step 1: Add a failing rendering-contract test**

Add `frontend/src/shared-components/dependency-graph/graphPresentation.test.tsx` with React DOM server rendering assertions. Verify safe/risk/refusal labels, clause section, document label, exact evidence quote, and missing-document name are present in rendered markup.

- [ ] **Step 2: Run the presentation test and verify RED**

Run: `cd frontend && npm test -- src/shared-components/dependency-graph/graphPresentation.test.tsx --run`

Expected: FAIL because the custom node and inspector modules do not exist.

- [ ] **Step 3: Implement the custom clause node**

Render a stable `272px` wide node with React Flow target/source handles, a section and document header, concise title, status badge, relationship counts, and text preview. Derive visual classes from `ClauseNodeData.status`, `highestRisk`, `hasOverride`, `inCycle`, `selected`, and `dimmed`. Use text labels alongside color.

- [ ] **Step 4: Implement the evidence inspector and legend**

Render exact clause text, page/section metadata, every risk reason, exact evidence quotes, missing documents, and linked-clause buttons. Use an accessible close button, headings, and a desktop side panel/mobile bottom-sheet layout. Render semantic samples for `REF`, `OVERRIDES`, `CONFLICT`, and circular paths.

- [ ] **Step 5: Wire custom nodes and semantic edges into React Flow**

Register `nodeTypes={{ clause: ClauseNode }}` outside the component, use `smoothstep` for same-document paths and curved default paths for cross-document links, disable conflict animation under reduced motion, and preserve directional arrow markers.

- [ ] **Step 6: Run presentation and model tests**

Run: `cd frontend && npm test -- src/shared-components/dependency-graph --run`

Expected: all dependency-graph tests pass.

- [ ] **Step 7: Commit the presentation layer**

```powershell
git add frontend/src/shared-components/DependencyGraph.tsx frontend/src/shared-components/dependency-graph
git commit -m "feat: render risk-aware dependency constellation"
```

### Task 3: Toolbar, Focus Mode, Lane Headers, And Responsive Workspace

**Files:**
- Create: `frontend/src/shared-components/dependency-graph/GraphToolbar.tsx`
- Create: `frontend/src/shared-components/dependency-graph/DocumentLaneHeaders.tsx`
- Modify: `frontend/src/shared-components/DependencyGraph.tsx`
- Modify: `frontend/src/reviewer-workspace/ReviewerWorkspace.tsx`

**Interfaces:**
- Consumes: `GraphFilters`, document lane metadata, React Flow instance methods, selected node ID.
- Produces: search/filter state, fullscreen state, lane headers, focused nodes/edges, and fit/reset actions.

- [ ] **Step 1: Write failing filter and focus tests**

Extend `graphModel.test.ts` to verify case-insensitive search across text/title/section/document, status filtering, relationship filtering, document filtering, and a focused set containing the selected node plus immediate incoming/outgoing neighbors.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend && npm test -- src/shared-components/dependency-graph/graphModel.test.ts --run`

Expected: new filtering/focus assertions fail until the helper behavior is complete.

- [ ] **Step 3: Implement the graph toolbar**

Use a search input, native/select menu controls for document, risk status, and relationship type, plus Lucide icon buttons with tooltips for fit graph, clear focus, and fullscreen. Display active filter count and a clear-filters command.

- [ ] **Step 4: Implement focus-mode derivation**

When a node is selected, set `dimmed: true` on unrelated node data and reduce unrelated edge opacity. Center the selected cluster using the React Flow instance. Canvas click and `Clear focus` restore the full graph.

- [ ] **Step 5: Implement document-lane headers and responsive shell**

Render lane headers positioned from the same lane coordinates as graph nodes. Include document type, shortened filename, clause count, and risk count. Make the graph shell fullscreen-capable, let the toolbar wrap on tablet, and render the inspector as an overlay/bottom sheet below desktop width.

- [ ] **Step 6: Simplify the reviewer graph tab chrome**

Remove the duplicated outer graph legend from `ReviewerWorkspace.tsx`, allow the graph component to own its complete visual shell, and retain the graph tab heading and existing tab behavior.

- [ ] **Step 7: Run dependency-graph tests and frontend build**

Run: `cd frontend && npm test -- src/shared-components/dependency-graph --run`

Expected: all dependency-graph tests pass.

Run: `cd frontend && npm run build`

Expected: TypeScript and Vite complete with exit code 0.

- [ ] **Step 8: Commit the completed interaction layer**

```powershell
git add frontend/src/shared-components frontend/src/reviewer-workspace/ReviewerWorkspace.tsx
git commit -m "feat: add dependency graph focus workspace"
```

### Task 4: Browser Verification And Accessibility Polish

**Files:**
- Modify only files from Tasks 2-3 when verification reveals a concrete defect.

**Interfaces:**
- Consumes: running ContractLens frontend with representative saved analysis.
- Produces: verified desktop/mobile graph behavior.

- [ ] **Step 1: Start the frontend and backend if required**

Run the existing local services and open the legal advisor saved-analysis or review workspace graph tab.

- [ ] **Step 2: Verify desktop presentation**

At approximately `1440x900`, confirm MSA/SOW lane identity, readable nodes, semantic edges, no overlap, selection focus, evidence inspector, filters, fit graph, and fullscreen behavior.

- [ ] **Step 3: Verify mobile presentation**

At approximately `390x844`, confirm toolbar wrapping, horizontally navigable lanes, touch-size controls, bottom-sheet inspector, and absence of text/control overlap.

- [ ] **Step 4: Verify keyboard and reduced-motion behavior**

Confirm focus-visible controls, accessible labels/tooltips, keyboard selection/close flow, and no animated conflict pulse when reduced motion is enabled.

- [ ] **Step 5: Run final verification**

Run: `cd frontend && npm test -- --run`

Expected: all frontend tests pass.

Run: `cd frontend && npm run build`

Expected: production build exits 0.

- [ ] **Step 6: Commit verification fixes if any**

```powershell
git add frontend/src/shared-components frontend/src/reviewer-workspace/ReviewerWorkspace.tsx
git commit -m "fix: polish dependency graph responsiveness"
```
