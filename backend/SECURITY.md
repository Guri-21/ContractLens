# ContractLens — Confidential Document Handling

Contracts processed by ContractLens are highly confidential. This document
describes the controls that protect them and how to configure them.

## Threat model in one line

The riskiest moment is when clause text is sent to a third-party LLM (Groq).
TLS protects it in transit, but the content still reaches an external provider.
The controls below reduce **what** leaves, **who can retain it**, and **what is
exposed at rest**.

## 1. Data-retention guarantee (highest priority)

- **Verify the provider's terms.** Before processing real contracts, confirm in
  writing that the LLM provider does not retain or train on API inputs, and sign
  a DPA. Do not rely on defaults.
- **For maximum confidentiality, self-host the model.** The pipeline talks to an
  OpenAI-compatible endpoint. Point it at a model running inside your own VPC and
  **no document content ever leaves your network**:

  ```env
  LLM_PROVIDER=groq                     # the OpenAI-compatible code path
  GROQ_BASE_URL=http://127.0.0.1:8001/v1   # e.g. vLLM / Ollama / LM Studio
  GROQ_MODEL=llama-3.3-70b-instruct
  LLM_REQUIRE_HTTPS=false               # only because it's trusted localhost
  ```

  No code change is required — only configuration.

## 2. Prompt redaction (on by default)

`pipeline/redaction.py` replaces high-signal identifiers (emails, phone numbers,
money amounts, card/account numbers, IPs, URLs) with stable pseudonyms
(`[EMAIL_1]`) **before** the prompt leaves the process, then re-hydrates the
model's response locally. If `presidio-analyzer` is installed, PERSON/ORG/
LOCATION entities are redacted too.

```env
LLM_REDACTION=true    # default; set false only for non-confidential testing
```

Trade-off: aggressive redaction can slightly reduce analysis fidelity where a
party name matters. Pseudonyms are consistent within a document to preserve
relational reasoning.

## 3. No content in logs

`llm_client.py` never logs prompts or raw provider error bodies (which can echo
request content). Only error codes are logged/raised.

## 4. Secrets & transport

- API keys live in `.env` (git-ignored — verified). Use a real secrets manager
  in production and **rotate keys** regularly.
- Plaintext HTTP to the LLM endpoint is refused unless the host is localhost
  (`LLM_REQUIRE_HTTPS`, default true).

## 5. Encryption at rest

Uploaded files get `0o600` permissions always. With `cryptography` installed and
a key configured, files are encrypted at rest (Fernet / AES-128-CBC+HMAC) and
decrypted to a short-lived temp file only while the pipeline parses them.

```bash
# Generate a key:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

```env
AT_REST_ENCRYPTION_KEY=<the generated key>
```

Reads are migration-safe: legacy plaintext uploads still work after enabling
encryption. **Back up the key** — losing it makes existing uploads unreadable.
Complement this with full-disk encryption on the host.

## 6. Audit without content

Every analysis writes an audit entry (user, document IDs, document count,
outcome) — never document text. See the `AuditLog` table.

## Operational checklist

- [ ] Provider DPA signed / self-hosted model in place
- [ ] `LLM_REDACTION=true`
- [ ] `AT_REST_ENCRYPTION_KEY` set and backed up
- [ ] `.env` out of version control, keys rotated
- [ ] Host disk encryption enabled
