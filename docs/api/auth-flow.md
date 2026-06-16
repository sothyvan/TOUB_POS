# Authentication & Authorization Flow

## Overview

Toub POS uses **JWT (JSON Web Token)** for stateless authentication and **Role-Based Access Control (RBAC)** to gate endpoints by staff role.

---

## Roles

| Role      | Description                                       |
|-----------|---------------------------------------------------|
| `manager` | Full access — users, products, reports, orders    |
| `cashier` | Restricted — own orders only, read products       |

---

## Login Flow

```
Client                          Server
  │                               │
  │  POST /api/auth/login          │
  │  { username, password }       │
  │ ─────────────────────────────▶│
  │                               │  1. Lookup user in DB
  │                               │  2. bcrypt.compare(password, hash)
  │                               │  3. Sign JWT { id, role } — 8h expiry
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
  │                               │     → attach req.user = { id, role }
  │                               │  2. Route handler executes
  │◀──────────────────────────────│
  │  { success: true, data: [...] }│
```

---

## RBAC Middleware

`authorize(role)` is applied as a second middleware after `authenticate`:

```js
// Example: manager-only route
router.use(authenticate, authorize('manager'));
```

If `req.user.role !== requiredRole`, returns:

```json
{ "success": false, "code": 403, "message": "Forbidden" }
```

---

## Token Storage (Frontend)

| Key                  | Storage       | Value        |
|----------------------|---------------|--------------|
| `toub-auth-token`    | localStorage  | Raw JWT string |
| `toub-current-user`  | localStorage  | `{ id, username, role }` |
| `toub-device-registered` | localStorage | `true` — terminal auth flag |

---

## Token Expiry

- JWT lifetime: **8 hours**
- On expiry, any authenticated request returns `401`
- Frontend should catch `401` and redirect to `/login`

---

## Cashier PIN Flow (Terminal Mode)

Cashier terminals use a secondary PIN-based login on top of device registration:

1. Device is registered once by a manager (`toub-device-registered = true`)
2. On terminal wake, cashier selects their profile from the roster
3. Enters a 4-digit PIN — validated client-side against stored hash
4. Session is scoped to that cashier's `user.id` for the duration

> **Note**: PIN is currently validated client-side. Moving PIN validation server-side is a planned hardening step.
