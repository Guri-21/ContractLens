# Progressive Fast and Deep Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-selectable Fast and Deep contract analysis with live extraction, per-clause progress, early findings, cancellation, reconnection, and a compatible final analysis result.

**Architecture:** A single-process `AnalysisJobManager` owns active job state and a bounded SSE event history. A streaming orchestrator wraps the existing pipeline stages, emits immutable clause/finding updates, and preserves `run_analysis_pipeline(...)` for existing callers. The React reviewer workspace uses authenticated fetch streaming, a normalized reducer, and the existing clause/finding views.

**Tech Stack:** FastAPI, Starlette `StreamingResponse`, Pydantic, Prisma Python, Python `unittest`, React 18, TypeScript, React Router, Vitest, Testing Library, MSW, `eventsource-parser`.

## Global Constraints

- Do not commit implementation changes until backend tests, frontend tests, frontend build, and the live MSA/SOW smoke test pass and the user approves the diff.
- Preserve `run_analysis_pipeline(documents, playbook_rules, country_code) -> dict` and its final `{clauses, findings, riskScore, report}` shape.
- Preserve all current `/api/analyze`, `/api/analyze/run`, and document upload endpoints.
- Use JWT authorization headers for job and stream requests; never put credentials in query strings.
- Active streams support one FastAPI process for this prototype.
- Both modes enforce deterministic missing-document refusal and exact source-evidence checks.
- Fast uncertainty is visible as unresolved work, never as a clean legal conclusion.
- API routes validate and delegate; pipeline and job business logic remains outside route functions.

---

## File Structure

**Backend files to create**

- `backend/app/analysis_schemas.py`: job, mode, state, snapshot, progress, and event models.
- `backend/app/analysis_jobs.py`: in-memory jobs, ownership, sequencing, replay, cancellation, and waits.
- `backend/app/analysis_persistence.py`: one persistence path for clauses/findings/final document status.
- `backend/pipeline/streaming_orchestrator.py`: extraction and mode-aware analysis event orchestration.
- `backend/tests/test_analysis_jobs.py`: job state/event unit tests.
- `backend/tests/test_streaming_orchestrator.py`: extraction/analysis flow and failure isolation.
- `backend/tests/test_analyze_jobs_api.py`: authenticated job and SSE API tests.
- `backend/tests/test_pipeline_compatibility.py`: legacy result compatibility.
- `backend/tests/test_analysis_modes.py`: Fast/Deep policy tests.

**Backend files to modify**

- `backend/app/api/analyze.py`: expose job lifecycle and streaming routes; keep existing routes.
- `backend/app/api/documents.py`: call shared persistence instead of duplicate persistence code.
- `backend/pipeline/step01_parse.py`: add page iterator and retain list-returning wrapper.
- `backend/pipeline/step02_segment.py`: add stateful page-fed segmenter and retain list-returning wrapper.
- `backend/pipeline/config.py`: define immutable Fast/Deep policies.
- `backend/pipeline/run_pipeline.py`: share ordered stage helpers without changing public signature.
- `backend/tests/test_step02_segment.py`: page-spanning and emission-boundary tests.
- `backend/requirements.txt`: add `httpx` for API tests.

**Frontend files to create**

- `frontend/src/reviewer-workspace/analysis-state.ts`: normalized state and event reducer.
- `frontend/src/reviewer-workspace/analysis-state.test.ts`: reducer and deduplication tests.
- `frontend/src/reviewer-workspace/useProgressiveAnalysis.ts`: snapshot, stream, reconnect, start, and cancel lifecycle.
- `frontend/src/reviewer-workspace/components/LiveAnalysisWorkspace.tsx`: live extraction/analysis composition.
- `frontend/src/reviewer-workspace/components/AnalysisModeControl.tsx`: Fast/Deep segmented control.
- `frontend/src/reviewer-workspace/components/PhaseProgress.tsx`: stable extraction and analysis progress.
- `frontend/src/reviewer-workspace/components/ClauseWorkStatus.tsx`: per-clause status icon and label.
- `frontend/src/reviewer-workspace/components/AnalysisActivity.tsx`: bounded live event activity.
- `frontend/src/reviewer-workspace/components/LiveAnalysisWorkspace.test.tsx`: mode and progressive UI tests.
- `frontend/src/api/analyze.test.ts`: authenticated SSE parsing/API tests.
- `frontend/src/test/setup.ts`: DOM test setup.

