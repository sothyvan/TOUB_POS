# API Endpoints Reference

Base URL: `http://localhost:3000/api`

All protected routes require the `Authorization: Bearer <token>` header.

Current roles:

- `platform_admin` = TouB POS team bootstrap account for creating business owners only
- `owner` = full customer business owner
- `manager` = operational supervisor
- `cashier` = frontline POS staff

Auth/security notes:

- Access JWTs are short-lived and stored only in frontend memory.
- Rotating refresh tokens use Secure, HttpOnly cookies and hashed MySQL sessions.
- Refresh/logout require the CSRF cookie value in `X-CSRF-Token`.
- Platform Admin/Owner/Manager use username + password.
- Cashier uses PIN login.
- Cashier PINs are bcrypt-hashed.
- Login, PIN, and refresh endpoints are rate-limited and may return `429 RATE_LIMITED`. Production API instances share counters through Redis and use the configured trusted-proxy hop count to identify clients.
- Bakong Open API tokens are backend-only. The frontend calls TouB POS endpoints and never calls Bakong directly.

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Compatibility alias for readiness |
| GET | `/health/live` | No | Node process liveness; does not check MySQL |
| GET | `/health/ready` | No | Startup/drain state plus bounded MySQL readiness check |

**Ready response (`200`)**
```json
{
  "success": true,
  "status": "ready",
  "phase": "ready",
  "checks": { "database": "available" }
}
```

Readiness returns `503` with `status: "not_ready"` while startup is incomplete,
shutdown is draining, MySQL rejects the probe, or the probe exceeds
`READINESS_DATABASE_TIMEOUT_MS`. Liveness remains `200` during dependency
failure so hosting can distinguish a live process from one ready for traffic.

---

## Auth — `/api/auth`

| Method | Path           | Auth | Role | Description       |
|--------|----------------|------|------|-------------------|
| POST   | `/auth/login`  | No   | Platform Admin / Owner / Manager | Issue access JWT plus rotating refresh session |
| POST   | `/auth/pin`    | Device token | Cashier | Issue device-bound access JWT plus rotating refresh session |
| POST   | `/auth/refresh` | Refresh + CSRF cookies | Signed-in user | Rotate refresh token and issue a new access JWT |
| POST   | `/auth/logout` | Refresh + CSRF cookies | Signed-in user | Revoke current refresh session and clear cookies |
| GET    | `/auth/cashiers` | Device token | Terminal | List active cashiers assigned to the device stall |
| GET    | `/auth/device-status` | JWT + device token | Cashier | Validate that the bound terminal remains active |

### POST `/auth/login`

Platform Admin, Owner, and Manager accounts use this endpoint. Cashier accounts must use `/auth/pin`. Platform Admin is API/bootstrap-only in the current project and does not access the management portal.
The JSON response contains a short-lived access JWT. The response also sets
`toub_refresh_token` as HttpOnly and `toub_csrf_token` as a readable companion
cookie. Raw refresh tokens are never returned in JSON.

**Request body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "csrfToken": "<csrf-proof>",
    "user": {
      "id": 1,
      "username": "owner",
      "role": "owner"
    }
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 401  | Invalid credentials |
| 403  | Cashier account used the wrong login method |
| 429  | Too many login attempts |

### POST `/auth/pin`

Cashier accounts use this endpoint after selecting a profile in the terminal UI. The request must include the registered terminal's `X-Device-Token` header. The backend verifies that the device is active and that the cashier is assigned to the same stall.

