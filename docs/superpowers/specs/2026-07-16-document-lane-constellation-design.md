# ContractLens Document-Lane Constellation Design

## Goal

Replace the current fixed-grid dependency graph with a visually distinctive but immediately understandable legal dependency workspace. The graph must help a reviewer answer three questions quickly:

1. Which document and clause does this node represent?
2. Is the clause safe, risky, overridden, contradictory, or not evaluated?
3. Which clauses and evidence explain that status?

The redesign changes presentation and interaction only. It does not change pipeline analysis, DTOs, risk calculation, contradiction detection, or refusal behavior.

## Visual Direction

The graph uses a document-lane constellation. Each source document receives a labeled vertical lane, with MSA clauses positioned before SOW clauses and supporting documents placed in additional lanes. Relationships may cross lanes, making cross-document contradictions visible without losing document context.

The visual language stays inside the existing ContractLens design system:

- Navy and white establish the legal-workspace foundation.
- Gold identifies overrides and governing relationships.
- Light green identifies evaluated clauses without risk.
- Light red identifies risky clauses without making the workspace visually aggressive.
- Muted gray identifies clauses that were not evaluated.
- Newsreader is reserved for document and clause headings.
- Public Sans is used for readable clause content.
- IBM Plex Mono is used for section numbers, metadata, filters, and relationship labels.
- Surfaces use thin borders, restrained shadows, and small corner radii.

## Graph Layout

The graph is organized into document lanes rather than a generic four-column grid.

- Each lane has a persistent header containing document name, document type, clause count, and risk count.
- Clauses are ordered by section number when available and retain source-document order otherwise.
- Nodes use stable dimensions so labels, badges, and selection do not shift the layout.
- Cross-document relationships curve between lanes.
- Same-document relationships remain visually closer to their source lane.
- Empty or single-document analyses still render as a complete lane rather than an incomplete graph.
- The initial viewport fits all nodes while maintaining readable spacing.

No additional graph engine is introduced. Layout is deterministic frontend code based on the existing clauses, references, overrides, and risk findings.

## Clause Nodes

Each custom clause node displays:

- Section number and clause type
- Short clause title or a concise text-derived label
- Source document identifier
- Risk or evaluation badge
- Small inbound and outbound relationship counts

Node states are visually explicit:

- Safe: pale green surface with green status marker
- Risky: pale red surface with risk-level badge
- Override-related: gold accent on the node edge
- Not evaluated: muted gray surface with a refusal label
- Selected: navy outline, stronger elevation, and a visible source anchor
- Dimmed: reduced opacity when another dependency path is focused

Critical and high findings remain distinguishable through badge text and accent strength. Color is never the only status indicator.

## Relationship Language

Every connection has a stable visual meaning:

- Reference: thin dashed slate line labeled `REF`
- Override: solid gold line labeled `OVERRIDES`
- Contradiction: stronger crimson line labeled `CONFLICT`
- Circular dependency: crimson loop treatment with a cycle warning

Contradiction animation is subtle and disabled when reduced-motion is requested. Arrow direction remains visible at every zoom level where labels are shown.

## Interaction Model

Selecting a clause activates focus mode:

- The selected clause and directly connected dependency path remain fully visible.
- Unrelated nodes and edges become subdued.
- The viewport centers the selected relationship cluster.
- The evidence inspector opens with full clause text, source metadata, connected clauses, and associated risk findings.
- Selecting a connected clause moves focus without closing the inspector.
- Clicking the canvas or using `Clear focus` restores the full constellation.

Hovering provides a lightweight preview, but essential evidence is available through keyboard-accessible selection.

## Workspace Controls

A compact toolbar provides:

- Search by clause text, section, title, or document
- Document filter
- Risk-status filter
- Relationship filter for references, overrides, and contradictions
- Fit graph
- Fullscreen graph
- Clear focus

A concise legend stays visible without covering graph content. The existing React Flow zoom controls remain available but are restyled to match ContractLens. A minimap is included only when the graph is large enough to benefit from it.

## Evidence Inspector

The inspector is a stable right-side panel on desktop and a bottom sheet on narrow screens. It contains:

- Clause identity and source location
- Exact original clause text
- Evaluation status and risk explanation
- Evidence quotations with document and section attribution
- Incoming and outgoing relationship lists
- Missing-document refusal details when applicable

The panel does not invent evidence and does not transform exact quotes. It displays the existing pipeline output.

## Responsive Behavior

- Desktop: graph and evidence inspector share the workspace without overlapping.
- Tablet: inspector becomes narrower and the graph toolbar wraps into two compact rows.
- Mobile: document lanes remain horizontally navigable; the inspector opens as a bottom sheet.
- Text truncates only in graph nodes; full text remains available in the inspector.
- All icon controls have accessible labels and tooltips.

## Component Boundaries

The current `DependencyGraph` remains the public entry point and keeps its existing props.

Internal responsibilities are separated into focused modules:

- Graph-model builder: converts DTOs into document lanes, custom nodes, and semantic edges.
- Layout helper: calculates stable lane and node positions.
- Cycle detector: preserves deterministic circular-reference detection.
- Clause node: renders one risk-aware clause card.
- Graph toolbar: owns search and filter controls.
- Evidence inspector: renders selected-clause evidence and relationships.
- Legend: explains node and edge semantics.

Pure transformation logic is testable without rendering React Flow.

## Error And Empty States

- No clauses: show a restrained empty state explaining that extracted clauses are required.
- Clauses without relationships: show document lanes and safe/risk states with a `No dependencies detected` status.
- Broken reference target: retain the source clause and show an unresolved-link warning instead of dropping the relationship silently.
- Missing external document: preserve `not_evaluated` and name the missing document in the inspector.
- Circular reference: display the cycle warning and highlight participating edges.

## Verification

Automated tests cover:

- Stable document grouping and section ordering
- Safe, risky, and not-evaluated node state derivation
- Reference, override, and contradiction edge creation
- Cycle detection
- Search and relationship filtering
- Unresolved references

Final verification includes the frontend test suite, production build, and visual checks at desktop and mobile viewports using representative MSA and SOW analysis data. The graph must remain readable with no overlap between toolbar, nodes, lane headers, controls, legend, and inspector.

## Success Criteria

- A reviewer can identify MSA and SOW clauses without opening node details.
- Safe and risky clauses are distinguishable by both color and text.
- References, overrides, contradictions, and cycles cannot be confused with each other.
- Selecting a clause reveals its complete immediate dependency context and exact evidence.
- The graph remains understandable for single-document and two-document analyses.
- Existing analysis behavior and DTO contracts remain unchanged.
- The implementation builds and passes its graph-model tests.
