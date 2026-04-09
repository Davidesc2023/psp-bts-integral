# Domain Entities — auth-lambda (Unit 6)

**Generated**: 2026-04-06  
**Stage**: Functional Design  
**Basis**: Q1–Q15 design decisions

---

## MongoDB Collections

### Collection: `operators`

Represents a single human user who can access the dashboard (recruiter or admin).

```
Operator {
  _id:              ObjectId          -- MongoDB document ID
  operator_id:      String (UUID v4)  -- Application-level stable ID (used in JWTs + cross-service)
  tenant_id:        String (UUID v4)  -- Tenant partition key (FK — managed via seed, no Tenant collection)
  email:            String            -- Unique within tenant (index: { email, tenant_id }, unique: true)
  name:             String            -- Full display name
  role:             Enum              -- "ADMIN" | "RECRUITER"
  password_hash:    String            -- Argon2id hash of password
  status:           Enum              -- "ACTIVE" | "INACTIVE"
  last_login_at:    DateTime | null   -- UTC timestamp of most recent successful login
  last_login_ip:    String | null     -- IPv4/IPv6 of client at most recent login
  created_at:       DateTime          -- UTC timestamp of account creation
  updated_at:       DateTime          -- UTC timestamp of last modification
  created_by:       String (UUID v4)  -- operator_id of creator (null for bootstrapped admin)
}
```

**MongoDB Indexes**:
```
{ email: 1, tenant_id: 1 }   unique: true   -- tenant-scoped email uniqueness
{ operator_id: 1 }            unique: true   -- fast lookup by app ID
{ tenant_id: 1, status: 1 }                  -- list active operators per tenant
```

**Invariants**:
- `email` + `tenant_id` is the composite unique key (same email allowed in different tenants)
- `operator_id` is immutable once created
- Soft-delete only — records are never physically removed; `status = "INACTIVE"` instead
- `password_hash` is never returned in any API response

---

### Collection: `refresh_tokens`

One document per active refresh token. Rotation policy: old token deleted on use; new token inserted.

```
RefreshToken {
  _id:           ObjectId          -- MongoDB document ID
  jti:           String (UUID v4)  -- JWT ID = unique identifier for this token
  operator_id:   String (UUID v4)  -- Owner operator
  tenant_id:     String (UUID v4)  -- Tenant the operator belongs to
  token_hash:    String            -- SHA-256 hash of the raw refresh token value (never store plaintext)
  expires_at:    DateTime          -- UTC expiry (issued_at + 7 days)
  issued_at:     DateTime          -- UTC issuance timestamp
  user_agent:    String | null     -- HTTP User-Agent header captured at login/refresh
  ip_address:    String | null     -- Remote IP captured at login/refresh
  revoked:       Boolean           -- Explicitly revoked (by logout or deactivation)
  revoked_at:    DateTime | null   -- UTC timestamp of revocation (null if not revoked)
}
```

**MongoDB Indexes**:
```
{ jti: 1 }                          unique: true   -- fast revocation check
{ token_hash: 1 }                   unique: true   -- fast token lookup on refresh
{ operator_id: 1, revoked: 1 }                     -- list all active sessions per operator
{ expires_at: 1 }                   TTL index (expireAfterSeconds: 0) -- auto-purge expired tokens
```

**Invariants**:
- Raw token value is never stored — only SHA-256 hash (`token_hash`)
- `token_hash` replaces the lookup on raw value; incoming token is hashed before query
- On rotation: old document's `revoked = true, revoked_at = now()`; new document inserted
- On "revoke all sessions": all documents with `operator_id = X, revoked = false` are bulk-updated to `revoked = true`
- Expired + revoked documents are purged automatically via TTL index

---

### Collection: `login_attempts`

Tracks failed login attempts per email per tenant for brute-force protection.  
Progressive lockout windows are tracked via `lockout_tier`.