**Frontend files to modify**

- `frontend/src/lib/types.ts`: canonical DTO, job, event, and snapshot contracts.
- `frontend/src/reviewer-workspace/types.ts`: re-export canonical types.
- `frontend/src/api/client.ts`: environment base URL, JWT headers, typed fetch helper.
- `frontend/src/api/analyze.ts`: job and stream client functions.
- `frontend/src/reviewer-workspace/ReviewerWorkspace.tsx`: route-driven upload/live/result shell.
- `frontend/src/reviewer-workspace/components/UploadFlow.tsx`: create extraction job instead of waiting on synchronous analysis.
- `frontend/src/reviewer-workspace/components/ClauseViewer.tsx`: accept clause work states and avoid premature clean conclusions.
- `frontend/src/App.tsx`: add `/legal/workspace/:analysisId`.
- `frontend/vite.config.ts`: Vitest configuration.
- `frontend/package.json`: test scripts and test/stream dependencies.

---

### Task 1: Define Job Contracts and In-Memory Job Manager

**Files:**
- Create: `backend/app/analysis_schemas.py`
- Create: `backend/app/analysis_jobs.py`
- Create: `backend/tests/test_analysis_jobs.py`

**Interfaces:**
- Produces: `AnalysisMode`, `AnalysisJobState`, `ClauseWorkState`, `AnalysisEvent`, `AnalysisProgress`, `AnalysisJobSnapshot`, `CreateAnalysisJobRequest`, `CreateAnalysisJobResponse`, `StartAnalysisJobRequest`, and `RetryAnalysisJobRequest`.
- Produces: `AnalysisJobManager.create(...)`, `get_owned(...)`, `publish(...)`, `snapshot(...)`, `events_after(...)`, `wait_for_events(...)`, and `cancel(...)`.

- [ ] **Step 1: Write failing sequence, replay, ownership, and cancellation tests**

```python
class AnalysisJobManagerTests(unittest.IsolatedAsyncioTestCase):
    async def test_publish_assigns_monotonic_sequences_and_replays(self):
        manager = AnalysisJobManager(history_limit=10)
        job = await manager.create("user-1", ["doc-1"], None, "IN")
        first = await manager.publish(job.id, "job.state", {"state": "extracting"})
        second = await manager.publish(job.id, "progress", {"phase": "extraction", "stage": "parse", "completed": 1, "total": 2})
        self.assertEqual((first.sequence, second.sequence), (1, 2))
        self.assertEqual([event.sequence for event in await manager.events_after(job.id, 1)], [2])

    async def test_get_owned_rejects_another_user(self):
        manager = AnalysisJobManager()
        job = await manager.create("user-1", ["doc-1"], None, "IN")
        with self.assertRaises(AnalysisJobAccessError):
            await manager.get_owned(job.id, "user-2")

    async def test_cancel_sets_flag_and_terminal_state(self):
        manager = AnalysisJobManager()
        job = await manager.create("user-1", ["doc-1"], None, "IN")
        snapshot = await manager.cancel(job.id, "user-1")
        self.assertTrue(await manager.is_cancelled(job.id))
        self.assertEqual(snapshot.state, AnalysisJobState.CANCELLED)
```

- [ ] **Step 2: Run the focused test and confirm the imports fail**

Run: `cd backend; python -m unittest tests.test_analysis_jobs -v`

Expected: `ModuleNotFoundError` for `app.analysis_jobs` or missing contract symbols.

- [ ] **Step 3: Implement typed contracts and manager**

