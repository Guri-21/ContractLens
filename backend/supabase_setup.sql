-- Run this in Supabase SQL Editor (Database > SQL Editor > New query)
-- Step 1: Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Indian statute sections (for RAG layer)
CREATE TABLE IF NOT EXISTS statute_sections (
    id            TEXT PRIMARY KEY,
    act_name      TEXT NOT NULL,
    section_number TEXT NOT NULL,
    section_title TEXT DEFAULT '',
    chapter       TEXT DEFAULT '',
    text          TEXT NOT NULL,
    source_pdf    TEXT NOT NULL,
    page_number   INT  NOT NULL,
    jurisdiction  TEXT DEFAULT 'India',
    law_type      TEXT DEFAULT 'statute',
    citation      TEXT,
    embedding     vector(1024)
);

CREATE INDEX IF NOT EXISTS statute_sections_embedding_idx
    ON statute_sections USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- Step 3: Contract clause vectors (for similar-clause search)
CREATE TABLE IF NOT EXISTS contract_clauses (
    embedding_id  TEXT PRIMARY KEY,
    clause_id     TEXT NOT NULL,
    document_id   TEXT NOT NULL,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    clause_type   TEXT DEFAULT 'unknown',
    section_number TEXT DEFAULT '',
    text          TEXT NOT NULL,
    embedding     vector(1024)
);

CREATE INDEX IF NOT EXISTS contract_clauses_embedding_idx
    ON contract_clauses USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);
