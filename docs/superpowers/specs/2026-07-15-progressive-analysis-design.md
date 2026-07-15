# Progressive Fast and Deep Contract Analysis

## Summary

ContractLens will separate document extraction from legal analysis and stream useful results during both phases. A reviewer will see each completed clause as soon as its boundary is confirmed, inspect the extraction, then choose Fast or Deep analysis. The UI will update existing clause rows as classification, refusal checks, playbook findings, contradictions, and redlines complete.

The design preserves the existing final `ClauseDTO[]` and `RiskFindingDTO[]` result while adding an event envelope for partial updates. It does not present incomplete work as a completed legal conclusion.

## Goals

- Offer a reviewer-visible choice between Fast and Deep analysis.
- Return control immediately after upload instead of holding one request open for the entire pipeline.
- Stream clauses, findings, and real progress based on completed work.
- Keep completed clauses visible while later clauses continue processing.
- Preserve exact source evidence, deterministic refusal, and human-review boundaries in both modes.
- Reduce API calls in Fast mode without silently omitting uncertain legal issues.
- Keep the implementation compatible with the current synchronous pipeline functions and final DTOs.

## Non-Goals

- Distributed workers or multi-server event delivery.
- Running multiple jurisdictions in one analysis.
- Replacing a human legal reviewer.
- Claiming that Fast mode is equivalent to Deep mode.
- Streaming partial text from an LLM token by token.

## Reviewer Experience

### Phase 1: Extraction

1. The reviewer uploads one or two supported documents.
2. The backend creates an extraction job and returns an `analysisId` immediately.
3. The reviewer is taken to a live extraction screen.
4. The screen shows page progress and appends completed clauses in document order.
5. Each clause initially has an `Extracted` state. Table and reference indicators appear when present.
6. When extraction finishes, the reviewer can inspect the clause list and start Fast or Deep analysis.

A clause is emitted only when its ending is known. For a normal numbered section, seeing the next valid section heading confirms the previous clause. The final buffered clause is emitted when the document ends. This prevents the UI from showing truncated clauses that later need destructive replacement.

### Phase 2: Analysis

The reviewer selects one mode with a segmented control and starts analysis. The clause list stays visible. Each row advances through stable states:

`Extracted -> Classified -> Checking -> Completed`

A clause with a finding ends in `Completed with findings`. A clause that cannot be safely evaluated ends in `Not evaluated`, with a visible reason. A transient processing failure ends in `Needs retry`; it is never shown as legally clear.

Cross-document contradictions appear when both relevant clauses have been classified and the candidate pair has been verified. The finding links to both exact source clauses.

## Analysis Modes

### Fast

- Use deterministic rules and local models for high-confidence classification.
- Escalate only low-confidence or conflicting classifications to an LLM.
- Use clause type, normalized legal facts, references, and embedding similarity to shortlist contradiction candidates.
- Verify the highest-ranked candidate pairs in batched LLM requests.
- Apply machine-readable playbook rules deterministically and batch only semantic rules for LLM review.
- Generate redlines only when requested by the reviewer.
- Run deterministic evidence and numeric consistency checks on every finding.

Uncertain work is marked for Deep review; Fast mode must not treat skipped or low-confidence work as a clean result.

### Deep

- Perform every Fast-mode check.
- Use a lower confidence threshold for LLM escalation.
- Evaluate a broader contradiction candidate set.
- Run an additional verification pass for high and critical findings.
- Generate redlines automatically for eligible high and critical findings.
- Verify defined terms, amounts, dates, evidence quotes, and cited rule identifiers before publishing each serious finding.

Mode thresholds, candidate limits, and batch sizes are configuration values rather than route-level constants.

## Backend Architecture

### Job API

The analysis API exposes five operations:

```text
POST /api/analyze/jobs
GET  /api/analyze/jobs/{analysisId}
GET  /api/analyze/jobs/{analysisId}/events
POST /api/analyze/jobs/{analysisId}/start
POST /api/analyze/jobs/{analysisId}/cancel
```

`POST /jobs` accepts uploaded document identifiers and starts extraction. `POST /start` accepts `{ "mode": "fast" | "deep" }` after extraction is complete. `GET /events` returns `text/event-stream` over an authenticated fetch request. The JWT is sent as a header; it is never placed in a query string.

### Job Manager

An in-process `AnalysisJobManager` owns active jobs, cancellation flags, event queues, and a bounded event history. This is appropriate for the single-process hackathon prototype. The final clauses, findings, report, and audit actions continue to use the project database.

Each job has one of these states:

```text
queued
extracting
awaiting_analysis
analyzing
completed
completed_with_warnings
failed
cancelled
```

The manager assigns every event a monotonically increasing sequence number. A reconnecting client provides its last sequence number and receives later buffered events. If the requested history is no longer buffered, the client fetches the job snapshot before resuming.

### Streaming Orchestrator