**Request body**
```json
{
  "userId": 2,
  "pin": "1234"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "csrfToken": "<csrf-proof>",
    "user": {
      "id": 2,
      "username": "cashier1",
      "role": "cashier"
    }
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 401  | Invalid PIN |
| 401  | Device missing, invalid, or revoked |
| 403  | Platform Admin/Owner/Manager account used the wrong login method |
| 403  | Cashier is not assigned to the device stall |
| 429  | Too many PIN attempts |

Successful JWTs contain a backend-owned `session_version`. Every protected
request verifies that version and the current active user role/scope. A changed,
deactivated, or deleted account receives `401 SESSION_INVALIDATED`. Successful
cashier JWTs additionally contain `device_id` and `stall_id`; every protected
cashier request must send both this JWT and the same `X-Device-Token`. A revoked
device receives `401` with code `DEVICE_REVOKED`.

### POST `/auth/refresh`

Send the browser-managed `toub_refresh_token` cookie and the non-credential
`csrfToken` proof returned by the previous login/refresh in `X-CSRF-Token`.
The backend also requires its CSRF cookie and stored hash to match. Cashier
refresh requests must additionally send the registered terminal's
`X-Device-Token`.

On success, the backend consumes the old refresh token, writes a hashed
replacement in the same family, rotates both cookies, and returns a new access
JWT and public user object. The family keeps its original maximum eight-hour
expiry; rotation does not extend the shift indefinitely.

| Code | Reason |
| --- | --- |
| 401 `REFRESH_REQUIRED` | Refresh cookie is missing |
| 401 `REFRESH_INVALID` | Refresh token is unknown |
| 401 `REFRESH_EXPIRED` | Maximum session lifetime ended |
| 401 `REFRESH_REUSED` | A consumed/revoked token was presented; family revoked |
| 401 `SESSION_INVALIDATED` | User, device, role, or stall assignment changed |
| 403 `CSRF_INVALID` | CSRF header/cookie proof is missing or invalid |
| 429 | Too many refresh attempts |

### POST `/auth/logout`

Requires the same refresh cookie and CSRF proof. It revokes the current refresh
session and expires both browser cookies. The frontend always clears its
in-memory access token even if the backend is temporarily unreachable.

---

## Products — `/api/products`

All routes require authentication.

| Method | Path               | Auth | Role    | Description            |
|--------|--------------------|------|---------|------------------------|
| GET    | `/products`        | ✅   | Any     | List all products      |
| POST   | `/products`        | ✅   | Owner / Manager | Create a product       |
| PUT    | `/products/:id`    | ✅   | Owner / Manager | Update a product       |
| DELETE | `/products/:id`    | ✅   | Owner / Manager | Delete a product       |

### GET `/products`

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Iced Latte",
      "category_id": 2,
      "image_url": "https://...",
      "Category": { "id": 2, "name": "Coffee", "tone": "gold" },
      "ProductStalls": [
        {
          "stall_id": 1,
          "price_usd": "3.50",
          "price_khr": 14000,
          "is_visible": true
        }
      ]
    }
  ]
}
```

### POST `/products`

**Request body**
```json
{
  "name": "string",
  "category_id": 1,
  "stall_ids": [1, 2],
  "price_usd": 3.50,
  "price_khr": 14000,
  "image_url": "string",
  "is_visible": true
}
```

`category_id` belongs to the shared product record. `stall_ids`, `price_usd`, `price_khr`, and `is_visible` create or update the product's `stall_products` assignments.

### PUT `/products/:id`

Same body shape as POST. Only provided fields are updated.

### DELETE `/products/:id`

**Response `200`**
```json
{ "success": true }
```

---

## Orders — `/api/orders`

All routes require authentication.

| Method | Path             | Auth | Role    | Description                    |
|--------|------------------|------|---------|--------------------------------|
| POST   | `/orders`        | ✅   | Cashier | Create or safely replay a backend-owned pending order |
| GET    | `/orders/:id`    | ✅   | Cashier / Owner / Manager | Fetch one order for status polling |
| POST   | `/orders/:id/check-khqr-status` | ✅ | Cashier / Owner / Manager | Check KHQR payment status through backend |
| POST   | `/orders/:id/confirm-cash` | ✅ | Cashier / Owner / Manager | Confirm physical cash received |
| POST   | `/orders/:id/retry-telegram` | ✅ | Cashier / Owner / Manager | Retry failed/missing Telegram kitchen ticket |
| GET    | `/orders/mine`   | ✅   | Cashier | Fetch own orders               |
| GET    | `/orders`        | ✅   | Owner / Manager | Fetch all orders               |

