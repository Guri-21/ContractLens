import asyncio
from collections import deque
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.analysis_schemas import (
    AnalysisEvent,
    AnalysisEventType,
    AnalysisJobSnapshot,
    AnalysisJobState,
    AnalysisProgress,
    ClauseWorkState,
)
from app.schemas import ClauseDTO, RiskFindingDTO


class AnalysisJobError(Exception):
    """Base error for analysis job manager operations."""


class AnalysisJobNotFoundError(AnalysisJobError):
    pass


class AnalysisJobAccessError(AnalysisJobError):
    pass


class AnalysisJobStateError(AnalysisJobError):
    pass


@dataclass
class _ManagedJob:
    snapshot: AnalysisJobSnapshot
    events: deque[AnalysisEvent]
    cancelled: bool = False


class AnalysisJobManager:
    def __init__(self, history_limit: int = 500):
        if history_limit < 1:
            raise ValueError("history_limit must be at least 1")
        self._history_limit = history_limit
        self._jobs: dict[str, _ManagedJob] = {}
        self._lock = asyncio.Lock()
        self._condition = asyncio.Condition(self._lock)

    async def create(
        self,
        user_id: str,
        document_ids: list[str],
        playbook_id: str | None,
        jurisdiction: str,
    ) -> AnalysisJobSnapshot:
        if not user_id or not document_ids or not jurisdiction:
            raise ValueError("user_id, document_ids, and jurisdiction are required")
        now = datetime.now(timezone.utc)
        snapshot = AnalysisJobSnapshot(
            id=str(uuid4()),
            userId=user_id,
            documentIds=list(document_ids),
            playbookId=playbook_id,
            jurisdiction=jurisdiction,
            createdAt=now,
            updatedAt=now,
        )
        async with self._lock:
            self._jobs[snapshot.id] = _ManagedJob(
                snapshot=snapshot,
                events=deque(maxlen=self._history_limit),
            )
        return snapshot.model_copy(deep=True)

    async def get_owned(
        self, analysis_id: str, user_id: str
    ) -> AnalysisJobSnapshot:
        async with self._lock:
            job = self._get_job(analysis_id)
            self._check_owner(job, user_id)
            return job.snapshot.model_copy(deep=True)

    async def publish(
        self,
        analysis_id: str,
        event_type: AnalysisEventType,
        payload: dict[str, Any],
    ) -> AnalysisEvent:
        async with self._condition:
            job = self._get_job(analysis_id)
            event = self._new_event(job, event_type, payload)
            self._apply_event(job.snapshot, event)
            job.events.append(event)
            self._condition.notify_all()
            return event.model_copy(deep=True)

    async def snapshot(self, analysis_id: str) -> AnalysisJobSnapshot:
        async with self._lock:
            job = self._get_job(analysis_id)
            return job.snapshot.model_copy(deep=True)

    async def events_after(
        self, analysis_id: str, sequence: int
    ) -> list[AnalysisEvent]:
        async with self._lock:
            job = self._get_job(analysis_id)
            return self._copy_events_after(job, sequence)

    async def wait_for_events(
        self,
        analysis_id: str,
        sequence: int,
        timeout: float | None = None,
    ) -> list[AnalysisEvent]:
        async with self._condition:
            job = self._get_job(analysis_id)
            available = self._copy_events_after(job, sequence)
            if available:
                return available
            try:
                await asyncio.wait_for(self._condition.wait(), timeout=timeout)
            except TimeoutError:
                return []
            job = self._get_job(analysis_id)
            return self._copy_events_after(job, sequence)

    async def cancel(
        self, analysis_id: str, user_id: str
    ) -> AnalysisJobSnapshot:
        async with self._condition:
            job = self._get_job(analysis_id)
            self._check_owner(job, user_id)
            if job.cancelled:
                return job.snapshot.model_copy(deep=True)
            if job.snapshot.state in {
                AnalysisJobState.COMPLETED,
                AnalysisJobState.COMPLETED_WITH_WARNINGS,
                AnalysisJobState.FAILED,
            }:
                raise AnalysisJobStateError(
                    f"Cannot cancel job in state '{job.snapshot.state.value}'"
                )
            job.cancelled = True
            event = self._new_event(
                job, "job.state", {"state": AnalysisJobState.CANCELLED.value}
            )
            self._apply_event(job.snapshot, event)
            job.events.append(event)
            self._condition.notify_all()
            return job.snapshot.model_copy(deep=True)

    async def is_cancelled(self, analysis_id: str) -> bool:
        async with self._lock:
            return self._get_job(analysis_id).cancelled

    def _get_job(self, analysis_id: str) -> _ManagedJob:
        try:
            return self._jobs[analysis_id]
        except KeyError as exc:
            raise AnalysisJobNotFoundError(
                f"Analysis job '{analysis_id}' was not found"
            ) from exc

    @staticmethod
    def _check_owner(job: _ManagedJob, user_id: str) -> None:
        if job.snapshot.userId != user_id:
            raise AnalysisJobAccessError("Analysis job belongs to another user")

    @staticmethod
    def _copy_events_after(
        job: _ManagedJob, sequence: int
    ) -> list[AnalysisEvent]:
        return [
            event.model_copy(deep=True)
            for event in job.events
            if event.sequence > sequence
        ]

    @staticmethod
    def _new_event(
        job: _ManagedJob,
        event_type: AnalysisEventType,
        payload: dict[str, Any],
    ) -> AnalysisEvent:
        return AnalysisEvent(
            analysisId=job.snapshot.id,
            sequence=job.snapshot.lastSequence + 1,
            timestamp=datetime.now(timezone.utc),
            type=event_type,
            payload=deepcopy(payload),
        )

    def _apply_event(
        self, snapshot: AnalysisJobSnapshot, event: AnalysisEvent
    ) -> None:
        snapshot.lastSequence = event.sequence
        snapshot.updatedAt = event.timestamp
        payload = event.payload
        if event.type == "job.state":
            snapshot.state = AnalysisJobState(payload["state"])
        elif event.type == "progress":
            progress = AnalysisProgress.model_validate(payload)
            if progress.phase == "extraction":
                snapshot.extractionProgress = progress
            else:
                snapshot.analysisProgress = progress
        elif event.type == "clause.extracted":
            self._upsert(snapshot.clauses, payload["clause"], ClauseDTO)
            snapshot.clauseStates[payload["clause"]["id"]] = (
                ClauseWorkState.EXTRACTED
            )
        elif event.type == "clause.updated":
            self._upsert(snapshot.clauses, payload["clause"], ClauseDTO)
            snapshot.clauseStates[payload["clause"]["id"]] = ClauseWorkState(
                payload["state"]
            )
        elif event.type in {"finding.created", "finding.updated"}:
            self._upsert(snapshot.findings, payload["finding"], RiskFindingDTO)
        elif event.type == "report.ready":
            snapshot.report = deepcopy(payload["report"])
        elif event.type == "warning":
            snapshot.warnings.append(deepcopy(payload))
        elif event.type == "job.failed":
            snapshot.state = AnalysisJobState.FAILED
        elif event.type == "job.completed":
            snapshot.state = AnalysisJobState(
                payload.get("state", AnalysisJobState.COMPLETED.value)
            )

    @staticmethod
    def _upsert(items: list[Any], value: Any, model_type: type[Any]) -> None:
        item = model_type.model_validate(value)
        for index, existing in enumerate(items):
            if existing.id == item.id:
                items[index] = item
                return
        items.append(item)