A new orchestration layer wraps the existing pipeline functions and emits events at stable boundaries. It does not put business logic in API routes.

Extraction flow:

```text
parse page -> update page progress -> feed segmentation buffer
-> emit each confirmed clause -> flush final clause -> awaiting_analysis
```

Analysis flow:

```text
classify clauses -> references -> refusal -> playbook
-> cross-document contradictions -> risk score -> redlines -> report
```

Stages may process small batches internally for API efficiency, but they emit a result event for every completed clause or finding.

## Event Contract

All events contain `analysisId`, `sequence`, `timestamp`, and `type`.

```ts
type AnalysisEvent =
  | { type: "job.state"; state: AnalysisJobState }
  | { type: "progress"; phase: "extraction" | "analysis"; stage: string; completed: number; total: number | null }
  | { type: "clause.extracted"; clause: ClauseDTO }
  | { type: "clause.updated"; clause: ClauseDTO; state: ClauseWorkState }
  | { type: "finding.created"; finding: RiskFindingDTO }
  | { type: "finding.updated"; finding: RiskFindingDTO }
  | { type: "report.ready"; report: AnalysisReport }
  | { type: "warning"; code: string; message: string; clauseId?: string }
  | { type: "job.completed"; result: AnalysisResult }
  | { type: "job.failed"; code: string; message: string };
```

The server sends heartbeats as SSE comments, not domain events. Repeated delivery is safe because the client deduplicates by `analysisId + sequence`, clauses by `clause.id`, and findings by `finding.id`.

## Progress Calculation

Progress reflects completed units rather than elapsed time.

- Extraction progress is `pages parsed / total pages`.
- Clauses extracted is shown as a count because the final clause count is unknown until extraction ends.
- Before analysis starts, the backend creates a work plan from the extracted clauses, relevant playbook rules, and contradiction candidates.
- Analysis progress is `completed work units / planned work units`.
- If new work is discovered, the total may increase but completed work never decreases.
- The UI always shows the current stage alongside the percentage and counts.

The two phases have separate progress bars. Extraction reaching 100% does not imply that legal analysis is complete.

## Incremental Segmentation

The existing segmenter will be split into a stateful iterator and a compatibility wrapper:

- The iterator consumes pages in order and maintains a carry-over buffer.
- It recognizes valid section headings while rejecting legal citations, currency, dates, list numbering, and table row numbers as false boundaries.
- It emits immutable clause DTOs only when a boundary is confirmed.
- It preserves page start/end metadata and table data.
- The existing `segment_clauses(...) -> list[dict]` wrapper collects iterator output so current callers and tests continue to work.

## Frontend State

The reviewer workspace stores clauses and findings in normalized maps plus ordered ID arrays. Incoming events upsert records without moving existing rows unexpectedly.

The live view contains:

- Fast/Deep segmented control after extraction.
- Separate extraction and analysis progress.
- Current stage and completed/total counts.
- A stable clause list with per-clause status icons.
- A live activity list for newly completed work.
- Cancel and retry controls.
- A distinct `Not evaluated` treatment with the reason and missing document names when applicable.

The completed result reuses the existing clause viewer, contradiction view, evidence citations, and redline UI.

## Error Handling

- Unsupported or unreadable files fail extraction with a user-actionable message.
- A failed clause-level LLM call emits a warning, marks the clause as needing retry, and allows independent work to continue.
- Missing referenced documents are handled deterministically before dependent legal reasoning and produce `not_evaluated` findings.
- Invalid model JSON is rejected at the boundary and retried once according to mode policy.
- Evidence that is not an exact source substring is rejected and never displayed as verified.
- Cancelling stops scheduling new work, preserves completed results, and records a cancelled audit event.
- A job with some safely completed work and some unresolved work ends as `completed_with_warnings`, not `completed`.

## Verification

Backend tests must cover:

- Clause emission order and page-spanning clauses.
- No premature emission of an incomplete clause.
- Fast and Deep configuration differences.
- Monotonic event sequences and progress counts.
- Event replay and deduplication after reconnect.
- Cancellation and partial-result preservation.
- Deterministic missing-document refusal before LLM work.
- Exact evidence quote enforcement.
- Per-clause failure isolation.
- Existing synchronous pipeline compatibility.

Frontend tests must cover:

- Mode selection and start-analysis behavior.
- Incremental clause insertion and in-place updates.
- Duplicate event handling.
- Extraction and analysis progress remaining distinct.
- Findings appearing before the entire job completes.
- `Not evaluated`, retry, cancellation, and terminal states.

An end-to-end test will upload a sample MSA and SOW, observe clauses during extraction, start each mode, receive at least one finding before completion, confirm a contradiction links both clauses, and verify the final result matches the terminal snapshot.

## Delivery Boundaries

The first implementation supports a single FastAPI process. Deployment must run one backend worker while active streams are in memory. Moving jobs to Redis or a durable queue is a later production concern and does not change the event contract.
