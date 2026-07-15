import unittest
from unittest.mock import patch

from pipeline.step05_contradict import detect_contradictions


def clause(prefix, index):
    return {
        "id": f"{prefix}{index}",
        "documentId": prefix,
        "documentName": f"{prefix}.txt",
        "documentType": "MSA",
        "clauseType": "payment",
        "text": f"Payment term {index}",
    }


class ContradictionBatchTests(unittest.TestCase):
    def test_caps_candidates_before_llm_and_chunks_capped_pairs(self):
        calls = []

        def evaluate(batch):
            calls.append([(left["id"], right["id"]) for left, right in batch])
            return []

        with patch(
            "pipeline.step05_contradict._contradict_llm_batch",
            side_effect=evaluate,
        ):
            result = detect_contradictions(
                [clause("a", i) for i in range(3)],
                [clause("b", i) for i in range(3)],
                max_pairs=3,
                batch_size=2,
            )

        self.assertEqual(result, [])
        self.assertEqual([len(batch) for batch in calls], [2, 1])
        self.assertEqual(
            [pair for batch in calls for pair in batch],
            [("a0", "b0"), ("a0", "b1"), ("a0", "b2")],
        )

    def test_cancellation_is_checked_before_each_llm_batch(self):
        cancelled = False
        calls = []

        def evaluate(batch):
            nonlocal cancelled
            calls.append(batch)
            cancelled = True
            return []

        with patch(
            "pipeline.step05_contradict._contradict_llm_batch",
            side_effect=evaluate,
        ):
            detect_contradictions(
                [clause("a", i) for i in range(2)],
                [clause("b", i) for i in range(2)],
                max_pairs=4,
                batch_size=2,
                should_cancel=lambda: cancelled,
            )

        self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
