# Authentication & Authorization Flow

## Overview

Toub POS uses **JWT (JSON Web Token)** for stateless authentication and **Role-Based Access Control (RBAC)** to gate endpoints by staff role.

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
  │                               │  5. Sign JWT { id, username, role, owner_id } — 8h expiry
  │◀──────────────────────────────│
  │  { token, user }              │
  │                               │
  │  Store token in localStorage  │
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
  │                               │     → attach req.user = { id, role, owner_id }
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

## Token Storage (Frontend)

| Key                  | Storage       | Value        |
|----------------------|---------------|--------------|
| `toub-auth-token`    | localStorage  | Raw JWT string |
| `toub-current-user`  | localStorage  | `{ id, username, role, owner_id }` |
| `toub-device-registered` | localStorage | `true` — terminal auth flag |

TouB POS intentionally keeps the JWT access token in `localStorage` for this final project because the design is simple, already integrated, and easy for the team to explain. The backend remains the source of truth for authorization.

Security tradeoff:

- An XSS bug could steal a token from `localStorage`.
- The token lifetime is limited to 8 hours to match a cashier shift.
- Passwords and PINs are hashed, login endpoints are rate-limited, and request logs mask sensitive fields.

Production upgrade path:

- short-lived access token
- HttpOnly refresh token cookie
- refresh-token rotation
- CSRF protection strategy
- server-side session/device revocation

---

## Token Expiry

- JWT lifetime: **8 hours**
- On expiry, any authenticated request returns `401`
- Frontend should catch `401` and redirect to `/login`

---

## Cashier PIN Flow (Terminal Mode)

Cashier terminals use a secondary PIN-based login on top of device registration:

1. Device is registered once by an Owner or Manager (`toub-device-registered = true`)
2. On terminal wake, cashier selects their profile from the roster
3. Enters a 4-digit PIN — validated by the backend PIN login endpoint
4. Session is scoped to that cashier's `user.id` for the duration

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

- `POST /api/auth/login` is rate-limited.
- `POST /api/auth/pin` is rate-limited more strictly for 4-digit PIN safety.
- Express uses Helmet security headers. Content Security Policy is disabled for now so local Swagger docs continue to work.
- CORS is restricted to `FRONTEND_ORIGIN`, with `http://localhost:5173` as the development fallback.
- Request logging masks sensitive fields such as password, PIN, token, authorization, and secrets, including nested fields.
