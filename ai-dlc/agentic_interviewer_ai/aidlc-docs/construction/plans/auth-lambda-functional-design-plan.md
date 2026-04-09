# Functional Design Plan — auth-lambda (Unit 6)

**Unit**: Unit 6 — auth-lambda (`entrevista-auth`)
**Stage**: CONSTRUCTION — Functional Design
**Created**: 2026-04-06
**Status**: COMPLETE — Artifacts generated 2026-04-06

---

## Plan Overview

Design the complete business logic for `auth-lambda` — the operator authentication and account management service. This unit is foundational: it issues the JWT tokens used by every other lambda and the dashboard. 

**Components in scope**: AuthRouter, AuthService, TokenManager, BruteForceProtector, OperatorManager  
**Story coverage**: US-18 — Authenticate Into Dashboard (2 SP)  
**External dependencies**: MongoDB Atlas, AWS Secrets Manager (RS256 key pair)

---

## Execution Steps

- [x] Step 1: Clarify domain model (Operator and Tenant entities)
- [x] Step 2: Clarify business rules (brute force, password, session)
- [x] Step 3: Clarify data flow (token lifecycle, refresh rotation)
- [x] Step 4: Clarify integration contracts (how other lambdas verify JWTs)
- [x] Step 5: Clarify operator lifecycle (provisioning, password reset)
- [x] Step 6: Generate `business-logic-model.md`
- [x] Step 7: Generate `business-rules.md`
- [x] Step 8: Generate `domain-entities.md`

---

## Questions — Please fill in all [Answer]: tags

---

### Section 1 — Domain Model

## Question 1
What additional fields should the `Operator` document in MongoDB include beyond `email`, `name`, `role`, and `tenant_id`?

A) Minimal — only `email`, `name`, `role`, `tenant_id`, `password_hash`, `status`, `created_at`, `updated_at`
B) Medium — add `last_login_at`, `last_login_ip`
C) Extended — add `last_login_at`, `last_login_ip`, `phone`, `avatar_url`, `language_preference`
D) Other (please describe after [Answer]: tag below)

[B]: 

---

## Question 2
Should `auth-lambda` also own and manage `Tenant` documents in MongoDB, or is `tenant_id` purely a foreign-key string that is seeded/managed externally (e.g., manually in the DB)?

A) auth-lambda owns Tenant CRUD — it has endpoints to create/update/deactivate tenants (ADMIN-only)
B) tenant_id is a seeded constant for MVP — auth-lambda never creates or manages Tenant documents
C) Separate tenant management service in the future, but for MVP auth-lambda bootstraps the first tenant via a seed script
D) Other (please describe after [Answer]: tag below)

[C]: 

---

## Question 3
Should refresh tokens track device/session context (e.g., `user_agent`, `device_id`, `ip_address`) to support multi-device token management (e.g., "log out of all devices")?

A) Yes — store `user_agent` + `ip_address` per refresh token; expose "revoke all sessions" endpoint
B) Minimal — store only `operator_id`, `jti`, `expires_at`; no per-device tracking
C) Yes — store `user_agent` + `ip_address` + `device_label`; allow per-device logout from profile settings
D) Other (please describe after [Answer]: tag below)

[A]: 

---

### Section 2 — Business Rules

## Question 4
Is the brute-force lockout **flat** (always 15 min after 5 failures) or **progressive** (15 min → 30 min → 60 min with repeated violations)?

A) Flat: 5 consecutive failures → exactly 15 minutes lockout, always
B) Progressive: 5 failures → 15 min; next 5 within 24h → 30 min; next 5 within 24h → 60 min
C) Flat per hour: track failures in a rolling 1-hour window; lock for 15 min when window hits 5
D) Other (please describe after [Answer]: tag below)

[B]: 

---

## Question 5
What are the **password complexity requirements** for operator accounts?

A) Minimal: minimum 8 characters, at least 1 number
B) Standard: minimum 10 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
C) Strict: minimum 12 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character, no common passwords (HIBP check)
D) Other (please describe after [Answer]: tag below)

[C]: 

---

## Question 6
When an operator is **deactivated**, should all their active refresh tokens be **immediately invalidated** (force logout from all devices)?

A) Yes — deactivation immediately revokes all active refresh tokens for that operator
B) No — tokens expire naturally; deactivated operators just can't log in again
C) Yes, but only for RECRUITER role; ADMIN deactivation requires a secondary ADMIN to confirm + force revoke
D) Other (please describe after [Answer]: tag below)

[A]: 

---

## Question 7
Is the operator `email` **globally unique** across all tenants, or **unique only within a tenant** (same email allowed in different tenants)?

