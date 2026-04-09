# Business Logic Model — auth-lambda (Unit 6)

**Generated**: 2026-04-06  
**Stage**: Functional Design  
**Basis**: Q1–Q15 design decisions + component-methods.md

---

## Service Boundary

`auth-lambda` owns:
- Operator authentication (login / logout / token refresh)
- JWT lifecycle (issuance, rotation, revocation, JWKS distribution)
- Brute-force protection
- Operator account management (CRUD within a tenant)
- Password management (change, forgot-password, admin reset)
- Session management (per-device tracking, revoke-all)

`auth-lambda` does **NOT** own:
- Tenant creation or management (externally seeded)
- Authorization decisions in other services (each lambda independently verifies the JWT via JWKS)
- Candidate data, campaigns, evaluations, or compliance records

---

## Component Interaction Diagram

```
                     ┌────────────────────────────────────────────┐
                     │              auth-lambda                    │
                     │                                             │
  ──[POST /login]──► │  AuthRouter                                │
  ──[POST /refresh]─►│    └─► AuthService ──► BruteForceProtector │
  ──[POST /logout]──►│         └─► TokenManager                   │
  ──[POST /forgot]──►│         └─► OperatorManager                │
  ──[POST /reset]───►│                                             │
  ──[POST /change]──►│                                             │
  ──[GET  /jwks]────►│                                             │
  ──[CRUD /operators►│                                             │
                     └────────┬───────────────┬──────────────┬───┘
                              │               │              │
                         MongoDB         AWS SES     compliance-lambda
                         Atlas         (email)        (audit events)
```

---

## Flow 1 — Login

**Endpoint**: `POST /api/v1/auth/login`  
**Request**: `{ "email": string, "password": string, "tenant_id": string }`  
**Response**: `{ "access_token": string, "expires_in": 3600, "operator": { operator_id, name, role, tenant_id } }`  
**Side effects**: refresh token set in HTTP-only cookie `__Secure-rt`

```
1. Normalize email to lowercase
2. BruteForceProtector.is_locked(email, tenant_id)
   └─ If locked → return 429 { error: ACCOUNT_LOCKED, retry_after_seconds: N }
3. OperatorManager.get_by_email(email, tenant_id)
   └─ If not found → BruteForceProtector.record_failure() → return 401 { error: INVALID_CREDENTIALS }
   └─ If status = INACTIVE → return 401 { error: ACCOUNT_INACTIVE }
4. AuthService.verify_password(plaintext=password, stored_hash=operator.password_hash)
   └─ (runs to completion — no timing oracle)
   └─ If mismatch → BruteForceProtector.record_failure() → emit AUDIT(AUTH_LOGIN_FAILED) → return 401 { error: INVALID_CREDENTIALS }
5. BruteForceProtector.reset(email, tenant_id)
6. TokenManager.issue_access_token(operator_id, tenant_id, role)
7. TokenManager.issue_refresh_token(operator_id, tenant_id, user_agent, ip_address)
8. Update operator.last_login_at, operator.last_login_ip
9. Emit AUDIT(AUTH_LOGIN_SUCCESS) → CloudWatch + compliance-lambda (async)
10. Return 200: { access_token, expires_in: 3600, operator: { ... } }
    Set-Cookie: __Secure-rt={raw_refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/api/v1/auth/refresh
```

---

## Flow 2 — Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`  
**Request**: Cookie `__Secure-rt` (refresh token value)  
**Response**: `{ "access_token": string, "expires_in": 3600 }`  
**Side effects**: old refresh token revoked; new refresh token set in HTTP-only cookie

```
1. Extract raw refresh token from __Secure-rt cookie
   └─ If missing → return 401 { error: NO_REFRESH_TOKEN }
2. Compute SHA-256(raw_token) → lookup RefreshToken by token_hash
   └─ If not found → return 401 { error: REFRESH_TOKEN_INVALID }
3. Check RefreshToken.revoked
   └─ If revoked → REUSE DETECTION:
      a. Revoke ALL refresh tokens for that operator_id
      b. Emit AUDIT(REFRESH_TOKEN_REUSE_DETECTED) → CloudWatch
      c. Return 401 { error: REFRESH_TOKEN_REUSED }
4. Check RefreshToken.expires_at > now()
   └─ If expired → return 401 { error: REFRESH_TOKEN_EXPIRED }
5. Load operator by RefreshToken.operator_id
   └─ If status = INACTIVE → return 401 { error: ACCOUNT_INACTIVE }
6. Mark old RefreshToken.revoked = true, revoked_at = now()
7. TokenManager.issue_access_token(operator_id, tenant_id, role)
8. TokenManager.issue_refresh_token(operator_id, tenant_id, user_agent, ip_address)
9. Return 200: { access_token, expires_in: 3600 }
   Set-Cookie: __Secure-rt={new_raw_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/api/v1/auth/refresh
```

