import unittest
from unittest.mock import patch

from pipeline.run_pipeline import run_analysis_pipeline


class PipelineCompatibilityTests(unittest.TestCase):
    def test_synchronous_entry_point_preserves_result_and_dto_identity_fields(self):
        documents = [
            {"id": "d1", "name": "MSA.txt", "type": "MSA", "file_path": "msa"},
            {"id": "d2", "name": "SOW.txt", "type": "SOW", "file_path": "sow"},
        ]
        clauses_by_path = {
            "msa": [{"page": 1, "text": "MSA"}],
            "sow": [{"page": 1, "text": "SOW"}],
        }

        def segment(_pages, document_id, document_name, document_type):
            return [
                {
                    "id": f"clause-{document_id}",
                    "documentId": document_id,
                    "documentName": document_name,
                    "documentType": document_type,
                    "text": document_name,
                }
            ]

        with (
            patch("pipeline.run_pipeline.parse_document", side_effect=clauses_by_path.get),
            patch("pipeline.run_pipeline.segment_clauses", side_effect=segment),
            patch("pipeline.run_pipeline.classify_clauses", side_effect=lambda value: value),
            patch("pipeline.run_pipeline.extract_references", side_effect=lambda value: value),
            patch("pipeline.run_pipeline.apply_refusal", return_value=[]),
            patch("pipeline.run_pipeline.detect_contradictions", return_value=[]),
            patch("pipeline.run_pipeline.validate_playbook", return_value=[]),
            patch("pipeline.run_pipeline.score_risk", return_value={"overallScore": 0}),
            patch("pipeline.run_pipeline.generate_redlines", side_effect=lambda findings, clauses: findings),
            patch("pipeline.run_pipeline.generate_report", return_value={"summary": "ok"}),
        ):
            result = run_analysis_pipeline(documents, [], "IN")

        self.assertEqual(set(result), {"clauses", "findings", "riskScore", "report"})
        self.assertEqual(
            [(clause["id"], clause["documentId"]) for clause in result["clauses"]],
            [("clause-d1", "d1"), ("clause-d2", "d2")],
        )


if __name__ == "__main__":
    unittest.main()
