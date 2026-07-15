import asyncio
import unittest

from app.analysis_jobs import (
    AnalysisJobAccessError,
    AnalysisJobManager,
    AnalysisJobNotFoundError,
)
from app.analysis_schemas import AnalysisJobState


class AnalysisJobManagerTests(unittest.IsolatedAsyncioTestCase):
    async def test_publish_assigns_monotonic_sequences_and_replays(self):
        manager = AnalysisJobManager(history_limit=10)
        job = await manager.create("user-1", ["doc-1"], None, "IN")

        first = await manager.publish(
            job.id, "job.state", {"state": "extracting"}
        )
        second = await manager.publish(
            job.id,
            "progress",
            {
                "phase": "extraction",
                "stage": "parse",
                "completed": 1,
                "total": 2,
            },
        )

        self.assertEqual((first.sequence, second.sequence), (1, 2))
        replay = await manager.events_after(job.id, 1)
        self.assertEqual([event.sequence for event in replay], [2])

    async def test_history_is_bounded_without_resetting_sequence(self):
        manager = AnalysisJobManager(history_limit=2)
        job = await manager.create("user-1", ["doc-1"], None, "IN")

        for completed in range(1, 4):
            await manager.publish(
                job.id,
                "progress",
                {
                    "phase": "extraction",
                    "stage": "parse",
                    "completed": completed,
                    "total": 3,
                },
            )

        replay = await manager.events_after(job.id, 0)
        self.assertEqual([event.sequence for event in replay], [2, 3])
        self.assertEqual((await manager.snapshot(job.id)).lastSequence, 3)

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
        self.assertEqual(snapshot.lastSequence, 1)
        events = await manager.events_after(job.id, 0)
        self.assertEqual(events[0].payload, {"state": "cancelled"})

    async def test_cancel_enforces_ownership(self):
        manager = AnalysisJobManager()
        job = await manager.create("user-1", ["doc-1"], None, "IN")

        with self.assertRaises(AnalysisJobAccessError):
            await manager.cancel(job.id, "user-2")

        self.assertFalse(await manager.is_cancelled(job.id))

    async def test_snapshot_and_events_are_deep_copies(self):
        manager = AnalysisJobManager()
        job = await manager.create("user-1", ["doc-1"], None, "IN")
        event = await manager.publish(
            job.id,
            "warning",
            {"code": "temporary", "message": "Retry", "details": {"attempt": 1}},
        )

        event.payload["details"]["attempt"] = 99
        first_snapshot = await manager.snapshot(job.id)
        first_snapshot.documentIds.append("doc-2")
        first_snapshot.warnings[0]["details"]["attempt"] = 88

        stored_event = (await manager.events_after(job.id, 0))[0]
        second_snapshot = await manager.snapshot(job.id)
        self.assertEqual(stored_event.payload["details"]["attempt"], 1)
        self.assertEqual(second_snapshot.documentIds, ["doc-1"])
        self.assertEqual(second_snapshot.warnings[0]["details"]["attempt"], 1)

    async def test_clause_events_keep_typed_snapshot_models(self):
        manager = AnalysisJobManager()
        job = await manager.create("user-1", ["doc-1"], None, "IN")
        clause = {
            "id": "clause-1",
            "documentId": "doc-1",
            "documentName": "MSA.txt",
            "documentType": "MSA",
            "text": "Payment is due in 30 days.",
        }

        await manager.publish(job.id, "clause.extracted", {"clause": clause})

        snapshot = await manager.snapshot(job.id)
        self.assertEqual(snapshot.clauses[0].id, "clause-1")
        self.assertEqual(snapshot.clauseStates["clause-1"].value, "extracted")

    async def test_wait_for_events_wakes_after_publish(self):
        manager = AnalysisJobManager()
        job = await manager.create("user-1", ["doc-1"], None, "IN")
        waiter = asyncio.create_task(manager.wait_for_events(job.id, 0, timeout=1))
        await asyncio.sleep(0)

        await manager.publish(
            job.id, "job.state", {"state": "extracting"}
        )

        events = await waiter
        self.assertEqual([event.sequence for event in events], [1])

    async def test_missing_jobs_raise_explicit_error(self):
        manager = AnalysisJobManager()

        with self.assertRaises(AnalysisJobNotFoundError):
            await manager.snapshot("missing")
        with self.assertRaises(AnalysisJobNotFoundError):
            await manager.publish("missing", "warning", {"code": "x", "message": "x"})


if __name__ == "__main__":
    unittest.main()