### POST `/orders`

**Required header**
```http
Idempotency-Key: 0d635ea2-8ea1-46a0-a195-a3ef02032594
```

The frontend generates one key when checkout begins and reuses it only while
retrying that same cart and payment method. An exact retry returns the original
order with `200 OK` and `Idempotent-Replayed: true`. The first successful
creation returns `201 Created`. Reusing a key with different items, quantities,
notes, or payment method returns `409` with code `IDEMPOTENCY_KEY_REUSED`.

**Request body**
```json
{
  "items": [
    { "product_id": 1, "quantity": 2, "notes": "No sugar" }
  ],
  "payment_method": "khqr | cash"
}
```

The frontend may use `paymentMethod`; the backend accepts it and normalizes it. The frontend must not send trusted fields such as `total`, `subtotal`, `cashier_id`, `stall_id`, item prices, paid flags, or final status.

KHQR is disabled by default. Submitting `payment_method: "khqr"` while `KHQR_ENABLED` is not explicitly `true` returns `503` with code `KHQR_DISABLED`. Cash order creation is unaffected.

Backend behavior:

- Derives cashier ID from the JWT.
- Derives stall ID from the cashier's assigned stall.
- Loads product prices from MySQL.
- Rejects hidden products, invalid quantities, and products outside the cashier's assigned stall.
- Snapshots order item names and prices.
- Creates orders as `pending_payment`.
- Stores a per-cashier idempotency key and request fingerprint so a lost response cannot create a second order.
- For KHQR, generates an Individual KHQR payload from backend-owned order totals.
- For KHQR, stores `qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at`.
- For KHQR, requires `BAKONG_ACCOUNT_ID`; missing account configuration returns `503`.
- Writes an `order_created` audit log.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "qr_payload": "00020101...",
    "qr_md5": "b8fb54c15be1759f0e25770f1737b41c",
    "payment_reference": "TOUB-42-ABC123",
    "payment_expires_at": "2026-07-01T14:10:00.000Z",
    "status": "pending_payment",
    "total_usd": "7.00"
  }
}
```

### GET `/orders/:id`

Cashiers can fetch their own orders only. Owner/Manager can fetch orders only within their own business owner scope. This endpoint is a passive order read.

### POST `/orders/:id/check-khqr-status`

Cashiers can check their own KHQR orders only. Owner/Manager can check KHQR orders only within their own business owner scope.

This endpoint is retained for a future approved provider rollout but returns `503` with code `KHQR_DISABLED` while `KHQR_ENABLED=false`. The frontend does not poll it while `VITE_KHQR_ENABLED=false`, and the background checker remains stopped.

Backend behavior:

- Requires JWT auth.
- Requires `payment_method = "khqr"`.
- Returns already-paid orders idempotently without adding duplicate audit logs.
- Calls Bakong Open API by `qr_md5`.
- If Bakong reports paid, validates amount, currency, and configured Bakong destination account before marking the order `paid`.
- If Bakong reports paid, emits `payment_confirmed` to the creating cashier socket and dispatches the order to the stall's Telegram kitchen chat.
- If Bakong reports not found, keeps the order `pending_payment`.
- If Bakong reports failed/error, returns a clean response and does not mark the order paid.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "paymentStatus": "pending_payment",
    "providerStatus": "not_found",
    "checkMode": "bakong",
    "alreadyProcessed": false,
    "message": "Payment has not been found yet.",
    "order": {
      "id": 42,
      "status": "pending_payment",
      "payment_method": "khqr",
      "qr_md5": "b8fb54c15be1759f0e25770f1737b41c",
      "total_usd": "7.00"
    }
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 400  | Not a KHQR order, missing md5, amount/currency/destination mismatch |
| 403  | Actor is not allowed for this order |
| 404  | Order not found |
| 503  | KHQR is disabled, or Bakong token/base URL/account is misconfigured |

### POST `/orders/:id/confirm-cash`

Allowed for:

- the cashier who created the order
- owner within the same business
- manager within the same business

Only cash orders in `pending_payment` status can be confirmed. The request must include the customer cash amount. The backend rejects underpayment, calculates `change_due_usd`, changes the status to `paid`, sets `completed_at`, and writes a `cash_payment_confirmed` audit log.

**Request body**
```json
{
  "cash_received_usd": "20.00"
}
```

The frontend must not send trusted fields such as `total`, `status`, `cashier_id`, `stall_id`, or `change_due_usd`.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "paid",
    "total_usd": "7.00",
    "cash_received_usd": "10.00",
    "change_due_usd": "3.00",
    "completed_at": "2026-06-29T10:30:00.000Z"
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 400  | Missing/invalid cash amount or cash received is less than the order total |
| 403  | Actor is not allowed for this order |
| 404  | Order not found |
| 409  | Order is already paid or cancelled |

### POST `/orders/:id/retry-telegram`

Allowed for:

- the cashier who created the order
- owner within the same business
- manager within the same business

The backend enforces order ownership/same-business access before retrying.

Use this when a paid order has no Telegram ticket or has a `failed` ticket. The endpoint requeues the order's durable dispatch job; the background worker performs the external Telegram request. `pending` means the original dispatch is still in progress or ended in an uncertain network state and cannot be retried until the backend marks it failed. Orders with `sent` or `done` Telegram tickets are not resent to avoid duplicate kitchen messages.

**Response `200`**

The response confirms that the durable job was requeued. Delivery continues
asynchronously, so the included latest ticket may still show its previous
`failed` state until the worker emits `kitchen_ticket_updated`.

```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "paid",
    "TelegramTickets": [
      { "id": 10, "status": "failed", "sent_at": null }
    ]
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 400  | Order is not paid, or stall has no Telegram chat configured |
| 403  | Actor is not allowed for this order |
| 404  | Order not found |
| 409  | Telegram ticket is pending/sent/done, or its durable job is already queued/processing/completed |
| 503  | Telegram bot token is not configured |