Use string enums with exact wire values from the design. `AnalysisEvent` has this stable envelope:

```python
class AnalysisEvent(BaseModel):
    analysisId: str
    sequence: int
    timestamp: datetime
    type: Literal["job.state", "progress", "clause.extracted", "clause.updated", "finding.created", "finding.updated", "report.ready", "warning", "job.completed", "job.failed"]
    payload: dict[str, Any]
```

Store events in `deque(maxlen=history_limit)`. Protect job mutation with one `asyncio.Lock`; use one `asyncio.Condition` to wake stream consumers after publish or cancellation. Return model copies from snapshots so callers cannot mutate manager state.

- [ ] **Step 4: Run the job-manager tests**

Run: `cd backend; python -m unittest tests.test_analysis_jobs -v`

Expected: all tests pass and sequences begin at `1`.

- [ ] **Step 5: Inspect without committing**

Run: `git diff --check; git status --short`

Expected: only the three Task 1 files are new; no commit is created.

---

### Task 2: Stream Pages and Confirmed Clauses Without Breaking Batch Parsing

**Files:**
- Modify: `backend/pipeline/step01_parse.py`
- Modify: `backend/pipeline/step02_segment.py`
- Modify: `backend/tests/test_step02_segment.py`

**Interfaces:**
- Produces: `iter_document_pages(file_path: str) -> Iterator[dict]` where every page has `page`, `text`, and `tables`.
- Preserves: `parse_document(file_path: str) -> list[dict]` as `list(iter_document_pages(file_path))`.
- Produces: `ClauseSegmentationIterator(document_id, document_name, document_type)`, `feed_page(page) -> list[dict]`, and `flush() -> list[dict]`.
- Preserves: `segment_clauses(...) -> list[dict]` by collecting the iterator output.

- [ ] **Step 1: Add failing page-boundary tests**

```python
def test_streaming_segmenter_waits_for_confirmed_boundary(self):
    stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")
    self.assertEqual(stream.feed_page({"page": 1, "text": "1. Payment\nCustomer shall pay", "tables": []}), [])
    emitted = stream.feed_page({"page": 2, "text": "within 30 days.\n2. Termination\nEither party may terminate.", "tables": []})
    self.assertEqual(len(emitted), 1)
    self.assertEqual(emitted[0]["sectionNumber"], "1")
    self.assertIn("within 30 days", emitted[0]["text"])
    self.assertEqual(stream.flush()[0]["sectionNumber"], "2")

def test_batch_wrapper_matches_streaming_output(self):
    pages = [
        {"page": 1, "text": "1. Payment\nCustomer shall pay", "tables": []},
        {"page": 2, "text": "within 30 days.\n2. Termination\nEither party may terminate.", "tables": []},
    ]
    batch = segment_clauses(pages, "d1", "MSA.txt", "MSA")
    stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")
    incremental = [clause for page in pages for clause in stream.feed_page(page)] + stream.flush()
    self.assertEqual(batch, incremental)
```

- [ ] **Step 2: Run segmentation tests and confirm failure**

Run: `cd backend; python -m unittest tests.test_step02_segment -v`

Expected: missing `ClauseSegmentationIterator` and page iterator behavior.

- [ ] **Step 3: Implement page iteration and stateful segmentation**

Move each supported parser's page loop into `iter_document_pages`. Keep one pending clause buffer containing section metadata, text fragments, first page, latest page, and collected tables. Reuse the existing heading validation, citation rejection, title parsing, and DTO conversion helpers. Emit a new dictionary rather than mutating previously emitted clauses.

- [ ] **Step 4: Run focused and full backend tests**

Run: `cd backend; python -m unittest tests.test_step02_segment -v; python -m unittest discover -s tests`

Expected: streaming tests and all pre-existing tests pass.

- [ ] **Step 5: Inspect without committing**

Run: `git diff --check; git status --short`

Expected: Task 1 and Task 2 changes remain uncommitted.

---

