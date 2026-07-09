# API Endpoints Reference

Base URL: `http://localhost:3000/api`

All protected routes require the `Authorization: Bearer <token>` header.

Current roles:

- `platform_admin` = TouB POS team bootstrap account for creating business owners only
- `owner` = full customer business owner
- `manager` = operational supervisor
- `cashier` = frontline POS staff

Auth/security notes:

- JWT access tokens are stored in frontend localStorage for this final-project scope.
- Platform Admin/Owner/Manager use username + password.
- Cashier uses PIN login.
- Cashier PINs are bcrypt-hashed.
- Login and PIN endpoints are rate-limited and may return `429`.
- HttpOnly refresh tokens are a future production improvement.
- Bakong Open API tokens are backend-only. The frontend calls TouB POS endpoints and never calls Bakong directly.

---

## Health

| Method | Path           | Auth | Description       |
|--------|----------------|------|-------------------|
| GET    | `/health`      | No   | Server liveness check |

**Response**
```json
{ "success": true, "message": "Toub POS API is healthy." }
```

---

## Auth — `/api/auth`

| Method | Path           | Auth | Role | Description       |
|--------|----------------|------|------|-------------------|
| POST   | `/auth/login`  | No   | Platform Admin / Owner / Manager | Issue JWT token with username/password |
| POST   | `/auth/pin`    | No   | Cashier | Issue JWT token with cashier PIN |
| GET    | `/auth/cashiers` | No | Public | List active cashier profiles for PIN login |

### POST `/auth/login`

Platform Admin, Owner, and Manager accounts use this endpoint. Cashier accounts must use `/auth/pin`. Platform Admin is API/bootstrap-only in the current project and does not access the management portal.

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

Cashier accounts use this endpoint after selecting a cashier profile in the terminal UI.

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
| 403  | Platform Admin/Owner/Manager account used the wrong login method |
| 429  | Too many PIN attempts |

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
| POST   | `/orders`        | ✅   | Cashier | Create backend-owned pending order |
| GET    | `/orders/:id`    | ✅   | Cashier / Owner / Manager | Fetch one order for status polling |
| POST   | `/orders/:id/check-khqr-status` | ✅ | Cashier / Owner / Manager | Check KHQR payment status through backend |
| POST   | `/orders/:id/confirm-cash` | ✅ | Cashier / Owner / Manager | Confirm physical cash received |
| POST   | `/orders/:id/retry-telegram` | ✅ | Cashier / Owner / Manager | Retry failed/missing Telegram kitchen ticket |
| GET    | `/orders/mine`   | ✅   | Cashier | Fetch own orders               |
| GET    | `/orders`        | ✅   | Owner / Manager | Fetch all orders               |

### POST `/orders`

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

Backend behavior:

- Derives cashier ID from the JWT.
- Derives stall ID from the cashier's assigned stall.
- Loads product prices from MySQL.
- Rejects hidden products, invalid quantities, and products outside the cashier's assigned stall.
- Snapshots order item names and prices.
- Creates orders as `pending_payment`.
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

Frontend KHQR polling should call this endpoint, not Bakong directly. The backend also runs a background checker for unexpired pending KHQR orders, so this endpoint is now a fallback and manual recovery path rather than the only payment detector.

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
| 503  | Bakong token/base URL/account is misconfigured |

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

Use this when a paid order has no Telegram ticket or has a `failed` ticket. `pending` means the original dispatch is still in progress and cannot be retried. Orders with `sent` or `done` Telegram tickets are not resent to avoid duplicate kitchen messages.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "paid",
    "TelegramTickets": [
      { "id": 10, "status": "sent", "sent_at": "2026-07-09T10:30:00.000Z" }
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
| 409  | Telegram ticket is already pending, sent, or done |
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

## Legacy Webhook — `/api/webhook`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook/payment` | No | Legacy placeholder; use `/orders/:id/check-khqr-status` |

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

Stall create/update accepts normal editable fields such as `name` and `location`. The backend does not trust privileged frontend-submitted fields such as `owner_id`, `device_token`, or `telegram_chat_id`.

---

## Reports — `/api/reports`

Requires `owner` or `manager` role.

| Method | Path              | Auth | Role    | Description              |
|--------|-------------------|------|---------|--------------------------|
| GET    | `/reports/daily`  | ✅   | Owner / Manager | Daily sales summary      |

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
    "total_revenue": 1240.00,
    "total_orders": 38,
    "by_cashier": [
      { "cashier": "john", "orders": 15, "revenue": 520.00 }
    ]
  }
}
```

---

## Standard Error Shape

All errors follow:

```json
{
  "success": false,
  "code": 400,
  "message": "Human-readable description"
}
```

| Code | Meaning              |
|------|----------------------|
| 400  | Bad request / validation |
| 401  | Unauthenticated      |
| 403  | Insufficient role    |
| 404  | Resource not found   |
| 429  | Rate limit exceeded  |
| 503  | Backend service/configuration unavailable |
| 500  | Internal server error |
