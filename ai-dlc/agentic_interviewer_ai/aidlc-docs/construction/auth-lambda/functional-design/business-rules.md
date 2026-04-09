# Business Rules — auth-lambda (Unit 6)

**Generated**: 2026-04-06  
**Stage**: Functional Design  
**Basis**: Q1–Q15 design decisions

---

## BR-01 — Password Complexity (Strict)

**Source**: Q5 = C  
**Applies to**: account creation, admin password reset, self-service password change

A password is **valid** if and only if:
1. Length ≥ 12 characters
2. Contains ≥ 1 uppercase letter (A–Z)
3. Contains ≥ 1 lowercase letter (a–z)
4. Contains ≥ 1 digit (0–9)
5. Contains ≥ 1 special character from the set: `!@#$%^&*()-_=+[]{}|;:,.<>?/`
6. Has NOT appeared in a known data breach — verified via [HIBP Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) (k-anonymity model: send only first 5 chars of SHA-1 hash)

**Rejection response**: `422 Unprocessable Entity` with field-level validation errors listing which criteria failed.  
**HIBP connectivity failure**: log warning; **do not block** the password change (fail open on HIBP check).

---

## BR-02 — Progressive Brute-Force Lockout

**Source**: Q4 = B  
**Applies to**: `POST /api/v1/auth/login`

| Condition | Lockout Duration |
|---|---|
| 5 consecutive failures | 15 minutes |
| 5 more failures within 24h of first lockout | 30 minutes |
| 5 more failures within 24h of second lockout | 60 minutes |
| 24 hours with no new failures after any lockout | Tier resets to 0 |

**Implementation**:
- Track `failure_count`, `lockout_tier`, `locked_until`, `window_start_at` in `login_attempts` collection (keyed by email + tenant_id)
- On login attempt: check `is_locked` first → if locked return `429` immediately (no password hash comparison)
- On failure: `record_failure()` → increment `failure_count`; if `failure_count` crosses threshold → compute lockout duration by tier → set `locked_until` → escalate tier
- On success: `reset()` → set `failure_count = 0` (tier remains until 24h window elapses)
- Response when locked: `{ "error": "ACCOUNT_LOCKED", "retry_after_seconds": N }`
- **Timing-safe**: password hash comparison (`argon2id.verify`) always runs to completion before checking result — no early exit on mismatch (prevents timing oracle)

---

## BR-03 — Argon2id Password Hashing

**Source**: architectural decision (Security Baseline SECURITY-01)  
**Applies to**: password creation, password change, password reset

- Algorithm: **Argon2id** (hybrid of Argon2i and Argon2d)
- Parameters (configurable via env vars):
  - `ARGON2_MEMORY_COST`: default `65536` kB (64 MB)
  - `ARGON2_TIME_COST`: default `3` iterations
  - `ARGON2_PARALLELISM`: default `1`
- Salt: generated internally by the Argon2 library (16 bytes random per hash)
- Output: Argon2 encoded string (includes hash + params + salt in a single storable string)
- **Never log or expose** `password_hash` in any response or log line

---

## BR-04 — JWT Access Token Rules

**Source**: architectural design + Security Baseline  
**Applies to**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`

- Algorithm: **RS256** (asymmetric — private key signs, public key verifies)
- TTL: **60 minutes** from issuance
- Payload claims:
  ```json
  {
    "sub":        "operator_id (UUID v4)",
    "tenant_id":  "UUID v4",
    "role":       "ADMIN | RECRUITER",
    "exp":        1234567890,
    "iat":        1234567890,
    "jti":        "UUID v4 (unique per token)"
  }
  ```
- `jti` (JWT ID): must be checked against `revoked_jwts` collection on every protected request
- Private key sourced from AWS Secrets Manager at cold start; cached in memory for Lambda lifetime
- Rejected tokens → `401 Unauthorized` with `{ "error": "TOKEN_INVALID" }` or `"TOKEN_EXPIRED"`

---

## BR-05 — Refresh Token Rules

**Source**: Q3 = A, Q8 = A  
**Applies to**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`

