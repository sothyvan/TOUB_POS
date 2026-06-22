# API Endpoints Reference

Base URL: `http://localhost:3000/api`

All protected routes require the `Authorization: Bearer <token>` header.

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
| POST   | `/auth/login`  | No   | —    | Issue JWT token   |

### POST `/auth/login`

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
    "username": "admin",
    "role": "manager"
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 401  | Invalid credentials |

---

## Products — `/api/products`

All routes require authentication.

| Method | Path               | Auth | Role    | Description            |
|--------|--------------------|------|---------|------------------------|
| GET    | `/products`        | ✅   | Any     | List all products      |
| POST   | `/products`        | ✅   | Manager | Create a product       |
| PUT    | `/products/:id`    | ✅   | Manager | Update a product       |
| DELETE | `/products/:id`    | ✅   | Manager | Delete a product       |

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
| POST   | `/orders`        | ✅   | Cashier | Create order / start QR session |
| GET    | `/orders/mine`   | ✅   | Cashier | Fetch own orders               |

### POST `/orders`

**Request body**
```json
{
  "items": [
    { "product_id": 1, "quantity": 2 }
  ],
  "payment_method": "khqr | cash",
  "total": 7.00
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "order_id": 42,
    "qr_payload": "00020101...",
    "status": "pending"
  }
}
```

### GET `/orders/mine`

**Response `200`**
```json
{
  "success": true,
  "data": [ { "order_id": 42, "status": "completed", "total": 7.00 } ]
}
```

---

## Users — `/api/users`

Requires `manager` role.

| Method | Path       | Auth | Role    | Description           |
|--------|------------|------|---------|-----------------------|
| GET    | `/users`   | ✅   | Manager | List all staff        |
| POST   | `/users`   | ✅   | Manager | Create a staff account |

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

**Request body**
```json
{
  "username": "string",
  "password": "string",
  "role": "cashier | manager",
  "pin": "1234"
}
```

---

## Reports — `/api/reports`

Requires `manager` role.

| Method | Path              | Auth | Role    | Description              |
|--------|-------------------|------|---------|--------------------------|
| GET    | `/reports/daily`  | ✅   | Manager | Daily sales summary      |

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
| 500  | Internal server error |