### Task 3: Add Fast/Deep Policies and Streaming Orchestration

**Files:**
- Modify: `backend/pipeline/config.py`
- Create: `backend/pipeline/streaming_orchestrator.py`
- Modify: `backend/pipeline/run_pipeline.py`
- Create: `backend/tests/test_analysis_modes.py`
- Create: `backend/tests/test_streaming_orchestrator.py`
- Create: `backend/tests/test_pipeline_compatibility.py`

**Interfaces:**
- Produces: frozen `ModePolicy` with `classificationBatchSize`, `classifyOtherWithLlm`, `maxContradictionPairs`, `contradictionBatchSize`, `semanticRuleBatchSize`, `autoRedlines`, `verifyHighRisk`, and `maxRetries`.
- Produces: `get_mode_policy(mode: AnalysisMode) -> ModePolicy`.
- Produces: `StreamingAnalysisOrchestrator.extract(job_id, documents)` and `analyze(job_id, mode, playbook_rules)`.
- Produces: `PipelineStages` containing injectable `parse_pages`, `segment_factory`, `classify_batch`, `references`, `refusal`, `playbook`, `contradictions`, `risk`, `redlines`, `verify_findings`, and `report` callables.
- Preserves: synchronous pipeline signature and final result.

- [ ] **Step 1: Write failing mode-policy tests**

```python
class AnalysisModeTests(unittest.TestCase):
    def test_fast_uses_smaller_candidate_set_and_manual_redlines(self):
        fast = get_mode_policy(AnalysisMode.FAST)
        deep = get_mode_policy(AnalysisMode.DEEP)
        self.assertLess(fast.maxContradictionPairs, deep.maxContradictionPairs)
        self.assertFalse(fast.autoRedlines)
        self.assertTrue(deep.autoRedlines)
        self.assertFalse(fast.verifyHighRisk)
        self.assertTrue(deep.verifyHighRisk)
```

- [ ] **Step 2: Write failing orchestrator tests using injected stage functions**

```python
class FakeSegmenter:
    def feed_page(self, page):
        return page.get("clauses", [])

    def flush(self):
        return []


def fake_document():
    return {"id": "d1", "name": "MSA.txt", "type": "MSA", "file_path": "unused.txt"}


def fake_stages(classification_error_for=frozenset()):
    def classify_batch(clauses, policy):
        if any(clause["id"] in classification_error_for for clause in clauses):
            raise ClauseBatchError(failed_clause_ids=set(classification_error_for))
        return [{**clause, "clauseType": "payment"} for clause in clauses]

    return PipelineStages(
        parse_pages=lambda _path: iter([{"page": 1, "text": "", "tables": [], "clauses": [{"id": "c1", "documentId": "d1", "text": "Pay in 30 days", "references": [], "overrides": []}, {"id": "c2", "documentId": "d1", "text": "Exhibit B applies", "references": [], "overrides": []}]}]),
        segment_factory=lambda _document: FakeSegmenter(),
        classify_batch=classify_batch,
        references=lambda clauses: clauses,
        refusal=lambda clauses, names: [],
        playbook=lambda clauses, rules: [],
        contradictions=lambda left, right, policy: [],
        risk=lambda findings: {"overallScore": 0, "breakdown": {}},
        redlines=lambda findings, clauses: findings,
        verify_findings=lambda findings, clauses: findings,
        report=lambda clauses, findings, score, names: {"findings": findings},
    )


async def test_extraction_emits_each_clause_before_awaiting_analysis(self):
    manager = AnalysisJobManager()
    job = await manager.create("u1", ["d1"], None, "IN")
    orchestrator = StreamingAnalysisOrchestrator(manager, stages=fake_stages())
    await orchestrator.extract(job.id, [fake_document()])
    events = await manager.events_after(job.id, 0)
    types = [event.type for event in events]
    self.assertIn("clause.extracted", types)
    self.assertEqual(types[-1], "job.state")
    self.assertEqual(events[-1].payload["state"], "awaiting_analysis")

async def test_clause_failure_becomes_warning_not_clean_result(self):
    stages = fake_stages(classification_error_for={"c2"})
    manager = AnalysisJobManager()
    job = await manager.create("u1", ["d1"], None, "IN")
    orchestrator = StreamingAnalysisOrchestrator(manager, stages=stages)
    await orchestrator.extract(job.id, [fake_document()])
    await orchestrator.analyze(job.id, AnalysisMode.FAST, [])
    snapshot = await manager.snapshot(job.id)
    self.assertEqual(snapshot.state, AnalysisJobState.COMPLETED_WITH_WARNINGS)
    self.assertEqual(snapshot.clauseStates["c2"], ClauseWorkState.NEEDS_RETRY)
```

