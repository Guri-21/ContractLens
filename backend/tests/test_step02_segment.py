import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from pipeline.step01_parse import iter_document_pages, parse_document
from pipeline.step02_segment import ClauseSegmentationIterator, segment_clauses


class ClauseSegmentationTests(unittest.TestCase):
    def test_parse_document_collects_page_iterator_without_changing_output(self):
        with TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "contract.txt"
            path.write_text("1. Payment\nCustomer shall pay.", encoding="utf-8")

            pages = iter_document_pages(str(path))

            self.assertIs(iter(pages), pages)
            self.assertEqual(parse_document(str(path)), list(pages))

    def test_docx_iterator_emits_one_normalized_page_without_binary_fixture(self):
        document = SimpleNamespace(
            paragraphs=[
                SimpleNamespace(text="1. Payment"),
                SimpleNamespace(text=""),
                SimpleNamespace(text="Customer shall pay."),
            ]
        )
        fake_docx = SimpleNamespace(Document=lambda _path: document)

        with patch.dict(sys.modules, {"docx": fake_docx}):
            pages = list(iter_document_pages("contract.docx"))

        self.assertEqual(
            pages,
            [{"page": 1, "text": "1. Payment\nCustomer shall pay.", "tables": []}],
        )

    def test_pdf_iterator_is_lazy_and_emits_each_page_with_tables_and_ocr(self):
        opened = []

        class FakePage:
            def __init__(self, text, tables):
                self._text = text
                self._tables = tables

            def extract_text(self):
                return self._text

            def extract_tables(self):
                return self._tables

        class FakePdf:
            pages = [FakePage("First page", [["A"]]), FakePage("", [])]

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return None

        def open_pdf(path):
            opened.append(path)
            return FakePdf()

        fake_pdfplumber = SimpleNamespace(open=open_pdf)
        with (
            patch.dict(sys.modules, {"pdfplumber": fake_pdfplumber}),
            patch("pipeline.step01_parse._ocr_page_fitz", return_value="OCR page"),
        ):
            pages = iter_document_pages("contract.pdf")
            self.assertEqual(opened, [])
            self.assertEqual(
                list(pages),
                [
                    {"page": 1, "text": "First page", "tables": [["A"]]},
                    {"page": 2, "text": "OCR page", "tables": []},
                ],
            )

        self.assertEqual(opened, ["contract.pdf"])

    def test_streaming_segmenter_waits_for_confirmed_boundary(self):
        stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")

        self.assertEqual(
            stream.feed_page(
                {
                    "page": 1,
                    "text": "1. Payment\nCustomer shall pay",
                    "tables": [],
                }
            ),
            [],
        )
        emitted = stream.feed_page(
            {
                "page": 2,
                "text": (
                    "within 30 days.\n"
                    "2. Termination\n"
                    "Either party may terminate."
                ),
                "tables": [],
            }
        )

        self.assertEqual(len(emitted), 1)
        self.assertEqual(emitted[0]["sectionNumber"], "1")
        self.assertIn("within 30 days", emitted[0]["text"])
        self.assertEqual(stream.flush()[0]["sectionNumber"], "2")

    def test_batch_wrapper_matches_streaming_output(self):
        pages = [
            {
                "page": 1,
                "text": "1. Payment\nCustomer shall pay",
                "tables": [],
            },
            {
                "page": 2,
                "text": (
                    "within 30 days.\n"
                    "2. Termination\n"
                    "Either party may terminate."
                ),
                "tables": [],
            },
        ]

        batch = segment_clauses(pages, "d1", "MSA.txt", "MSA")
        stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")
        incremental = [
            clause
            for page in pages
            for clause in stream.feed_page(page)
        ] + stream.flush()

        self.assertEqual(batch, incremental)

    def test_streaming_segmenter_discards_emitted_text_and_pages(self):
        stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")
        stream.feed_page(
            {
                "page": 1,
                "text": "1. Payment\nCustomer shall pay.",
                "tables": [],
            }
        )

        emitted = stream.feed_page(
            {
                "page": 2,
                "text": "2. Termination\nEither party may terminate.",
                "tables": [],
            }
        )

        self.assertEqual([clause["sectionNumber"] for clause in emitted], ["1"])
        self.assertNotIn("_pages", vars(stream))
        self.assertNotIn("Customer shall pay", repr(vars(stream)))

        stream.feed_page(
            {
                "page": 3,
                "text": "3. Notices\nNotices must be written.",
                "tables": [],
            }
        )
        self.assertNotIn("Either party may terminate", repr(vars(stream)))

    def test_streaming_segmenter_propagates_tables_across_clause_pages(self):
        stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")
        self.assertEqual(
            stream.feed_page(
                {
                    "page": 4,
                    "text": "1. Fees\nThe fees are:",
                    "tables": [["Item", "Price"]],
                }
            ),
            [],
        )
        self.assertEqual(
            stream.feed_page(
                {
                    "page": 5,
                    "text": "Service A costs 100.",
                    "tables": [["Service A", "100"]],
                }
            ),
            [],
        )

        emitted = stream.feed_page(
            {
                "page": 6,
                "text": "2. Termination\nEither party may terminate.",
                "tables": [],
            }
        )

        self.assertEqual(
            emitted[0]["tableData"],
            [["Item", "Price"], ["Service A", "100"]],
        )

    def test_streaming_segmenter_preserves_start_page_for_spanning_clauses(self):
        stream = ClauseSegmentationIterator("d1", "MSA.txt", "MSA")
        stream.feed_page(
            {"page": 7, "text": "1. Payment\nCustomer shall pay", "tables": []}
        )
        stream.feed_page(
            {"page": 8, "text": "within 30 days.", "tables": []}
        )
        emitted = stream.feed_page(
            {
                "page": 9,
                "text": "2. Termination\nEither party may terminate.",
                "tables": [],
            }
        )

        self.assertEqual(emitted[0]["page"], 7)
        self.assertEqual(stream.flush()[0]["page"], 9)

    def test_repeated_input_produces_stable_unique_clause_ids(self):
        pages = [
            {
                "page": 1,
                "text": "1. Payment\nPay promptly.\n2. Notices\nGive notice.",
                "tables": [],
            }
        ]

        first = segment_clauses(pages, "d1", "MSA.txt", "MSA")
        second = segment_clauses(pages, "d1", "MSA.txt", "MSA")
        first_ids = [clause["id"] for clause in first]

        self.assertEqual(first_ids, [clause["id"] for clause in second])
        self.assertEqual(len(first_ids), len(set(first_ids)))

    def test_splits_inline_decimal_sections_without_absorbing_next_clause(self):
        pages = [
            {
                "page": 1,
                "text": (
                    "1.7 INTENTIONALLY LEFT BLANK\n\n"
                    "1.8 This Agreement is nonexclusive and sets forth the terms and conditions. "
                    "1.9 Supplier Performance metrics will be identified and tracked quarterly. "
                    "1.10 Supplier agrees to provide Advance Ship Notices. "
                    "2 Quality and Food Safety "
                    "2.1 Supplier guarantees Ingredients will comply with applicable laws. "
                    "2.2 Supplier shall develop and maintain a food safety program."
                ),
            }
        ]

        clauses = segment_clauses(pages, "doc-1", "Test_MSA.txt", "MSA")
        by_section = {clause["sectionNumber"]: clause for clause in clauses}

        self.assertEqual(
            ["1.7", "1.8", "1.9", "1.10", "2", "2.1", "2.2"],
            [clause["sectionNumber"] for clause in clauses],
        )
        self.assertEqual("INTENTIONALLY LEFT BLANK", by_section["1.7"]["title"])
        self.assertNotIn("1.8 This Agreement", by_section["1.7"]["text"])
        self.assertIn("This Agreement is nonexclusive", by_section["1.8"]["text"])
        self.assertEqual("Quality and Food Safety", by_section["2"]["title"])

    def test_splits_top_level_and_nested_sections_on_same_line(self):
        pages = [
            {
                "page": 1,
                "text": (
                    "4 Intellectual Property. "
                    "4.1 Each Party shall retain ownership of all Intellectual Property Rights. "
                    "4.2 Ownership in modifications shall be allocated as agreed. "
                    "5 Confidential Information. "
                    "5.1 Each Party will hold Confidential Information in strict confidence."
                ),
            }
        ]

        clauses = segment_clauses(pages, "doc-1", "Test_MSA.txt", "MSA")

        self.assertEqual(
            ["4", "4.1", "4.2", "5", "5.1"],
            [clause["sectionNumber"] for clause in clauses],
        )
        self.assertEqual("Intellectual Property", clauses[0]["title"])
        self.assertEqual("Confidential Information", clauses[3]["title"])

    def test_does_not_split_legal_citations_or_percentages_as_sections(self):
        pages = [
            {
                "page": 1,
                "text": (
                    "2.1 Supplier shall comply with 21 USC 301 et seq and 22 CCR 12701 et seq. "
                    "The fee may increase by 3.5% after renewal. "
                    "2.2 Supplier shall notify Buyer immediately."
                ),
            }
        ]

        clauses = segment_clauses(pages, "doc-1", "Test_MSA.txt", "MSA")

        self.assertEqual(["2.1", "2.2"], [clause["sectionNumber"] for clause in clauses])
        self.assertIn("3.5%", clauses[0]["text"])

    def test_extracts_all_caps_top_level_title_before_body(self):
        pages = [
            {
                "page": 1,
                "text": (
                    "3 PLACE OF WORK The Company's offices are at Building 900. "
                    "4 REMUNERATION 4.1 Your salary will be USD370,000 per annum."
                ),
            }
        ]

        clauses = segment_clauses(pages, "doc-1", "Test_SOW.txt", "SOW")
        by_section = {clause["sectionNumber"]: clause for clause in clauses}

        self.assertEqual("PLACE OF WORK", by_section["3"]["title"])
        self.assertTrue(by_section["3"]["text"].startswith("The Company's offices"))
        self.assertEqual("REMUNERATION", by_section["4"]["title"])

    def test_does_not_split_top_level_number_after_semicolon(self):
        pages = [
            {
                "page": 1,
                "text": (
                    "2.1 Duties include leadership skills; 5 Company policies may apply. "
                    "2.2 Supplier shall notify Buyer immediately."
                ),
            }
        ]

        clauses = segment_clauses(pages, "doc-1", "Test_SOW.txt", "SOW")

        self.assertEqual(["2.1", "2.2"], [clause["sectionNumber"] for clause in clauses])
        self.assertIn("5 Company policies", clauses[0]["text"])


if __name__ == "__main__":
    unittest.main()