---

## Flow 3 — Logout

**Endpoint**: `POST /api/v1/auth/logout`  
**Auth required**: valid access token in `Authorization: Bearer` header  
**Request**: empty body  
**Response**: `204 No Content`

```
1. Validate access token (signature + expiry + not in revoked_jwts)
2. Extract jti from access token payload
3. Insert jti into revoked_jwts with expires_at = token's exp claim
4. Extract raw refresh token from __Secure-rt cookie (if present)
5. If refresh token found → hash → lookup → mark revoked=true, revoked_at=now()
6. Emit AUDIT(AUTH_LOGOUT) → CloudWatch only
7. Return 204
   Set-Cookie: __Secure-rt=; HttpOnly; Secure; Max-Age=0; Path=/api/v1/auth/refresh  (clear cookie)
```

---

## Flow 4 — Revoke All Sessions

**Endpoint**: `POST /api/v1/auth/sessions/revoke-all`  
**Auth required**: valid access token  
**Authorization**: self (any role) OR ADMIN revoking for another operator (body: `{ operator_id }`)  
**Response**: `204 No Content`

```
1. Validate access token
2. Determine target_operator_id (self if no body; body.operator_id if ADMIN)
3. If body.operator_id ≠ requester's sub → verify requester role = ADMIN → else 403
4. Bulk-update all refresh_tokens WHERE operator_id = target AND revoked = false
   → SET revoked = true, revoked_at = now()
5. Return 204
```

---

## Flow 5 — Self-Service Password Change

**Endpoint**: `POST /api/v1/auth/change-password`  
**Auth required**: valid access token  
**Request**: `{ "current_password": string, "new_password": string }`  
**Response**: `200 OK { "message": "Password changed. Please log in again." }`

```
1. Validate access token
2. Load operator by sub (operator_id)
3. verify_password(current_password, operator.password_hash)
   └─ If mismatch → return 400 { error: INVALID_CURRENT_PASSWORD }
4. Validate new_password against BR-01 (complexity + HIBP)
5. Verify new_password ≠ current_password (argon2 verify — same check)
   └─ If same → return 400 { error: PASSWORD_SAME_AS_CURRENT }
6. hash_password(new_password) → update operator.password_hash, operator.updated_at
7. Revoke ALL refresh tokens for operator (bulk set revoked=true)
8. Insert current access token's jti into revoked_jwts
9. Emit AUDIT(PASSWORD_CHANGED) → CloudWatch + compliance-lambda
10. Return 200 { message: "Password changed. Please log in again." }
    Set-Cookie: __Secure-rt=; Max-Age=0 (clear cookie)
```

---

## Flow 6 — Forgot Password Request

**Endpoint**: `POST /api/v1/auth/forgot-password`  
**Auth required**: none  
**Request**: `{ "email": string, "tenant_id": string }`  
**Response**: `200 OK` always (email enumeration guard)

```
1. Normalize email
2. Look up operator by email + tenant_id
3. (Always return 200 regardless of lookup result — prevents enumeration)
4. If operator found AND status = ACTIVE:
   a. Invalidate existing password_reset_tokens for this operator
      (bulk set used = true)
   b. Generate 32-byte cryptographically random URL-safe token
   c. Store SHA-256(token) in password_reset_tokens:
      { token_hash, operator_id, tenant_id, expires_at: now() + 1h, used: false, requesting_ip }
   d. Send email via AWS SES:
      Subject: "Restablece tu contraseña — EntreVista AI"
      Body: link = https://{DASHBOARD_URL}/reset-password?token={raw_token}
      Expiry reminder: "Este enlace expira en 1 hora."
5. Emit AUDIT(PASSWORD_RESET_REQUESTED) → CloudWatch + compliance-lambda
6. Return 200 { message: "Si el email existe, recibirás instrucciones de restablecimiento." }
```

---

## Flow 7 — Password Reset Consumption

**Endpoint**: `POST /api/v1/auth/reset-password`  
**Auth required**: none  
**Request**: `{ "token": string, "new_password": string }`  
**Response**: `200 OK`

```
1. Compute SHA-256(token)
2. Look up password_reset_tokens by token_hash
   └─ If not found OR used=true OR expires_at ≤ now() → return 400 { error: RESET_TOKEN_INVALID }
3. Validate new_password against BR-01
4. hash_password(new_password) → update operator.password_hash, operator.updated_at
5. Mark password_reset_tokens.used=true, used_at=now()
6. Revoke ALL refresh tokens for operator
7. Emit AUDIT(PASSWORD_RESET_COMPLETED) → CloudWatch + compliance-lambda
8. Return 200 { message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." }
```