- TTL: **7 days** from issuance
- Storage: SHA-256 hash stored in `refresh_tokens` collection; raw value returned to client once (via HTTP-only cookie set by the response)
- Per-session metadata captured: `user_agent`, `ip_address`, `issued_at`
- **Rotation on every use**: on each `/auth/refresh` call:
  1. Incoming token value is hashed; lookup by `token_hash`
  2. Verify `revoked = false` and `expires_at > now()`
  3. Mark old document `revoked = true, revoked_at = now()`
  4. Issue new refresh token; insert new `refresh_tokens` document
  5. Return new access token + new refresh token
- **Reuse detection**: if a revoked `token_hash` is presented, treat as token theft → revoke ALL sessions for that operator + return `401 REFRESH_TOKEN_REUSED`
- `POST /api/v1/auth/sessions/revoke-all` (ADMIN or self only): bulk-marks all `refresh_tokens` for operator as `revoked = true`

---

## BR-06 — Tenant-Scoped Email Uniqueness

**Source**: Q7 = B  
**Applies to**: `POST /api/v1/operators` (create operator)

- MongoDB unique index: `{ email: 1, tenant_id: 1 }`
- The same email address may exist as separate operator accounts in different tenants
- Email is normalized to lowercase before storage and lookup
- Duplicate email within same tenant → `409 Conflict` with `{ "error": "EMAIL_DUPLICATE" }`

---

## BR-07 — Deactivation Force-Revokes All Sessions

**Source**: Q6 = A  
**Applies to**: `POST /api/v1/operators/{operator_id}/deactivate`

On operator deactivation:
1. Set `operators.status = "INACTIVE"` and `updated_at = now()`
2. Bulk-update all `refresh_tokens` where `operator_id = X` and `revoked = false` → set `revoked = true, revoked_at = now()`
3. These steps execute atomically in a MongoDB transaction (session-level)
4. Active JWT access tokens remain valid until their 60-min natural expiry — deactivated operators' JWTs are checked against `operators.status` on each protected request (`401` if `INACTIVE`)

> **Note**: Because access tokens are short-lived (60 min), the status check in the verifier is the primary realtime enforcement for deactivated accounts.

---

## BR-08 — Self-Service Password Change

**Source**: Q13 = A  
**Applies to**: `POST /api/v1/auth/change-password`

Request: `{ current_password, new_password }`  
Sequence:
1. Verify `current_password` against stored `password_hash` (full Argon2id verify — no early exit)
2. Validate `new_password` against BR-01 (complexity + HIBP)
3. `new_password` must be different from `current_password` (Argon2 verify: fail if same)
4. Hash `new_password` → update `operators.password_hash` and `operators.updated_at`
5. Revoke ALL `refresh_tokens` for the operator (`revoked = true`) + insert current JWT's `jti` into `revoked_jwts`
6. Return `200 OK` — client must redirect to login

---

## BR-09 — Email-Based Password Reset Flow

**Source**: Q12 = A  
**Applies to**: `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`

**Step 1 — Request reset** (`POST /api/v1/auth/forgot-password`, body: `{ email, tenant_id }`):
1. Look up operator by `email + tenant_id`
2. **Always** respond `200 OK` regardless of whether the email exists (prevents email enumeration)
3. If operator found and `status = ACTIVE`:
   a. Invalidate any previous unused `password_reset_tokens` for this operator
   b. Generate a 32-byte URL-safe random token
   c. Store `SHA-256(token)` in `password_reset_tokens` with `expires_at = now() + 1h`
   d. Send email via **AWS SES** with reset link: `https://{dashboard_url}/reset-password?token={raw_token}`
4. Log `PASSWORD_RESET_REQUESTED` event to CloudWatch + compliance-lambda

**Step 2 — Consume reset** (`POST /api/v1/auth/reset-password`, body: `{ token, new_password }`):
1. Compute `SHA-256(token)` → look up in `password_reset_tokens`
2. Verify `used = false` and `expires_at > now()` → else `400 BAD_RESET_TOKEN`
3. Validate `new_password` against BR-01
4. Update `operators.password_hash`
5. Mark `password_reset_tokens.used = true, used_at = now()`
6. Revoke all active `refresh_tokens` for the operator
7. Log `PASSWORD_RESET_COMPLETED` event to CloudWatch + compliance-lambda