### GET `/orders/mine`

**Response `200`**
```json
{
  "success": true,
  "data": [ { "order_id": 42, "status": "paid", "total": 7.00 } ]
}
```

---

## Real-Time Events — Socket.IO

TouB POS also exposes a Socket.IO server from the same backend origin, for example `http://localhost:3000`.

Socket authentication:

- The browser sends the existing JWT in the Socket.IO `auth.token` field.
- Cashier, Owner, and Manager tokens are accepted for live POS events.
- Platform Admin is API/bootstrap-only and should not connect to live POS events.
- Payment confirmation events are still sent only to the cashier who created the paid KHQR order.

### Event: `payment_confirmed`

Sent by the backend only to the cashier who created the paid KHQR order.

```json
{
  "orderId": 42,
  "status": "paid",
  "paymentMethod": "khqr",
  "totalUsd": 7,
  "completedAt": "2026-07-09T10:30:00.000Z"
}
```

Frontend behavior:

- Keep polling `POST /orders/:id/check-khqr-status` while the KHQR modal is open.
- If the socket event arrives first, refresh the order from `GET /orders/:id`, close the KHQR modal, and show the receipt.
- Polling remains the fallback if the socket disconnects.

### Event: `order_updated`

Sent to Owner/Manager sockets when an order in their business is created or changes important state, such as becoming `paid`.

```json
{
  "orderId": 42,
  "status": "paid",
  "paymentMethod": "cash",
  "changeType": "paid"
}
```

Frontend behavior:

- Owner/Manager order history refreshes from the backend.
- The event is scoped by business owner; it is not broadcast to unrelated businesses.

### Event: `kitchen_ticket_updated`

Sent when Telegram kitchen ticket state changes, such as when dispatch finishes as `sent`/`failed` or when the cook taps `Mark as Done`.