- [ ] **Step 3: Implement policies and orchestrator**

Extraction emits page progress and `clause.extracted`. Analysis builds its total work count after classification and candidate generation, processes configurable batches, then emits one `clause.updated` or finding event per completed item. Run refusal before any dependent contradiction reasoning. Check cancellation before scheduling every batch.

Deep mode runs high/critical verification and automatic redlines. Fast mode keeps eligible findings without redlines and marks low-confidence unresolved work with warnings. Both modes run exact-evidence validation before publishing findings.

- [ ] **Step 4: Refactor shared synchronous stage ordering**

Extract private helpers from `run_pipeline.py` for document preprocessing and finding evaluation. Keep the public function unchanged. Add a compatibility test asserting keys and DTO identity fields for the shared sample MSA/SOW.

- [ ] **Step 5: Run mode, orchestrator, compatibility, and complete backend tests**

Run: `cd backend; python -m unittest tests.test_analysis_modes tests.test_streaming_orchestrator tests.test_pipeline_compatibility -v; python -m unittest discover -s tests`

Expected: focused and full suites pass with no network calls because injected fakes own LLM stages.

---

### Task 4: Add Shared Persistence and Authenticated Job/SSE Routes

**Files:**
- Create: `backend/app/analysis_persistence.py`
- Modify: `backend/app/api/analyze.py`
- Modify: `backend/app/api/documents.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_analyze_jobs_api.py`

**Interfaces:**
- Produces: `persist_analysis_result(db, document_ids: list[str], result: dict) -> None`.
- Produces routes: `POST /api/analyze/jobs`, `GET /api/analyze/jobs/{analysis_id}`, `GET /api/analyze/jobs/{analysis_id}/events`, `POST /api/analyze/jobs/{analysis_id}/start`, `POST /api/analyze/jobs/{analysis_id}/retry`, `POST /api/analyze/jobs/{analysis_id}/findings/{finding_id}/redline`, and `POST /api/analyze/jobs/{analysis_id}/cancel`.
- Consumes: `get_current_user`, `AnalysisJobManager`, and `StreamingAnalysisOrchestrator`.

- [ ] **Step 1: Add `httpx` and write failing API tests**

Use `TestClient`, override `get_current_user`, and replace the router's manager/orchestrator with fakes. Cover job ownership, valid state transitions, `Authorization` handling, `Last-Event-ID`, SSE `id/event/data` formatting, start-before-extraction rejection, retrying unresolved clause IDs, on-demand redline updates, and cancellation.

```python
def test_sse_replays_only_events_after_last_event_id(self):
    response = client.get(
        f"/api/analyze/jobs/{job_id}/events",
        headers={"Authorization": "Bearer test", "Last-Event-ID": "1"},
    )
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.headers["content-type"].split(";")[0], "text/event-stream")
    self.assertNotIn("id: 1\n", response.text)
    self.assertIn("id: 2\n", response.text)
```

- [ ] **Step 2: Run API tests and confirm missing routes**

Run: `cd backend; python -m unittest tests.test_analyze_jobs_api -v`

Expected: 404 responses or missing job-route symbols.

- [ ] **Step 3: Extract persistence and implement thin routes**

