# Toub POS Backend

Node.js + Express REST API for TouB POS. The backend owns authentication, RBAC, products, stalls, staff assignments, orders, cash confirmation, audit logs, and report data.

---

## Setup

### Prerequisites

- Node.js >= 18
- MySQL >= 8

### Install & Run

```bash
cp .env.example .env
npm install
npm run dev
```

Server runs at `http://localhost:3000` by default.

### Seed Local Demo Data

For local development only, seed a realistic demo database with Faker:

```bash
npm run seed
```

The seeder safely upserts demo users, stalls, staff assignments, categories, products, stall-specific prices, and fake order history. It does not delete existing project data and it does not run automatically on server startup.

Demo credentials:

| Role | Username | Password / PIN |
|------|----------|----------------|
| Owner | `owner` | `owner123` |
| Manager | `manager_demo` | `manager123` |
| Cashier | `cashier_dara` | PIN `1111` |
| Cashier | `cashier_sophea` | PIN `1111` |
| Cashier | `cashier_vireak` | PIN `1111` |
| Cashier | `cashier_malis` | PIN `1111` |

Do not run this seeder against production or any live merchant database.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | API port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password, if required by local DB | `your_password` |
| `DB_NAME` | MySQL database name | `toub_pos` |
| `JWT_SECRET` | Secret key for signing JWTs | `a_long_random_string` |
| `JWT_EXPIRES_IN` | JWT expiry duration | `8h` |

---

## Project Structure

```text
backend/
├── src/
│   ├── server.js              -> Entry point, DB sync, seed, listen
│   ├── app.js                 -> Express app, middleware, routes
│   ├── config/                -> Env, DB, Swagger docs
│   ├── middleware/            -> Auth, RBAC, errors, logging, rate limits
│   ├── routes/                -> Express route definitions
│   ├── controllers/           -> HTTP request/response handlers
│   ├── services/              -> Business rules
│   ├── repositories/          -> Sequelize data access helpers
│   └── models/                -> Sequelize models and associations
└── package.json
```

### Layer Responsibilities

| Layer | Rule |
|-------|------|
| Routes | Define HTTP method, path, and middleware chain |
| Controllers | Validate/shape request data and return API responses |
| Services | Own business rules such as RBAC limits, order totals, and payment confirmation |
| Repositories | Own database access details |
| Models | Define Sequelize schema and associations |

---

## Auth And RBAC

TouB POS has three web-app roles:

| Role | Meaning |
|------|---------|
| `owner` | Full system owner |
| `manager` | Operational supervisor |
| `cashier` | Frontline POS staff |

Credential rules:

- Owner/Manager log in with username + password through `POST /api/auth/login`.
- Owner/Manager accounts must have `pin = NULL`.
- Cashier accounts log in with PIN through `POST /api/auth/pin`.
- Cashier PINs are bcrypt-hashed.
- Cashier accounts may have `password = NULL`.
- API responses must not return password hashes, raw PINs, or PIN hashes.

Security notes:

- JWT access tokens are stored by the frontend in localStorage for final-project simplicity.
- Login and PIN endpoints are rate-limited.
- Helmet security headers are enabled.
- HttpOnly refresh tokens are a future production improvement.

---

## API Reference

All endpoints are prefixed with `/api`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Server health check |

### Auth

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/login` | No | Owner / Manager | Username/password login, returns JWT |
| POST | `/api/auth/pin` | No | Cashier | PIN login, returns JWT |

Example owner/manager login:

```json
{
  "username": "owner",
  "password": "owner123"
}
```

Example cashier PIN login:

```json
{
  "userId": 2,
  "pin": "1111"
}
```

Rate limit failures return `429`.

### Products

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/products` | Any authenticated role | List products; cashier results are stall-scoped |
| POST | `/api/products` | Owner / Manager | Create product |
| PUT | `/api/products/:id` | Owner / Manager | Update product |
| DELETE | `/api/products/:id` | Owner / Manager | Delete product |

### Users

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Owner / Manager | List staff accounts |
| POST | `/api/users` | Owner / Manager | Create staff account |
| PUT | `/api/users/:id` | Owner / Manager | Update staff account |
| DELETE | `/api/users/:id` | Owner / Manager | Delete staff account |

Owners can manage Owner, Manager, and Cashier accounts. Managers can manage Cashier accounts only.

### Orders

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Cashier | Create backend-owned pending order |
| GET | `/api/orders/mine` | Cashier | Fetch own orders |
| GET | `/api/orders` | Owner / Manager | Fetch all orders |
| POST | `/api/orders/:id/confirm-cash` | Creating Cashier / Owner / Manager | Mark cash order as paid |

Order creation accepts only product IDs, quantities, optional notes, and payment method. The backend derives cashier/stall, calculates trusted totals from MySQL, snapshots item names/prices, and rejects client-submitted trusted fields such as totals, status, `cashier_id`, and `stall_id`.

Cash orders start as `pending_payment`. Cash confirmation changes the status to `paid` and writes a `cash_payment_confirmed` audit log.

### Reports

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/reports/daily` | Owner / Manager | Daily sales summary |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhook/payment` | No | Placeholder; real KHQR webhook confirmation is Phase 5 and currently returns not implemented |

---

## Standard Response Shape

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "code": 400, "message": "Descriptive error." }
```

Common error codes:

| Code | Meaning |
|------|---------|
| `400` | Validation error |
| `401` | Unauthenticated or invalid credentials |
| `403` | Authenticated but not allowed |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

---

## Useful Commands

```bash
npm run lint
npm run test:credentials
npm run seed
```