Recipients:

- the cashier who created the order
- owner/manager sockets scoped to the same business owner

```json
{
  "orderId": 42,
  "ticketId": 10,
  "status": "done",
  "completedAt": "2026-07-09T10:35:00.000Z"
}
```

Frontend behavior:

- Refresh order history from the backend.
- Do not locally fake the ticket state; the backend remains the source of truth.

---

## Users — `/api/users`

User management routes require `platform_admin`, `owner`, or `manager` role. Platform Admin can create business Owner accounts only. Owners can create/manage Manager and Cashier accounts only. Managers can create/manage Cashier users only. `/users/me/stall` is available to authenticated users so the cashier workspace can load the current backend stall assignment.

| Method | Path       | Auth | Role    | Description           |
|--------|------------|------|---------|-----------------------|
| GET    | `/users`   | ✅   | Platform Admin / Owner / Manager | Platform Admin lists owner accounts; Owner/Manager list visible staff |
| POST   | `/users`   | ✅   | Platform Admin / Owner / Manager | Create a permitted account |
| PUT    | `/users/:id` | ✅ | Owner / Manager | Update a permitted staff account |
| DELETE | `/users/:id` | ✅ | Owner / Manager | Delete a permitted staff account |
| GET    | `/users/me/stall` | ✅ | Cashier / Owner / Manager | Get the authenticated user's assigned stall |

### GET `/users`

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "id": 1, "username": "john", "role": "cashier", "is_active": true }
  ]
}
```

### POST `/users`

Platform Admin may create `owner` accounts only. Owner accounts require a password and must not include a PIN.

**Request body: platform_admin creating owner**
```json
{
  "username": "new_owner",
  "password": "strong-password",
  "role": "owner"
}
```

Owner may create Manager and Cashier accounts only. Manager may create Cashier accounts only. Owner/Manager accounts require a password and must not include a PIN.

**Request body: owner/manager**
```json
{
  "username": "manager1",
  "password": "strong-password",
  "role": "manager"
}
```

Cashier accounts require a 4-digit PIN and must not include a password.

**Request body: cashier**
```json
{
  "username": "cashier1",
  "role": "cashier",
  "pin": "1234"
}
```

Responses never include password hashes, raw PINs, or PIN hashes.

Updating a user increments their internal session version and immediately
disconnects that user's active web sockets. Deactivation, credential/role/name
changes, and deletion therefore invalidate existing JWTs. Reactivation requires
a fresh login and does not revive an older token. `session_version` is internal
and is not returned by user-management or login responses.

### GET `/users/me/stall`

Cashier screens use this to load the active stall assignment from the backend instead of trusting browser storage.

---

## Stalls — `/api/stalls`

Requires `owner` or `manager` role.

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/stalls` | ✅ | Owner / Manager | List stalls |
| POST | `/stalls` | ✅ | Owner / Manager | Create stall |
| PUT | `/stalls/:id` | ✅ | Owner / Manager | Update stall |
| DELETE | `/stalls/:id` | ✅ | Owner / Manager | Delete stall |
| POST | `/stalls/:id/staff` | ✅ | Owner / Manager | Assign cashier to stall |
| DELETE | `/stalls/:id/staff/:userId` | ✅ | Owner / Manager | Remove cashier from stall |
| POST | `/stalls/:id/register-device` | ✅ | Owner / Manager | Register an additional named terminal |
| DELETE | `/stalls/:id/devices/:deviceId` | ✅ | Owner / Manager | Revoke one terminal without affecting the others |
| GET | `/stalls/:id/telegram-cooks` | ✅ | Owner / Manager | List Telegram-only kitchen identities |
| POST | `/stalls/:id/telegram-cooks` | ✅ | Owner / Manager | Authorize or reactivate one Telegram cook |
| DELETE | `/stalls/:id/telegram-cooks/:cookId` | ✅ | Owner / Manager | Revoke one Telegram cook |
| POST | `/stalls/:id/telegram-connection` | ✅ | Owner | Generate a short-lived one-time link for selecting this stall's Telegram kitchen group |