Move `_clause_db_payload`, `_finding_db_payload`, and final replacement logic into `analysis_persistence.py`. Both existing analysis paths call this function. New routes validate ownership and state, schedule orchestrator coroutines with `asyncio.create_task`, and format events with `StreamingResponse`.

The SSE generator sends buffered events first, waits on the manager condition, emits `: heartbeat\n\n` on timeout, and exits on terminal state after all terminal events are delivered.

- [ ] **Step 4: Run API and complete backend tests**

Run: `cd backend; python -m unittest tests.test_analyze_jobs_api -v; python -m unittest discover -s tests`

Expected: all tests pass; existing synchronous routes remain covered by compatibility tests.

- [ ] **Step 5: Inspect without committing**

Run: `git diff --check; git status --short`

Expected: backend implementation and tests remain uncommitted.

---

### Task 5: Add Frontend Contracts, SSE Client, and Normalized Reducer

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/reviewer-workspace/types.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/analyze.ts`
- Create: `frontend/src/reviewer-workspace/analysis-state.ts`
- Create: `frontend/src/reviewer-workspace/analysis-state.test.ts`
- Create: `frontend/src/api/analyze.test.ts`
- Create: `frontend/src/test/setup.ts`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces canonical TypeScript equivalents of all backend job/event models.
- Produces `createAnalysisJob`, `getAnalysisJob`, `streamAnalysisEvents`, `startAnalysisJob`, `retryAnalysisJob`, `generateFindingRedline`, and `cancelAnalysisJob`.
- Produces `analysisReducer(state, event)` with sequence deduplication and immutable upserts.

- [ ] **Step 1: Install declared test and SSE dependencies**

Run: `cd frontend; npm install eventsource-parser; npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw`

Expected: `package.json` and lockfile update without peer dependency errors.

- [ ] **Step 2: Write failing reducer tests**

```typescript
const clause = (id: string): ClauseDTO => ({
  id,
  documentId: "d1",
  documentName: "MSA.txt",
  documentType: "MSA",
  sectionNumber: "1",
  title: "Payment",
  text: "Customer shall pay within 30 days.",
  references: [],
  overrides: [],
});

const event = (sequence: number, type: AnalysisEvent["type"], payload: Record<string, unknown>): AnalysisEvent => ({
  analysisId: "a1",
  sequence,
  timestamp: "2026-07-15T00:00:00Z",
  type,
  payload,
});

