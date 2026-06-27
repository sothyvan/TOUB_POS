# Toub POS — Backend

Node.js + Express REST API. Handles authentication, order management, product catalog, user administration, and daily sales reporting.

---

## Setup

### Prerequisites

- Node.js ≥ 18
- MySQL ≥ 8

### Install & Run

```bash
cp .env.example .env   # Fill in your credentials
npm install
npm run dev            # Starts with nodemon (auto-reload)
```

Server runs at `http://localhost:3000` by default.

---

## Environment Variables

| Variable        | Description                             | Example              |
|-----------------|-----------------------------------------|----------------------|
| `PORT`          | Port the API listens on                 | `3000`               |
| `NODE_ENV`      | Environment mode                        | `development`        |
| `DB_HOST`       | MySQL host                              | `localhost`          |
| `DB_PORT`       | MySQL port                              | `3306`               |
| `DB_USER`       | MySQL user                              | `root`               |
| `DB_PASSWORD`   | MySQL password                          | `your_password`      |
| `DB_NAME`       | MySQL database name                     | `toub_pos`           |
| `JWT_SECRET`    | Secret key for signing JWTs             | `a_long_random_string` |
| `JWT_EXPIRES_IN`| JWT expiry duration                     | `8h`                 |

---

## Project Structure

```
backend/
├── .env
├── .env.example
├── package.json
└── src/
    ├── index.js              → Entry point — binds server to PORT
    ├── app.js                → Express app factory (routes + middleware)
    ├── config/
    │   └── db.js             → MySQL2 connection pool
    ├── middleware/
    │   ├── auth.middleware.js → JWT verification + RBAC authorize()
    │   └── error.middleware.js→ Global error handler
    ├── routes/               → Express Router definitions
    ├── controllers/          → HTTP request handlers
    ├── services/             → Business logic layer
    └── repositories/         → Raw SQL / database access layer
```

### Layer Responsibilities

| Layer        | Rule                                                             |
|--------------|------------------------------------------------------------------|
| Routes       | Only define HTTP verb + path + middleware chain                  |
| Controllers  | Parse request, call service, return `{ success, data }` shape   |
| Services     | All business logic — no `req`/`res` objects here                |
| Repositories | All SQL queries — no business logic here                        |

---

## API Reference

All endpoints are prefixed with `/api`.

### Health

| Method | Path           | Auth | Description       |
|--------|----------------|------|-------------------|
| GET    | `/api/health`  | No   | Server health check |

### Auth

| Method | Path              | Auth | Description           |
|--------|-------------------|------|-----------------------|
| POST   | `/api/auth/login` | No   | Login, returns JWT    |

**Request body:**
```json
{ "username": "cashier1", "password": "secret" }
```

**Success response:**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "id": 1, "username": "cashier1", "role": "cashier" }
  }
}
```

---

### Orders *(requires auth)*

| Method | Path               | Role    | Description                        |
|--------|--------------------|---------|------------------------------------|
| POST   | `/api/orders`      | Cashier | Create a new order / QR session    |
| GET    | `/api/orders/mine` | Cashier | Get orders belonging to this cashier |

---

### Products *(requires auth)*

| Method | Path                | Role    | Description              |
|--------|---------------------|---------|--------------------------|
| GET    | `/api/products`     | Any     | List all products        |
| POST   | `/api/products`     | Admin   | Create a product         |
| PUT    | `/api/products/:id` | Admin   | Update a product         |
| DELETE | `/api/products/:id` | Admin   | Delete a product         |

---

### Users *(requires Admin role)*

| Method | Path          | Description              |
|--------|---------------|--------------------------|
| GET    | `/api/users`  | List all user accounts   |
| POST   | `/api/users`  | Create a new user account |

---

### Reports *(requires Admin role)*

| Method | Path                         | Description                         |
|--------|------------------------------|-------------------------------------|
| GET    | `/api/reports/daily?date=YYYY-MM-DD` | Get daily transaction summary |

---

## Standard Response Shape

All endpoints return:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "message": "Descriptive error." }
```

---

## Auth Flow

1. Client `POST /api/auth/login` → receives JWT.
2. All subsequent requests include: `Authorization: Bearer <jwt>`.
3. `authenticate` middleware verifies the token.
4. `authorize('admin')` middleware checks the role claim.