A) Globally unique: one email = one account across the entire platform
B) Tenant-scoped: same email can exist in different tenants (composite key: email + tenant_id)
C) Other (please describe after [Answer]: tag below)

[B]: 

---

### Section 3 — Data Flow & Token Lifecycle

## Question 8
**Refresh token rotation strategy**: when an operator uses a refresh token to get a new access token, should the refresh token be rotated (old invalidated, new issued) or reused until natural expiry?

A) Rotate always — old refresh token is invalidated immediately; new one issued with each refresh call
B) Reuse — same refresh token is valid for its full 7-day TTL; no rotation
C) Rotate on first use per 24h — rotate once per day to balance security and UX
D) Other (please describe after [Answer]: tag below)

[A]: 

---

## Question 9
How will **other lambdas** (conversation-lambda, evaluation-lambda, etc.) validate JWT access tokens from the dashboard?

A) Lambdas fetch the RS256 public key directly from AWS Secrets Manager at cold start and cache it in memory
B) auth-lambda exposes a `GET /.well-known/jwks.json` endpoint; other lambdas call it to fetch the public key
C) Public key is baked as an environment variable in each lambda (set at deploy time, not dynamic)
D) Other (please describe after [Answer]: tag below)

[B]: 

---

## Question 10
Should **login attempt events** (successful logins + failed attempts + lockouts) be sent to `compliance-lambda` for immutable audit logging, or logged only locally to CloudWatch?

A) Both — log to CloudWatch AND send audit events to compliance-lambda for every login attempt
B) CloudWatch only — compliance-lambda is for candidate consent and evaluation audits, not operator access
C) Selective — only send FAILED_LOGIN and ACCOUNT_LOCKED events to compliance-lambda; successful logins go to CloudWatch only
D) Other (please describe after [Answer]: tag below)

[A]: 

---

### Section 4 — Operator Lifecycle & Provisioning

## Question 11
How is the **first ADMIN operator** created for a new tenant? (There is no existing operator to call `POST /api/v1/operators`)

A) Seed script: a one-time `scripts/seed_admin.py` that inserts the first operator directly into MongoDB
B) Bootstrap endpoint: a special `POST /api/v1/auth/bootstrap` endpoint that creates the first operator only when no operators exist for a tenant yet (self-disabling)
C) Manual insertion: developer inserts first admin record in MongoDB Atlas console with hashed password
D) Other (please describe after [Answer]: tag below)

[A]: 

---

## Question 12
Should a **"Forgot Password" / password reset** flow be in scope for MVP?

A) Yes — email-based reset: send a time-limited reset link via SES/SendGrid; operator resets via a URL
B) No — out of scope for MVP; admin resets passwords manually via `PATCH /api/v1/operators/{id}`
C) Admin-reset only — ADMIN operator can call `POST /api/v1/operators/{id}/reset-password` to generate and return a one-time temporary password
D) Other (please describe after [Answer]: tag below)

[A]: 

---

## Question 13
Should logged-in operators be able to **change their own password** via a self-service endpoint (different from admin password reset)?

A) Yes — `POST /api/v1/auth/change-password` requiring current_password + new_password, invalidates all refresh tokens
B) No — password changes are admin-only operations for MVP
C) Yes, but only require the current password (no admin involved); do NOT invalidate other sessions
D) Other (please describe after [Answer]: tag below)

[A]: 

---

### Section 5 — Security (Security Baseline Enabled: SECURITY-01 to SECURITY-15)

## Question 14
Should auth-lambda expose a **JWKS discovery endpoint** (`GET /.well-known/jwks.json`) for dynamic public key distribution to other services?

A) Yes — expose JWKS endpoint; other lambdas call it at cold start and cache the key set
B) No — public key is distributed via environment variables or Secrets Manager directly; no discovery endpoint needed
C) Yes, but protected behind an internal-network-only path (not publicly accessible via API Gateway)
D) Other (please describe after [Answer]: tag below)

[A]: 

---

## Question 15
For **API Gateway rate limiting** on auth endpoints: should there be request throttling at the infrastructure level in addition to the application-level brute-force protection?

A) Yes — API Gateway throttling: 10 req/sec per IP on `/auth/login`; 100 req/sec on all other endpoints
B) Application-level brute-force protection is sufficient for MVP; no additional API Gateway throttling
C) Yes — use AWS WAF with a rate-based rule (e.g., 100 requests per 5 min per IP) on the API Gateway stage
D) Other (please describe after [Answer]: tag below)

[C]: 

---

*Please fill all [Answer]: fields and reply "Terminé" when done.*