it("inserts clauses once and updates them in place", () => {
  const extracted = event(1, "clause.extracted", { clause: clause("c1") });
  const updated = event(2, "clause.updated", { clause: { ...clause("c1"), clauseType: "payment" }, state: "completed" });
  const duplicate = event(2, "clause.updated", { clause: clause("c1"), state: "checking" });
  const state = [extracted, updated, duplicate].reduce(analysisReducer, initialAnalysisState("a1"));
  expect(state.clauseIds).toEqual(["c1"]);
  expect(state.clausesById.c1.clauseType).toBe("payment");
  expect(state.clauseStates.c1).toBe("completed");
});
```

- [ ] **Step 3: Write failing API/SSE tests**

Mock `fetch` with a `ReadableStream`. Assert bearer headers, `Last-Event-ID`, comment heartbeat handling, split SSE chunks, event parsing, abort behavior, and non-2xx error propagation.

- [ ] **Step 4: Implement canonical types, typed fetch, stream parser, and reducer**

Use `VITE_API_BASE_URL ?? "http://localhost:8000"`. Keep the JWT in the existing auth storage location and expose it through `getAuthHeaders()`. Parse SSE with `eventsource-parser`; do not use native `EventSource`.

Add these scripts and Vitest settings:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

```typescript
test: {
  environment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
  restoreMocks: true,
}
```

Normalized state contains `clausesById`, `clauseIds`, `findingsById`, `findingIds`, `clauseStates`, two progress objects, bounded activity, warnings, report, job state, and `lastSequence`.

- [ ] **Step 5: Run frontend unit tests and type/build checks**

Run: `cd frontend; npm test -- --run; npm run build`

Expected: reducer/API tests pass and Vite production build succeeds.

---

### Task 6: Build the Live Analysis Hook and Workspace Components

**Files:**
- Create: `frontend/src/reviewer-workspace/useProgressiveAnalysis.ts`
- Create: `frontend/src/reviewer-workspace/components/LiveAnalysisWorkspace.tsx`
- Create: `frontend/src/reviewer-workspace/components/AnalysisModeControl.tsx`
- Create: `frontend/src/reviewer-workspace/components/PhaseProgress.tsx`
- Create: `frontend/src/reviewer-workspace/components/ClauseWorkStatus.tsx`
- Create: `frontend/src/reviewer-workspace/components/AnalysisActivity.tsx`
- Create: `frontend/src/reviewer-workspace/components/LiveAnalysisWorkspace.test.tsx`
- Modify: `frontend/src/reviewer-workspace/components/ClauseViewer.tsx`

**Interfaces:**
- Produces: `useProgressiveAnalysis(analysisId)` returning `{state, mode, setMode, start, retry, generateRedline, cancel, reconnecting, error}`.
- Produces: `<LiveAnalysisWorkspace analysisId={string} />`.
- Consumes: reducer and API functions from Task 5.

- [ ] **Step 1: Write failing component tests**

Test that extraction progress and emitted clauses render before completion; mode control appears only in `awaiting_analysis`; Start calls the selected mode; findings appear before `job.completed`; analysis progress is separate; retry calls unresolved clause IDs; Fast mode can request one redline; cancellation and `not_evaluated` remain visible.

```typescript
let mockState = initialAnalysisState("a1");

vi.mock("../useProgressiveAnalysis", () => ({
  useProgressiveAnalysis: () => ({
    state: mockState,
    mode: "fast",
    setMode: vi.fn(),
    start: vi.fn(),
    retry: vi.fn(),
    generateRedline: vi.fn(),
    cancel: vi.fn(),
    reconnecting: false,
    error: null,
  }),
}));

const liveClause: ClauseDTO = {
  id: "c1",
  documentId: "d1",
  documentName: "MSA.txt",
  documentType: "MSA",
  sectionNumber: "1",
  title: "Payment",
  text: "Customer shall pay within 30 days.",
  references: [],
  overrides: [],
};