```
LoginAttempt {
  _id:             ObjectId          -- MongoDB document ID
  email:           String            -- Normalized (lowercase) email
  tenant_id:       String (UUID v4)  -- Tenant context
  failure_count:   Int               -- Consecutive failures in current window
  lockout_tier:    Int               -- 0 = never locked; 1 = first lockout tier; 2 = second; 3 = third
  locked_until:    DateTime | null   -- UTC timestamp of lockout expiry (null = not locked)
  last_failure_at: DateTime | null   -- UTC timestamp of most recent failure
  window_start_at: DateTime | null   -- Start of the current 24h progressive window
}
```

**MongoDB Indexes**:
```
{ email: 1, tenant_id: 1 }   unique: true   -- one record per email+tenant
{ locked_until: 1 }          TTL index (expireAfterSeconds: 0) -- auto-clear after lockout expires
```

**Invariants**:
- Record is created on first failure; reset (failure_count=0, lockout_tier stays) on successful login
- `window_start_at` anchors the 24h window for progressive tier escalation
- After 24h with no new failures, `window_start_at` resets and `lockout_tier` resets to 0

---

### Collection: `password_reset_tokens`

One-time tokens for email-based password reset flow.

```
PasswordResetToken {
  _id:            ObjectId          -- MongoDB document ID
  token_hash:     String            -- SHA-256 of the raw URL-safe token (never store plaintext)
  operator_id:    String (UUID v4)  -- Target operator
  tenant_id:      String (UUID v4)  -- Tenant context
  expires_at:     DateTime          -- UTC expiry (issued_at + 1 hour)
  used:           Boolean           -- True after the token has been consumed
  used_at:        DateTime | null   -- UTC timestamp of consumption
  issued_at:      DateTime          -- UTC issuance timestamp
  requesting_ip:  String | null     -- IP that requested the reset
}
```

**MongoDB Indexes**:
```
{ token_hash: 1 }    unique: true   -- fast lookup on reset attempt
{ operator_id: 1 }                  -- cancel previous tokens when new one is issued
{ expires_at: 1 }    TTL index (expireAfterSeconds: 0) -- auto-purge expired tokens
```

**Invariants**:
- Only one valid (unused + non-expired) token per operator at a time; issuing a new token invalidates previous ones
- Token hash is computed with SHA-256 before storage
- Raw token is returned once (in the reset email link) and never stored
- A used token cannot be reused (idempotency check)

---

### Collection: `revoked_jwts`

Short-lived blacklist of access token JTIs that have been explicitly revoked (logged-out before expiry).

```
RevokedJWT {
  _id:         ObjectId    -- MongoDB document ID
  jti:         String      -- JWT ID from the access token payload
  expires_at:  DateTime    -- Mirrors the JWT's `exp` claim (TTL cleanup anchor)
}
```

**MongoDB Indexes**:
```
{ jti: 1 }         unique: true   -- O(1) revocation check on every protected request
{ expires_at: 1 }  TTL index (expireAfterSeconds: 0) -- auto-purge when JWT would have expired anyway
```

**Invariants**:
- Only access tokens are JTI-blacklisted here; refresh tokens use the `refresh_tokens.revoked` flag
- Auto-purged once the JWT's natural expiry passes (revocation check is only useful while the JWT is still signature-valid)

---

## Entity Relationship Diagram

```
Operator ─── (has many) ──→ RefreshToken      (operator_id FK)
Operator ─── (has many) ──→ PasswordResetToken (operator_id FK)
LoginAttempt  (keyed by email + tenant_id, not operator_id — exists before successful auth)
RevokedJWT    (standalone — keyed by jti only)
```

---

## External Dependencies (data / integration)

| Dependency | Usage |
|---|---|
| **AWS Secrets Manager** | Stores RS256 private key (`JWT_PRIVATE_KEY`) and public key (`JWT_PUBLIC_KEY`) |
| **AWS SES / SendGrid** | Sends password reset emails (password reset flow) |
| **compliance-lambda** | Receives AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILED, ACCOUNT_LOCKED audit events |
| **MongoDB Atlas** | Persistent store for all 5 collections above |

*`tenant_id` values are seeded externally via `scripts/seed_admin.py` — no Tenant collection owned by auth-lambda.*
