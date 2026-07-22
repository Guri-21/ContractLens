# ContractLens — Pre-Production Security Audit

Scope: full backend (`app/`, `pipeline/`) + frontend (`src/`). Date: 2026-07-23.
Severity: **Critical** (fix before any prod exposure) → **High** → **Medium** → **Low**.

Positive baseline: RBAC is applied consistently (every API route has
`require_role`/`get_current_user`), Prisma is used with parameterized queries
(no SQL injection surface), uploads have filename sanitization + magic-byte
checks + size limits, passwords are bcrypt-hashed, and audit logging is broad.
The problems below are concentrated in **auth logic and configuration**.

---

## CRITICAL

### C1 — Demo-password backdoor in login
`app/api/auth.py:127-138`. If the username is a seeded demo account, a login
with the hardcoded password (`admin@contractlens.com` / `12345`, advisors
`1`–`5`) not only succeeds but **resets the stored hash back to the demo
password**. Anyone who reads the source (it's in the repo) can log in as
**admin** and even overwrites a real password the admin may have set.
- **Impact:** full admin account takeover, publicly known credentials.
- **Fix:** gate all seeded accounts behind `ENABLE_DEMO_USERS` (default
  **false**). In production, skip `DEMO_USER_PASSWORDS` matching and the
  password-repair branch entirely.

### C2 — Passwords re-seeded to known values on every boot
`main.py:82` calls `ensure_seeded_access_users(db)` with the default
`repair_passwords=True` (`app/api/auth.py:51,86`), which resets every demo
account's password to its hardcoded value on **each server start**.
- **Impact:** demo credentials are permanently valid in any deployment that
  seeded those emails.
- **Fix:** same `ENABLE_DEMO_USERS` gate; never repair passwords in prod.

### C3 — JWT signing key falls back to a public demo secret
`app/core/security.py:11-19`. If `JWT_SECRET_KEY` is unset, the app uses the
hardcoded `"super-secret-key-for-demo"`. Anyone with that string can **forge a
valid admin JWT** (`sub` = any user id).
- **Impact:** complete authentication bypass / token forgery.
- **Fix:** **fail-fast** — raise on startup if `JWT_SECRET_KEY` is unset when
  not in explicit dev mode. Never ship the fallback to prod.

---

## HIGH

### H1 — Unauthenticated user directory (enumeration)
`app/api/auth.py:236` `/api/auth/available-users` is **public** and returns
every admin + advisor email and role. This is the login "seeded user" picker.
- **Impact:** full user/email + role disclosure to anonymous callers; aids
  phishing and targeted brute force.
- **Fix:** for prod, remove the seeded-user picker and require credentials to be
  typed. Either delete this endpoint or require auth + return only the caller.

### H2 — Long-lived tokens in localStorage, no revocation
Refresh tokens live 7 days (`security.py`), access tokens 60 min, both stored in
`localStorage` (`api/client.ts`, `AuthContext.tsx`). Stateless JWTs cannot be
revoked, and `localStorage` is readable by any XSS.
- **Impact:** a single XSS or leaked token = account takeover until expiry, with
  no server-side kill switch.
- **Fix:** prefer httpOnly+Secure+SameSite cookies for the refresh token;
  add refresh-token rotation + a server-side revocation list (jti). At minimum
  shorten refresh lifetime and rotate on use.

### H3 — Legacy scaffolding scripts with wide-open config
`build_backend.py:173` hardcodes `SECRET_KEY`; `build_backend.py:445` and
`migrate_prisma.py:390` set `allow_origins=["*"]`. These aren't the runtime
(`main.py` is), but they're committed and runnable.
- **Impact:** if ever executed/copied, wildcard CORS + known secret.
- **Fix:** delete `build_backend.py` and `migrate_prisma.py` (or move to a
  clearly-marked, git-ignored `scratch/`).

---

## MEDIUM

### M1 — CORS must be explicit in prod (never `*` with credentials)
`main.py:47-58` currently allows only localhost with `allow_credentials=True`.
That won't work in prod, and the tempting fix (`allow_origins=["*"]`) is invalid
with credentials and unsafe. Set the exact prod origin(s) via env.

### M2 — CSP allows `unsafe-inline` / `unsafe-eval`
`main.py` CSP `script-src` includes `'unsafe-inline' 'unsafe-eval'`, weakening
XSS defense. Tighten to hashes/nonces once the build allows.

### M3 — Rate limiting only on `/token`
Expensive endpoints — `/api/analyze` (LLM cost, 5-min timeout) and uploads —
have no rate limit. Add `@limiter.limit(...)` to analyze and upload routes to
prevent cost/resource-exhaustion abuse.

### M4 — No account lockout / brute-force backoff
Only a 10/min per-IP limit on `/token`. No lockout after N failures enables slow
distributed brute force. Add temporary lockout/backoff keyed on account.

### M5 — Weak password policy on admin-created accounts
`app/api/users.py` `create_advisor` accepts any admin-supplied password (no min
length); seeded passwords are 1 char. Enforce a min length (≥8) everywhere a
password is set, matching `change-password`.

### M6 — Info disclosure in `/health`
`main.py:108` returns the raw DB exception string. Return a generic message; log
details server-side only.

### M7 — API docs exposed by default
FastAPI `/docs`, `/redoc`, `/openapi.json` are public. Consider disabling in
prod (`docs_url=None`) or protecting them.

---

## LOW

- **L1** `POST /api/analyze/run` (`analyze.py:208`, admin-only) reads an
  arbitrary `file_path` from the request → arbitrary file read by a trusted
  admin. Constrain to the uploads directory.
- **L2** No HSTS header — add once served over TLS.
- **L3** `reload=True` only under `__main__` (dev). Ensure prod launches via a
  process manager without `--reload` and with multiple workers.
- **L4** Consider a global max request-body size at the proxy (upload route
  already caps at 50 MB).

---

## Recommended pre-prod checklist (in order)

1. [x] `ENABLE_DEMO_USERS=false` gate implemented (fixes C1, C2, H1 picker).
2. [x] Startup fails if `JWT_SECRET_KEY` unset in prod (C3); set a strong key.
3. [x] Delete `build_backend.py`, `migrate_prisma.py` (H3).
4. [ ] Refresh-token hardening: httpOnly cookie + rotation, or shorter TTL (H2). **Still open** — larger change touching the frontend auth flow.
5. [x] Explicit CORS origin from env (`CORS_ALLOW_ORIGINS`); never `*` (M1).
6. [x] Rate-limit analyze + upload (M3). [ ] login lockout (M4) still open.
7. [x] Enforce password min length (M5); scrub `/health` (M6); disable `/docs` in prod (M7).
8. [ ] Set `AT_REST_ENCRYPTION_KEY`, keep `LLM_REDACTION=true` (see SECURITY.md).
9. [ ] Serve behind TLS with HSTS; run `pip-audit` / `npm audit` in CI.

### Still open (deferred, need dedicated changes)
- **H2** refresh-token to httpOnly cookie + rotation (frontend auth refactor).
- **M2** tighten CSP (remove `unsafe-inline`/`unsafe-eval`) — needs build nonces.
- **M4** account lockout after repeated failed logins.
- **L1** constrain `/api/analyze/run` file_path to the uploads dir.

### Production `.env` must set
```
ENABLE_DEMO_USERS=false            # or omit entirely (default false)
JWT_SECRET_KEY=<64+ char secret>   # app refuses to boot without it
CORS_ALLOW_ORIGINS=https://app.yourdomain.com
AT_REST_ENCRYPTION_KEY=<fernet key>
LLM_REDACTION=true
```
