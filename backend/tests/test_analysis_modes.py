import unittest
from dataclasses import FrozenInstanceError

from app.analysis_schemas import AnalysisMode
from pipeline.config import get_mode_policy
from pipeline.streaming_orchestrator import _defaults


class AnalysisModeTests(unittest.TestCase):
    def test_fast_uses_smaller_candidate_set_and_manual_redlines(self):
        fast = get_mode_policy(AnalysisMode.FAST)
        deep = get_mode_policy(AnalysisMode.DEEP)

        self.assertLess(fast.maxContradictionPairs, deep.maxContradictionPairs)
        self.assertFalse(fast.autoRedlines)
        self.assertTrue(deep.autoRedlines)
        self.assertFalse(fast.verifyHighRisk)
        self.assertTrue(deep.verifyHighRisk)
        self.assertLess(deep.classificationBatchSize, fast.classificationBatchSize)

    def test_mode_policy_is_frozen_and_rejects_unknown_modes(self):
        policy = get_mode_policy(AnalysisMode.FAST)

        with self.assertRaises(FrozenInstanceError):
            policy.maxRetries = 99
        with self.assertRaises(ValueError):
            get_mode_policy("turbo")

    def test_default_fast_classifier_accepts_policy_without_network(self):
        clauses = [{"id": "c1", "text": "Payment is due in 30 days"}]

        result = _defaults().classify_batch(
            clauses, get_mode_policy(AnalysisMode.FAST)
        )

        self.assertEqual(result[0]["clauseType"], "payment")


if __name__ == "__main__":
    unittest.main()
