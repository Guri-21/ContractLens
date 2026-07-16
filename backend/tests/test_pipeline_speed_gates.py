import unittest

from pipeline.step03_classify import _classify_by_keywords
from pipeline.step05_contradict import _match_by_type
from pipeline.step07_playbook import _is_clause_relevant_to_rules


class PipelineSpeedGateTests(unittest.TestCase):
    def test_keyword_classifier_identifies_payment_without_llm(self):
        clause = {"text": "Customer shall pay each invoice within 90 days of receipt."}

        self.assertEqual("payment", _classify_by_keywords(clause))

    def test_playbook_validation_skips_clause_with_no_rule_keyword_overlap(self):
        clause = {"text": "The employee shall report to the Chief Executive Officer."}
        rules = ["Net 30 Payment Terms: invoices must be paid within 30 days"]

        self.assertFalse(_is_clause_relevant_to_rules(clause, rules))

    def test_contradiction_matching_skips_other_and_caps_pairs(self):
        doc_a = [{"id": f"a{i}", "clauseType": "other", "text": "general"} for i in range(10)]
        doc_b = [{"id": f"b{i}", "clauseType": "other", "text": "general"} for i in range(10)]
        doc_a.append({"id": "a-pay", "clauseType": "payment", "text": "pay within 30 days"})
        doc_b.append({"id": "b-pay", "clauseType": "payment", "text": "pay within 90 days"})

        pairs = _match_by_type(doc_a, doc_b)

        self.assertEqual(1, len(pairs))
        self.assertEqual(("a-pay", "b-pay"), (pairs[0][0]["id"], pairs[0][1]["id"]))


if __name__ == "__main__":
    unittest.main()
