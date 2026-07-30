# Authentication & Authorization Flow

## Overview

TouB POS uses short-lived **JWT access tokens**, rotating opaque refresh tokens,
and **Role-Based Access Control (RBAC)**. Access JWTs stay in browser memory.
Refresh tokens stay in Secure, HttpOnly cookies and are stored only as SHA-256
hashes in MySQL.

---

## Roles

| Role      | Description                                       | Credential |
|-----------|---------------------------------------------------|------------|
| `platform_admin` | TouB POS team bootstrap account used to create business owners only | Username + password |
| `owner`   | One business owner account with full control of that business | Username + password |
| `manager` | Operational management, including Cashier user management | Username + password |
| `cashier` | Stall-scoped POS sales and own order history      | Cashier profile + 4-digit PIN |

`platform_admin` is temporary API-only support for this project. It does not use the owner/manager portal and must not be mixed with customer business users.

---

## Management Login Flow

Platform Admin, Owner, and Manager accounts use username/password login. Cashier accounts are rejected by this endpoint and must use the PIN flow.

```
Client                          Server
  │                               │
  │  POST /api/auth/login          │
  │  { username, password }       │
  │ ─────────────────────────────▶│
  │                               │  1. Rate-limit login attempts
  │                               │  2. Lookup user in DB
  │                               │  3. Reject cashier accounts
  │                               │  4. bcrypt.compare(password, hash)
  │                               │  5. Sign short-lived JWT with identity/session claims
  │                               │  6. Store hashed 8h refresh session in MySQL
  │◀──────────────────────────────│
  │  { token, user } + refresh/CSRF cookies
  │                               │
  │  Keep access JWT in memory    │
```

---

## Authenticated Request Flow

```
Client                          Server
  │                               │
  │  GET /api/products            │
  │  Authorization: Bearer <jwt>  │
  │ ─────────────────────────────▶│
  │                               │  1. authenticate middleware
  │                               │     → jwt.verify(token, SECRET)
  │                               │     → load current user session state
  │                               │     → require active/not deleted and matching session_version/role/scope
  │                               │     → attach verified req.user
  │                               │  2. Route handler executes
  │◀──────────────────────────────│
  │  { success: true, data: [...] }│
```

---

## RBAC Middleware

`authorize(role)` is applied as a second middleware after `authenticate`:

```js
// Example: management route
router.use(authenticate, authorize(['owner', 'manager']));
```

If `req.user.role` is not allowed, returns:

```json
{ "success": false, "code": 403, "message": "Forbidden" }
```

---

## Token Storage And Rotation

| Item | Storage | JavaScript-readable? |
| --- | --- | --- |
| Access JWT | React/module memory | Yes; short-lived and lost on reload |
| `toub_refresh_token` | Secure HttpOnly cookie | No |
| `toub_csrf_token` | Secure API cookie | Readable only when frontend/API share a site |
| CSRF proof | Frontend localStorage | Yes; non-credential value copied to `X-CSRF-Token` |
| Refresh token hash/session lineage | MySQL `refresh_sessions` | Backend only |
| Terminal registration token | localStorage | Yes; independently revocable device credential |

On page load, the frontend calls `POST /api/auth/refresh`. The browser sends the
HttpOnly refresh cookie automatically, while Axios copies the non-credential
CSRF proof returned by the previous login/refresh into `X-CSRF-Token`. A same-site
CSRF cookie must match that header and its MySQL hash. Persisting only the CSRF
proof also supports separate frontend/API domains, where frontend JavaScript
cannot read an API-owned cookie. A successful refresh consumes the old token,
creates a replacement in the same family, rotates both cookies, and returns a
new short-lived access JWT and CSRF proof.

Rotation and reuse handling:

- Raw refresh tokens are never stored in MySQL or returned in JSON.
- A refresh token can be used once. Reuse revokes its whole token family.
- User credential/role/status changes revoke all of that user's refresh sessions.
- Cashier refresh sessions remain bound to the registered device and stall assignment.
- Logout revokes the current refresh session and clears both cookies.
- XSS can still use or steal the current in-memory access token, but cannot read
  the durable HttpOnly credential.

---

## Session Expiry

- Access JWT lifetime: **15 minutes** by default.
- Refresh-session maximum lifetime: **8 hours** by default, matching a cashier shift.
- The Axios client uses one shared refresh request and retries the original API call once.
- An invalid, expired, reused, revoked, or CSRF-failed refresh returns the user to login.

## Immediate Session Invalidation

- Every JWT contains the user's current `session_version`.
- Every protected HTTP request and Socket.IO connection compares that claim with
  the current active, non-deleted user row.
- Updating a user's username, credential, role, or active state increments the
  database version. Soft deletion also increments it.
- A stale token returns `401` with code `SESSION_INVALIDATED`.
- Connected Cashier and Owner/Manager browsers receive
  `user:session_invalidated`, clear the JWT session, and return to login.
- Reactivating a user does not revive tokens issued before deactivation; the
  user must authenticate again.
- Tokens issued before the session-version migration require a one-time login.

---

## Cashier PIN Flow (Terminal Mode)

Cashier terminals use a secondary PIN-based login on top of individual device registration:

1. Owner or Manager registers a named device to a stall; multiple devices may belong to one stall.
2. The raw device token is stored in that browser while MySQL stores only its SHA-256 hash.
3. On terminal wake, the device token loads only the cashier roster assigned to its stall.
4. Cashier selects their profile and enters a 4-digit PIN.
5. `POST /api/auth/pin` verifies the device, cashier PIN, and same-stall assignment.
6. The short-lived cashier JWT includes `device_id` and `stall_id`; its rotating
   refresh session lasts at most eight hours and is bound to the same device.
   Every protected request and refresh presents the matching active device token.
7. Revoking one device blocks its API/socket access and emits `device:revoked`, causing that browser to clear its session immediately. Other stall devices are unaffected.

PIN security:

- PINs are stored as bcrypt hashes, not plain text.
- PIN login uses `bcrypt.compare()`.
- Old development-only plain PINs are upgraded to bcrypt hashes after a successful PIN login.
- `POST /api/auth/pin` has a stricter rate limit than username/password login.
- PINs and PIN hashes are never returned from normal API responses.
- Platform Admin, Owner, and Manager accounts are rejected by the PIN login endpoint.

Credential storage rules:

- Platform Admin/Owner/Manager: `password` contains a bcrypt hash, `pin` is `NULL`.
- Cashier: `password` is `NULL`, `pin` contains a bcrypt hash.
- Username remains required and unique for every user role.

User-management rules:

- `platform_admin` can create business owner accounts only.
- `owner` can create and manage Manager and Cashier accounts only.
- `manager` can create and manage Cashier accounts only.
- Cashier accounts cannot access management APIs.

---

## Security Hardening

- Login endpoints have a broad per-IP ceiling plus per-IP/account limits, so a
  shared Stall network cannot let one user consume every account's allowance.
- `POST /api/auth/pin` keeps the stricter per-Cashier limit required for 4-digit PIN safety.
- Express uses Helmet security headers. Content Security Policy is disabled for now so local Swagger docs continue to work.
- CORS is restricted to `FRONTEND_ORIGIN`, permits credentials for auth cookies,
  and keeps `http://localhost:5173` as the development fallback.
- Refresh and logout require double-submit CSRF validation.
- Request logging masks sensitive fields such as password, PIN, token, authorization, and secrets, including nested fields.
- User edits and deletion invalidate existing JWT and Socket.IO sessions through
  the database-backed session version.
