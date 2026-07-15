import unittest
from unittest.mock import patch

import pipeline.run_pipeline as pipeline


class PipelineDocumentPackageTests(unittest.TestCase):
    def test_select_primary_pair_returns_msa_and_sow_from_shuffled_package(self):
        exhibit = {"id": "exhibit", "name": "Exhibit.pdf", "type": "EXHIBIT", "file_path": "exhibit"}
        sow = {"id": "sow", "name": "SOW.pdf", "type": "SOW", "file_path": "sow"}
        msa = {"id": "msa", "name": "MSA.pdf", "type": "MSA", "file_path": "msa"}

        self.assertEqual(pipeline._select_primary_pair([exhibit, sow, msa]), (msa, sow))

    def test_supporting_documents_are_excluded_only_from_contradictions(self):
        documents = [
            {"id": "exhibit", "name": "Exhibit.pdf", "type": "EXHIBIT", "file_path": "exhibit"},
            {"id": "sow", "name": "SOW.pdf", "type": "SOW", "file_path": "sow"},
            {"id": "msa", "name": "MSA.pdf", "type": "MSA", "file_path": "msa"},
        ]

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
            patch("pipeline.run_pipeline.parse_document", return_value=[]) as parser,
            patch("pipeline.run_pipeline.segment_clauses", side_effect=segment),
            patch("pipeline.run_pipeline.classify_clauses", side_effect=lambda clauses: clauses),
            patch("pipeline.run_pipeline.extract_references", side_effect=lambda clauses: clauses),
            patch("pipeline.run_pipeline.apply_refusal", return_value=[]) as refusal,
            patch("pipeline.run_pipeline.detect_contradictions", return_value=[]) as contradictions,
            patch("pipeline.run_pipeline.validate_playbook", return_value=[]) as playbook,
            patch("pipeline.run_pipeline.score_risk", return_value={"overallScore": 0}),
            patch("pipeline.run_pipeline.generate_redlines", side_effect=lambda findings, _clauses: findings) as redlines,
            patch("pipeline.run_pipeline.generate_report", return_value={"summary": "ok"}) as report,
        ):
            pipeline.run_analysis_pipeline(documents, ["rule"], "IN")

        self.assertEqual(
            [["clause-msa"], ["clause-sow"]],
            [
                [clause["id"] for clause in contradictions.call_args.args[0]],
                [clause["id"] for clause in contradictions.call_args.args[1]],
            ],
        )
        self.assertEqual(["exhibit", "sow", "msa"], [call.args[0] for call in parser.call_args_list])
        self.assertEqual(["clause-exhibit", "clause-sow", "clause-msa"], [clause["id"] for clause in refusal.call_args.args[0]])
        self.assertEqual(["clause-exhibit", "clause-sow", "clause-msa"], [clause["id"] for clause in playbook.call_args.args[0]])
        self.assertEqual(["clause-exhibit", "clause-sow", "clause-msa"], [clause["id"] for clause in redlines.call_args.args[1]])
        self.assertEqual(["clause-exhibit", "clause-sow", "clause-msa"], [clause["id"] for clause in report.call_args.args[0]])


if __name__ == "__main__":
    unittest.main()