Stall create/update accepts normal editable fields such as `name` and `location`. The backend does not trust privileged frontend-submitted fields such as `owner_id`, `device_token`, or `telegram_chat_id`.

Each cashier can have at most one current stall assignment. Assigning a cashier
to another stall transactionally replaces the previous assignment. Moving or
removing an assignment emits `cashier:session_invalidated`, logs out that
cashier's connected sessions, and preserves the physical terminal registration.
Future cashier API requests also compare the current assignment with the JWT
and device stall and return `401 STALL_ASSIGNMENT_CHANGED` on any mismatch.

Stall list responses expose safe `devices` metadata and the aggregate `device_registered` boolean. They never expose token hashes or raw tokens. Registering requires `{ "device_name": "Front Counter Tablet" }` and returns the raw token once. Deregistration marks only the selected `stall_devices` row inactive, rejects its future cashier requests, and sends a targeted real-time logout event. Other devices at that stall remain active.

Telegram cooks are not web users. Authorizing a cook requires a numeric `telegram_user_id` and `display_name`, stores a stall-scoped allowlist record, and grants only the ability to complete that stall's Telegram kitchen tickets. Cook list/create/revoke responses return `telegram_user_id_masked`, never the complete Telegram identifier. Revoking one identity does not affect other cooks or cashier accounts.

The Owner-only Telegram connection endpoint verifies the configured bot through Telegram, creates a random `startgroup` token with a short expiry, returns the raw token only inside the Telegram link, and stores only its SHA-256 hash. Creating a newer link invalidates the stall's previous unused link. When Telegram starts the bot in the selected group, the backend consumes the token once and stores that group's ID/title on the stall. A group already connected to another active stall is rejected. Managers may manage cook identities but cannot reroute a stall's kitchen destination.

Stall management responses expose `telegram_connected`, `telegram_chat_title`, `telegram_chat_id_masked`, and `telegram_connected_at`; the raw group chat ID remains backend-only. Order and report responses may expose the authorized cook's display name but omit Telegram user IDs, ticket chat IDs, and Telegram message IDs.

`POST /api/telegram/callback` is called by Telegram, not the frontend. It requires the configured `X-Telegram-Bot-Api-Secret-Token`. Group-connection messages require a valid, unexpired one-time token and a group/supergroup chat. Ticket-completion callbacks require an exact order/ticket/chat/message match, a chat matching the order's stall, and an active `telegram_cooks` assignment for `callback_query.from.id`.

---

## Reports — `/api/reports`

Requires `owner` or `manager` role.

| Method | Path              | Auth | Role    | Description              |
|--------|-------------------|------|---------|--------------------------|
| GET    | `/reports/daily`  | ✅   | Owner / Manager | Daily sales summary      |
| GET    | `/reports/sales`  | ✅   | Owner / Manager | Filtered sales report for dashboard/ledger |

### GET `/reports/daily?date=YYYY-MM-DD`

