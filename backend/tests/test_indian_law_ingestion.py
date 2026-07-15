from app.intelligence.legal_corpus import (
    build_statute_embedding_text,
    extract_statute_sections_from_pages,
)


def test_extracts_sections_with_act_chapter_page_and_subsections():
    pages = [
        {
            "page": 1,
            "text": (
                "THE INDIAN CONTRACT ACT, 1872\n"
                "CHAPTER I OF THE COMMUNICATION, ACCEPTANCE AND REVOCATION OF PROPOSALS\n"
                "1. Short title. This Act may be called the Indian Contract Act, 1872.\n"
                "2. Interpretation-clause. In this Act the following words and expressions "
                "are used in the following senses, unless a contrary intention appears from "
                "the context: (a) When one person signifies to another his willingness to do "
                "or to abstain from doing anything, he is said to make a proposal; "
                "(b) When the person to whom the proposal is made signifies his assent, "
                "the proposal is said to be accepted."
            ),
        },
        {
            "page": 2,
            "text": (
                "3. Communication, acceptance and revocation of proposals. "
                "The communication of proposals, the acceptance of proposals, and the "
                "revocation of proposals and acceptances, respectively, are deemed to be "
                "made by any act or omission of the party proposing, accepting or revoking."
            ),
        },
    ]

    sections = extract_statute_sections_from_pages(
        pages,
        source_pdf="THE INDIAN CONTRACT ACT, 1872.pdf",
    )

    assert [section.section_number for section in sections] == ["1", "2", "3"]
    assert sections[0].act_name == "THE INDIAN CONTRACT ACT, 1872"
    assert sections[1].chapter == (
        "CHAPTER I OF THE COMMUNICATION, ACCEPTANCE AND REVOCATION OF PROPOSALS"
    )
    assert sections[1].section_title == "Interpretation-clause"
    assert sections[1].page_number == 1
    assert "(a) When one person" in sections[1].text
    assert "(b) When the person" in sections[1].text
    assert sections[2].page_number == 2
    assert sections[2].jurisdiction == "India"
    assert sections[2].law_type == "statute"


def test_builds_embedding_text_with_source_context():
    pages = [
        {
            "page": 4,
            "text": (
                "THE LIMITATION ACT, 1963\n"
                "3. Bar of limitation. Subject to the provisions contained in sections "
                "4 to 24, every suit instituted after the prescribed period shall be dismissed."
            ),
        }
    ]

    section = extract_statute_sections_from_pages(
        pages,
        source_pdf="THE LIMITATION ACT, 1963.pdf",
    )[0]

    embedding_text = build_statute_embedding_text(section)

    assert embedding_text.startswith(
        "[STATUTE] [India] THE LIMITATION ACT, 1963 Section 3: Bar of limitation"
    )
    assert "every suit instituted after the prescribed period shall be dismissed" in embedding_text


def test_repeated_section_numbers_get_unique_embedding_ids():
    pages = [
        {
            "page": 1,
            "text": (
                "THE TEST ACT, 2026\n"
                "1. Short title. Main Act short title text.\n"
                "2. Rule making. The authority may make rules.\n"
                "1. Short title. Schedule short title text repeated in an annexure."
            ),
        }
    ]

    sections = extract_statute_sections_from_pages(
        pages,
        source_pdf="THE TEST ACT, 2026.pdf",
    )

    assert [section.section_number for section in sections] == ["1", "2", "1"]
    assert len({section.id for section in sections}) == 3


def test_splits_inline_statute_sections_on_same_line():
    pages = [
        {
            "page": 1,
            "text": (
                "THE ARBITRATION AND CONCILIATION ACT, 1996\n"
                "8. Power to refer parties to arbitration where there is an arbitration "
                "agreement. A judicial authority shall refer the parties. "
                "9. Interim measures, etc., by Court. A party may apply to a Court."
            ),
        }
    ]

    sections = extract_statute_sections_from_pages(
        pages,
        source_pdf="THE ARBITRATION AND CONCILIATION ACT, 1996.pdf",
    )

    by_number = {section.section_number: section for section in sections}
    assert [section.section_number for section in sections] == ["8", "9"]
    assert "9. Interim measures" not in by_number["8"].text
    assert by_number["9"].section_title.startswith("Interim measures")