it("shows a completed clause while extraction continues", async () => {
  mockState = analysisReducer(mockState, { analysisId: "a1", sequence: 1, timestamp: "2026-07-15T00:00:00Z", type: "progress", payload: { phase: "extraction", stage: "parse", completed: 1, total: 3 } });
  mockState = analysisReducer(mockState, { analysisId: "a1", sequence: 2, timestamp: "2026-07-15T00:00:01Z", type: "clause.extracted", payload: { clause: liveClause } });
  render(<LiveAnalysisWorkspace analysisId="a1" />);
  expect(await screen.findByText("1. Payment")).toBeVisible();
  expect(screen.getByText("1 of 3 pages")).toBeVisible();
  expect(screen.queryByText("Analysis completed")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Implement stream lifecycle hook**

Fetch snapshot first, connect from `snapshot.lastSequence`, abort on unmount, reconnect with bounded backoff while the job is non-terminal, and dispatch every event through the reducer. Do not reconnect after cancellation, failure, or completion.

- [ ] **Step 3: Implement stable live components**

Use Lucide icons for status and actions, tooltips for unfamiliar status icons, a segmented Fast/Deep control, and stable row dimensions. Keep the clause list visible during analysis. Activity is a concise rolling list, not decorative bubbles that resize the layout.

- [ ] **Step 4: Make ClauseViewer progress-aware**

Accept `clauseStates`. Select the first clause when the first ID arrives. Replace premature “No risks detected” text with `Analysis pending` until the clause reaches a terminal work state.

- [ ] **Step 5: Run focused tests and build**

Run: `cd frontend; npm test -- --run LiveAnalysisWorkspace; npm test -- --run; npm run build`

Expected: live workspace tests, all unit tests, and build pass.

---

### Task 7: Connect Upload, Routing, and Existing Result Views

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/reviewer-workspace/ReviewerWorkspace.tsx`
- Modify: `frontend/src/reviewer-workspace/components/UploadFlow.tsx`

**Interfaces:**
- `/legal/workspace` remains upload/configuration.
- `/legal/workspace/:analysisId` renders `LiveAnalysisWorkspace`.
- `UploadFlow` produces an `analysisId` after uploads and job creation.

- [ ] **Step 1: Add a failing routing/upload test**

Render the router at `/legal/workspace`, upload two mocked documents, assert `createAnalysisJob` receives returned document IDs, and assert navigation to `/legal/workspace/a1`. Render `/legal/workspace/a1` directly and assert snapshot/stream initialization.

- [ ] **Step 2: Implement route-driven workspace**

Use `useParams` and `useNavigate`. Remove the synchronous `fetchBackendAnalyze` call from `UploadFlow`. Preserve playbook, jurisdiction, document type, two-file limit, and existing upload validation. Map both workspace URLs to the same sidebar navigation item.

- [ ] **Step 3: Reuse final views**

When terminal results arrive, pass normalized clauses/findings to the existing `ClauseViewer`, `CrossDocumentComparison`, and `RedlineView`. Do not duplicate their legal evidence or redline rendering.

- [ ] **Step 4: Run all frontend checks**

Run: `cd frontend; npm test -- --run; npm run build`

Expected: all frontend tests pass and production build succeeds.

---

### Task 8: Full Verification Before Any Commit

**Files:**
- Modify only files required by failures found during this verification.

**Interfaces:**
- Verifies the complete job flow and final compatibility contract.

- [ ] **Step 1: Run the full backend suite**

Run: `cd backend; python -m unittest discover -s tests -v`

Expected: all backend tests pass with no unhandled task warnings.

- [ ] **Step 2: Run frontend tests and production build**

Run: `cd frontend; npm test -- --run; npm run build`

Expected: all frontend tests pass and Vite build exits `0`.

- [ ] **Step 3: Start backend and frontend locally**

Run backend from `backend`: `python -m uvicorn main:app --reload --port 8000`

Run frontend from `frontend`: `npm run dev -- --host 127.0.0.1`

Expected: backend OpenAPI responds at `http://127.0.0.1:8000/docs`; frontend prints its actual localhost URL.

- [ ] **Step 4: Perform the MSA/SOW live smoke test**

Verify in both Fast and Deep modes:

1. Upload MSA and SOW without waiting for the full pipeline.
2. Confirm page progress changes from real counts.
3. Confirm at least one clause appears while extraction continues.
4. Confirm extraction stops at `awaiting_analysis`.
5. Select the mode and start analysis.
6. Confirm clause statuses update in place.
7. Confirm an early finding appears before terminal completion.
8. Confirm a contradiction links exact clauses from both documents.
9. Confirm missing exhibits are `Not evaluated` and named.
10. Cancel one run and confirm completed partial work remains.
11. Refresh one active run and confirm snapshot plus event replay does not duplicate clauses.
12. Confirm terminal snapshot matches the completed event result.
13. In Fast mode, request a redline and confirm the finding updates without rerunning the whole contract.
14. Retry a failed clause and confirm only unresolved work is scheduled again.

- [ ] **Step 5: Inspect security, API-call behavior, and uncommitted diff**

Run: `git diff --check; git status --short; git diff --stat`

Confirm no token appears in URLs/logs, Fast uses smaller configured candidate limits, Deep runs verification/automatic redlines, and unrelated `.codegraph` or server logs are not staged.

- [ ] **Step 6: Stop without committing**

Report test counts, build result, localhost URL, observed Fast/Deep timing, API-call counts, and remaining warnings to the user. Wait for explicit approval before staging or committing implementation files.
