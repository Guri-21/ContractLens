"""
Post-prisma-push setup: recreate pgvector tables that Prisma drops.

Prisma's db push makes the DB match schema.prisma exactly — dropping any
tables not declared there. This script recreates statute_sections and
contract_clauses (raw SQL / pgvector tables) immediately after each push.
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

import psycopg2  # type: ignore[import]

SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS statute_sections (
    id             TEXT PRIMARY KEY,
    act_name       TEXT NOT NULL,
    section_number TEXT NOT NULL,
    section_title  TEXT DEFAULT '',
    chapter        TEXT DEFAULT '',
    text           TEXT NOT NULL,
    source_pdf     TEXT NOT NULL,
    page_number    INT  NOT NULL,
    jurisdiction   TEXT DEFAULT 'India',
    law_type       TEXT DEFAULT 'statute',
    citation       TEXT,
    embedding      vector(1024)
);

CREATE INDEX IF NOT EXISTS statute_sections_embedding_idx
    ON statute_sections USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE TABLE IF NOT EXISTS contract_clauses (
    embedding_id   TEXT PRIMARY KEY,
    clause_id      TEXT NOT NULL,
    document_id    TEXT NOT NULL,
    document_name  TEXT NOT NULL,
    document_type  TEXT NOT NULL,
    clause_type    TEXT DEFAULT 'unknown',
    section_number TEXT DEFAULT '',
    text           TEXT NOT NULL,
    embedding      vector(1024)
);

CREATE INDEX IF NOT EXISTS contract_clauses_embedding_idx
    ON contract_clauses USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);
"""


def main() -> None:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        print("ERROR: DATABASE_URL is not set", file=sys.stderr)
        sys.exit(1)
    # Use session pooler (port 5432) for DDL — avoids transaction-pooler limits
    url = url.replace(":6543/", ":5432/")
    if "sslmode" not in url:
        url += "?sslmode=require"

    conn = psycopg2.connect(url)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(SQL)
    conn.close()
    print("pgvector tables ready.")


if __name__ == "__main__":
    main()