---

## Flow 8 — Create Operator (ADMIN only)

**Endpoint**: `POST /api/v1/operators`  
**Auth required**: valid access token + role = ADMIN  
**Request**: `{ "email": string, "name": string, "role": "ADMIN"|"RECRUITER", "password": string }`  
**Response**: `201 Created { operator_id, email, name, role, tenant_id, status, created_at }`

```
1. Validate access token + role = ADMIN → else 403
2. Validate request fields (email format, name non-empty, role valid)
3. Validate password against BR-01
4. Check uniqueness: email + tenant_id not already in operators → else 409
5. hash_password(password)
6. Insert operator document with status = ACTIVE
7. Emit AUDIT(OPERATOR_CREATED) → CloudWatch
8. Return 201 { operator } (password_hash excluded)
```

---

## Flow 9 — Deactivate Operator (ADMIN only)

**Endpoint**: `POST /api/v1/operators/{operator_id}/deactivate`  
**Auth required**: valid access token + role = ADMIN  
**Authorization guard**: ADMIN cannot deactivate themselves

```
1. Validate access token + role = ADMIN → else 403
2. Check operator_id ≠ requester's own operator_id → else 400 { error: CANNOT_DEACTIVATE_SELF }
3. Load target operator by operator_id + tenant_id (same tenant only)
4. If already INACTIVE → return 200 (idempotent)
5. In MongoDB transaction:
   a. Set operators.status = INACTIVE, updated_at = now()
   b. Bulk-revoke all active refresh_tokens for operator_id
6. Emit AUDIT(OPERATOR_DEACTIVATED) → CloudWatch + compliance-lambda
7. Return 200 { operator_id, status: "INACTIVE" }
```

---

## Flow 10 — JWKS Key Distribution

**Endpoint**: `GET /.well-known/jwks.json`  
**Auth required**: none (public)

```
1. Read JWT_PUBLIC_KEY from in-memory cache (loaded from Secrets Manager at cold start)
2. Parse RSA public key → derive JWKS JWK object:
   { kty: "RSA", use: "sig", alg: "RS256", kid: SHA-256(public_key)[0:8], n: base64url(modulus), e: base64url(exponent) }
3. Return 200 { "keys": [ <JWK> ] }
   Headers: Cache-Control: public, max-age=3600
```

---

## Algorithm Summary

| Algorithm | Usage |
|---|---|
| **Argon2id** | Password hashing (store + verify) |
| **RS256 (RSA-SHA256)** | JWT signing (private) + verification (public) |
| **SHA-256** | Hashing refresh tokens before storage; hashing password reset tokens |
| **CSPRNG (32 bytes)** | Generating refresh token values + password reset tokens |
| **UUID v4** | `operator_id`, `jti`, `tenant_id` generation |

---

## State Machine — Operator Status

```
         ┌──────────────────┐
         │  (seed / create) │
         └────────┬─────────┘
                  ▼
         ┌────────────────┐
         │     ACTIVE     │◄──── login, refresh, change-password
         └────────┬───────┘
                  │ ADMIN: deactivate
                  ▼
         ┌────────────────┐
         │   INACTIVE     │  (no login allowed; all sessions revoked)
         └────────────────┘
```

---

## Error Codes Reference

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Email/password mismatch |
| 401 | `ACCOUNT_INACTIVE` | Operator is deactivated |
| 401 | `TOKEN_INVALID` | JWT signature/format invalid |
| 401 | `TOKEN_EXPIRED` | JWT past `exp` |
| 401 | `TOKEN_REVOKED` | JWT jti found in revoked_jwts |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh token not found |
| 401 | `REFRESH_TOKEN_EXPIRED` | Refresh token past expires_at |
| 401 | `REFRESH_TOKEN_REUSED` | Revoked token presented (theft signal) |
| 401 | `NO_REFRESH_TOKEN` | Missing __Secure-rt cookie |
| 400 | `RESET_TOKEN_INVALID` | Password reset token expired/used/not found |
| 400 | `INVALID_CURRENT_PASSWORD` | Current password wrong in change-password |
| 400 | `PASSWORD_SAME_AS_CURRENT` | New password equals current |
| 400 | `PASSWORD_COMPLEXITY` | Password fails BR-01 rules |
| 400 | `CANNOT_DEACTIVATE_SELF` | Admin tries to deactivate own account |
| 403 | `INSUFFICIENT_ROLE` | RECRUITER attempted ADMIN-only operation |
| 409 | `EMAIL_DUPLICATE` | Email already exists in tenant |
| 422 | `VALIDATION_ERROR` | Request body field validation failed |
| 429 | `ACCOUNT_LOCKED` | Progressive brute-force lockout |
