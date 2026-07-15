import unittest

from pipeline.step02_segment import segment_clauses


class ClauseSegmentationTests(unittest.TestCase):
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