**Query params**
| Param | Type   | Required | Description       |
|-------|--------|----------|-------------------|
| date  | string | No       | Defaults to today |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-15",
    "totalOrders": 38,
    "totalRevenue": 1240.00,
    "breakdown": {
      "cash": { "count": 20, "revenue": 650.00 },
      "khqr": { "count": 18, "revenue": 590.00 }
    },
    "stalls": [
      { "stallName": "Main Stall", "orderCount": 20, "revenue": 720.00 }
    ]
  }
}
```

### GET `/reports/sales?range=today|week|month|custom&include_trends=true&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&stall_id=1&cashier_id=2&search=117`

Backs the Owner/Manager sales report screen. The backend scopes all results to the authenticated user's customer business.

**Query params**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| range | string | No | `today`, `week`, `month`, or `custom`. Defaults to `today`. |
| start_date | string | Only for custom | Start date in `YYYY-MM-DD` format. |
| end_date | string | Only for custom | End date in `YYYY-MM-DD` format. |
| stall_id | number | No | Filters to one same-business stall. |
| cashier_id | number | No | Filters to one cashier's orders. |
| search | string | No | Searches paginated ledger rows by exact order ID or partial payment reference, cashier username, stall name/location, payment method, or status. Maximum 100 characters. |
| include_trends | boolean | No | Adds dashboard trend points and previous-period comparisons. Defaults to `false`. |

`week` uses Monday as the first day. The trend always returns Monday through Sunday, including zero-value future weekdays, while summary and comparison values remain week-to-date. Trend and comparison calculations use the configured report timezone and include paid orders only.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "filters": {
      "range": "today",
      "startDate": "2026-07-09",
      "endDate": "2026-07-09",
      "stallId": null,
      "cashierId": null
    },
    "summary": {
      "totalOrders": 12,
      "paidOrders": 10,
      "totalRevenue": 84.50,
      "averageOrderValue": 8.45,
      "paymentMethods": {
        "cash": { "count": 4, "revenue": 30.00 },
        "khqr": { "count": 6, "revenue": 54.50 }
      }
    },
    "byStall": [
      { "stallId": 1, "stallName": "Main Stall", "orderCount": 7, "revenue": 52.00 }
    ],
    "byCashier": [
      { "cashierId": 3, "cashierName": "cashier", "stallName": "Main Stall", "orderCount": 7, "revenue": 52.00 }
    ],
    "byHour": [
      { "hour": 9, "label": "9AM", "orderCount": 2, "revenue": 14.00 }
    ],
    "trend": {
      "granularity": "hour",
      "points": [
        { "hour": 9, "label": "9AM", "orderCount": 2, "revenue": 14.00 }
      ]
    },
    "comparison": {
      "previousStartDate": "2026-07-08",
      "previousEndDate": "2026-07-08",
      "summary": { "paidOrders": 8, "totalRevenue": 70.00, "averageOrderValue": 8.75 },
      "revenueChangePercent": 20.7,
      "paidOrdersChangePercent": 25.0,
      "averageOrderValueChangePercent": -3.4
    },
    "orders": [
      {
        "id": 42,
        "status": "paid",
        "payment_method": "khqr",
        "total_usd": 12.50,
        "stall_name": "Main Stall",
        "cashier_name": "cashier",
        "kitchen_status": "sent"
      }
    ]
  }
}
```

`trend` and `comparison` are returned only when `include_trends=true`:

- Today and one-day custom ranges use 24 hourly buckets.
- This Week uses seven Monday-Sunday daily buckets; future days are zero.
- This Month and custom ranges of 2-31 days use daily buckets.
- Custom ranges longer than 31 days use consecutive seven-day buckets.
- Custom comparisons use the immediately preceding range of equal length.

---

## Standard Error Shape

All errors follow:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Human-readable description"
}
```

`code` is present when an error has a stable machine-readable identifier.

### Mutation Validation Policy

- JSON mutation bodies reject unknown fields with `400 VALIDATION_ERROR`.
- Strings are trimmed and bounded to the matching database column length.
- IDs and quantities must be positive integers. Order quantities are limited to 100 per item and orders to 100 submitted line items.
- USD values accept at most two decimal places. Product USD prices are limited to `999999.99`; request/order/cash totals are limited to `99999999.99`.
- KHR amounts are positive integers limited to `2147483647`.
- Boolean fields must be JSON booleans, not strings such as `"true"`.
- Commands that do not require a request body reject submitted fields.
- Malformed or oversized application input is rejected before a database or external provider call.

| Code | Meaning              |
|------|----------------------|
| 400  | Bad request / validation |
| 401  | Unauthenticated      |
| 403  | Insufficient role    |
| 404  | Resource not found   |
| 429  | Rate limit exceeded  |
| 503  | Backend service/configuration unavailable |
| 500  | Internal server error |