**Email provider**: AWS SES (primary); SendGrid as configurable alternative via `EMAIL_PROVIDER` env var.

---

## BR-10 — Admin Password Reset

**Source**: Q12 = A (admin can also reset via PATCH — complementary to email flow)  
**Applies to**: `PATCH /api/v1/operators/{operator_id}` (ADMIN only, providing `new_password`)

Same complexity validation (BR-01). ADMIN sets a new password on behalf of an operator. All active refresh tokens revoked.

---

## BR-11 — First Admin Provisioning

**Source**: Q11 = A  
**Applies to**: deployment bootstrap

A one-time `scripts/seed_admin.py` script:
1. Accepts: `TENANT_ID`, `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (via env vars or prompts)
2. Validates password against BR-01
3. Hashes password with Argon2id (BR-03)
4. Inserts `Operator` document with `role = ADMIN` directly into MongoDB Atlas
5. Idempotent — if an ADMIN for the given `tenant_id` already exists, the script exits without modification
6. `tenant_id` is a manually chosen UUID (seeded by developer — no Tenant collection)

---

## BR-12 — JWKS Public Key Discovery

**Source**: Q9 = B, Q14 = A  
**Applies to**: `GET /.well-known/jwks.json`

- Publicly accessible endpoint (no auth required — public key distribution is safe)
- Returns RS256 public key in **JWK Set format** (`{ "keys": [ { "kty": "RSA", "use": "sig", "alg": "RS256", "kid": "...", "n": "...", "e": "AQAB" } ] }`)
- Public key sourced from AWS Secrets Manager (`JWT_PUBLIC_KEY`) at Lambda cold start; cached in memory
- Other lambdas call this endpoint once at cold start and cache the key in memory (no repeated calls)
- `Cache-Control: public, max-age=3600` header on response

---

## BR-13 — Audit Event Emission

**Source**: Q10 = A  
**Applies to**: every authentication event

| Event | CloudWatch | compliance-lambda |
|---|---|---|
| `AUTH_LOGIN_SUCCESS` | ✅ | ✅ |
| `AUTH_LOGIN_FAILED` | ✅ | ✅ |
| `ACCOUNT_LOCKED` | ✅ | ✅ |
| `AUTH_LOGOUT` | ✅ | ❌ (local only) |
| `PASSWORD_RESET_REQUESTED` | ✅ | ✅ |
| `PASSWORD_RESET_COMPLETED` | ✅ | ✅ |
| `PASSWORD_CHANGED` | ✅ | ✅ |
| `OPERATOR_CREATED` | ✅ | ❌ |
| `OPERATOR_DEACTIVATED` | ✅ | ✅ |

compliance-lambda calls are **fire-and-forget** (non-blocking): failure to reach compliance-lambda is logged to CloudWatch but does NOT block the auth response.

---

## BR-14 — Role Authorization Rules

**Applies to**: all operator management endpoints

| Operation | ADMIN | RECRUITER |
|---|---|---|
| Create operator | ✅ | ❌ |
| Update own name | ✅ | ✅ |
| Update other operator | ✅ | ❌ |
| Deactivate operator | ✅ (cannot deactivate self) | ❌ |
| Admin reset password | ✅ | ❌ |
| Self-service change password | ✅ | ✅ |
| Revoke all own sessions | ✅ | ✅ |
| Revoke other operator's sessions | ✅ | ❌ |
| JWKS endpoint | Public (no auth) | Public (no auth) |

---

## BR-15 — AWS WAF Rate Limiting

**Source**: Q15 = C  
**Infrastructure scope** (documented here; enforced in Infrastructure Design):

A **WAF Web ACL** is attached to the API Gateway stage with:
- Rate-based rule: **100 requests per 5 minutes per IP** across all endpoints
- Action on threshold exceeded: `Block` (returns `429 Too Many Requests`)
- Applies platform-wide (complements BR-02 application-level brute-force protection)

---

## BR-16 — Operator Status Check on Protected Endpoints

Every auth-protected request:
1. Validate JWT signature + expiry (from JWKS-cached key)
2. Check `jti` not in `revoked_jwts`
3. Check `operators.status = "ACTIVE"` for the `sub` (operator_id) in the JWT
4. If any check fails → `401 Unauthorized`
