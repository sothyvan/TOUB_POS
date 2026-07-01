# API Endpoints Reference

Base URL: `http://localhost:3000/api`

All protected routes require the `Authorization: Bearer <token>` header.

Current roles:

- `owner` = full system owner
- `manager` = operational supervisor
- `cashier` = frontline POS staff

Auth/security notes:

- JWT access tokens are stored in frontend localStorage for this final-project scope.
- Owner/Manager use username + password.
- Cashier uses PIN login.
- Cashier PINs are bcrypt-hashed.
- Login and PIN endpoints are rate-limited and may return `429`.
- HttpOnly refresh tokens are a future production improvement.

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
| POST   | `/auth/login`  | No   | Owner / Manager | Issue JWT token with username/password |
| POST   | `/auth/pin`    | No   | Cashier | Issue JWT token with cashier PIN |
| GET    | `/auth/cashiers` | No | Public | List active cashier profiles for PIN login |

### POST `/auth/login`

Owner and Manager accounts use this endpoint. Cashier accounts must use `/auth/pin`.

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
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "owner",
    "role": "owner"
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
  "token": "<jwt>",
  "user": {
    "id": 2,
    "username": "cashier1",
    "role": "cashier"
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 401  | Invalid PIN |
| 403  | Owner/Manager account used the wrong login method |
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
      "price": 3.5,
      "category_id": 2,
      "image_url": "https://...",
      "is_visible": true
    }
  ]
}
```

### POST `/products`

**Request body**
```json
{
  "name": "string",
  "price": 0.00,
  "stall_id": 1,
  "category_id": 1,
  "image_url": "string",
  "is_visible": true
}
```

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
| POST   | `/orders/:id/confirm-cash` | ✅ | Cashier / Owner / Manager | Confirm physical cash received |
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
- Writes an `order_created` audit log.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "qr_payload": "00020101...",
    "status": "pending_payment",
    "total_usd": "7.00"
  }
}
```

### POST `/orders/:id/confirm-cash`

Allowed for:

- the cashier who created the order
- owner
- manager

Only cash orders in `pending_payment` status can be confirmed. Confirmation changes the status to `paid`, sets `completed_at`, and writes a `cash_payment_confirmed` audit log.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "paid",
    "completed_at": "2026-06-29T10:30:00.000Z"
  }
}
```

### GET `/orders/mine`

**Response `200`**
```json
{
  "success": true,
  "data": [ { "order_id": 42, "status": "paid", "total": 7.00 } ]
}
```

---

## Users — `/api/users`

User management routes require `owner` or `manager` role. Managers can create/manage Cashier users only. `/users/me/stall` is available to authenticated users so the cashier workspace can load the current backend stall assignment.

| Method | Path       | Auth | Role    | Description           |
|--------|------------|------|---------|-----------------------|
| GET    | `/users`   | ✅   | Owner / Manager | List visible staff        |
| POST   | `/users`   | ✅   | Owner / Manager | Create a staff account |
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

Owner/Manager accounts require a password and must not include a PIN.

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
| 500  | Internal server error |
