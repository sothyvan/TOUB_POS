# Toub POS Backend

Node.js + Express REST API for TouB POS. The backend owns authentication, RBAC, products, stalls, staff assignments, orders, cash confirmation, KHQR status checks, cashier-scoped WebSocket payment notifications, audit logs, and report data.

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

When the local development database is empty, startup seeds only the temporary platform bootstrap account:

| Role | Username | Password |
|------|----------|----------|
| Platform Admin | `platform_admin` | `platform123` |

Use this account through the API or Swagger to create the first business Owner. The Platform Admin role has no frontend portal yet.

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
| `REPORT_TIMEZONE_OFFSET` | Business-local offset used by sales report ranges and hourly buckets | `+07:00` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password, if required by local DB | `your_password` |
| `DB_NAME` | MySQL database name | `toub_pos` |
| `JWT_SECRET` | Secret key for signing JWTs | `a_long_random_string` |
| `JWT_ACCESS_EXPIRES_IN` | Short-lived access JWT duration | `15m` |
| `REFRESH_SESSION_EXPIRES_HOURS` | Absolute rotating refresh-session lifetime | `8` |
| `AUTH_COOKIE_SAME_SITE` | Cookie cross-site policy (`lax` locally; usually `none` for separate HTTPS production origins) | `lax` |
| `PLATFORM_ADMIN_USERNAME` | Development bootstrap platform admin username | `platform_admin` |
| `PLATFORM_ADMIN_PASSWORD` | Development bootstrap platform admin password | `platform123` |
| `PLATFORM_ADMIN_ROLE` | Development bootstrap role; must be `platform_admin` | `platform_admin` |
| `KHQR_ENABLED` | Explicitly enable KHQR creation and Bakong status checking; defaults to disabled | `false` |
| `BAKONG_ACCOUNT_ID` | Required owner/stall Bakong account for Individual KHQR generation and validation | `owner@bakong` |
| `KHQR_MERCHANT_NAME` | Name embedded in KHQR payload | `Toub POS` |
| `KHQR_MERCHANT_CITY` | City embedded in KHQR payload | `PHNOM PENH` |
| `KHQR_EXPIRATION_MINUTES` | KHQR payment expiration window | `10` |
| `BAKONG_OPEN_API_BASE_URL` | Bakong Open API base URL | `https://api-bakong.nbc.gov.kh` |
| `BAKONG_OPEN_API_TOKEN` | Backend-only Bakong Open API token | `replace_with_token` |
| `KHQR_BACKGROUND_CHECK_ENABLED` | Enable background polling only when `KHQR_ENABLED=true` | `false` |
| `KHQR_BACKGROUND_CHECK_INTERVAL_MS` | Background KHQR check interval in milliseconds | `5000` |
| `KHQR_BACKGROUND_CHECK_BATCH_SIZE` | Maximum pending KHQR orders checked per run | `10` |
| `TELEGRAM_BOT_TOKEN` | Backend-only Telegram bot token used for kitchen tickets | `replace_with_bot_token` |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret required whenever the Telegram bot is configured | `replace_with_random_secret` |
| `TELEGRAM_GROUP_CONNECTION_EXPIRY_MINUTES` | Lifetime of a one-time Owner kitchen-group connection link | `10` |

---

## Project Structure

```text
backend/
├── src/
│   ├── server.js              -> Entry point, DB sync, seed, HTTP/WebSocket listen
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

TouB POS has four backend roles, split into one TouB POS team bootstrap role and three customer business roles:

| Role | Meaning |
|------|---------|
| `platform_admin` | TouB POS team bootstrap account; creates business owners only |
| `owner` | Full business owner; one owner account per business |
| `manager` | Operational supervisor |
| `cashier` | Frontline POS staff |

Credential rules:

- Platform Admin/Owner/Manager log in with username + password through `POST /api/auth/login`.
- Platform Admin/Owner/Manager accounts must have `pin = NULL`.
- Cashier accounts log in with PIN through `POST /api/auth/pin`.
- Cashier PINs are bcrypt-hashed.
- Cashier accounts may have `password = NULL`.
- API responses must not return password hashes, raw PINs, or PIN hashes.

RBAC rules:

- Platform Admin can create Owner accounts only and does not access the management portal.
- Owner can create/manage Manager and Cashier accounts only.
- Manager can create/manage Cashier accounts only.
- Cashier cannot access management APIs.

Security notes:

- Short-lived access JWTs remain only in frontend memory.
- Rotating refresh tokens are Secure/HttpOnly in production and stored as SHA-256 hashes in MySQL.
- Refresh and logout require a matching CSRF cookie and `X-CSRF-Token` header.
- Login and PIN endpoints are rate-limited.
- Helmet security headers are enabled.

Apply the refresh-session schema before starting a production deployment:

```bash
npm run migrate:refresh-sessions
```

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
| POST | `/api/auth/login` | No | Platform Admin / Owner / Manager | Username/password login, returns JWT |
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
| GET | `/api/users` | Platform Admin / Owner / Manager | Platform Admin lists owners; Owner/Manager list staff accounts |
| POST | `/api/users` | Platform Admin / Owner / Manager | Create permitted account |
| PUT | `/api/users/:id` | Owner / Manager | Update staff account |
| DELETE | `/api/users/:id` | Owner / Manager | Delete staff account |

Platform Admin can create Owner accounts only. Owners can manage Manager and Cashier accounts only. Managers can manage Cashier accounts only.

### Orders

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Cashier | Create backend-owned pending order |
| GET | `/api/orders/mine` | Cashier | Fetch own orders |
| GET | `/api/orders` | Owner / Manager | Fetch all orders |
| GET | `/api/orders/:id` | Creating Cashier / Same-Business Owner / Manager | Fetch one order for status polling |
| POST | `/api/orders/:id/check-khqr-status` | Creating Cashier / Same-Business Owner / Manager | Check KHQR payment by Bakong md5/hash |
| POST | `/api/orders/:id/confirm-cash` | Creating Cashier / Same-Business Owner / Manager | Confirm cash received and mark cash order as paid |

Order creation accepts only product IDs, quantities, optional notes, and payment method. The backend derives cashier/stall, calculates trusted totals from MySQL, snapshots item names/prices, and rejects client-submitted trusted fields such as totals, status, `cashier_id`, and `stall_id`.

Cash orders start as `pending_payment`. Cash confirmation requires `cash_received_usd`; the backend rejects underpayment, calculates `change_due_usd`, changes the status to `paid`, and writes a `cash_payment_confirmed` audit log.

KHQR is temporarily disabled by default while TouB POS evaluates an approved merchant payment provider. When `KHQR_ENABLED` is not explicitly `true`, KHQR order creation and status checking return `503` with code `KHQR_DISABLED`, and the background checker does not start. Existing KHQR records remain readable in order history and reports.

The retained integration can only be re-enabled deliberately with matching backend and frontend flags. If re-enabled after provider approval, the existing backend validation still requires amount, currency, and destination-account matches before marking an order paid.

Owner/Manager order history shows Telegram kitchen ticket state (`pending`, `sent`, `failed`, or `done`) and can retry missing or failed kitchen ticket delivery through `POST /api/orders/:id/retry-telegram`. `pending` means the backend is still sending the ticket and is not retryable. Cashiers can also retry their own paid orders from the cashier order history when kitchen dispatch fails. The backend emits `order_updated` when same-business orders are created or paid, and emits `kitchen_ticket_updated` when Telegram dispatch finishes or a cook taps `Mark as Done`, so order-history screens refresh without a full page reload.

Telegram cooks remain Telegram-only identities, not web-app users. The Owner connects a stall's kitchen group from Stall Management using a short-lived Telegram group-selection link. Owner/Manager users may then authorize each cook's numeric Telegram user ID for that stall. The raw setup token is returned only in the link; MySQL stores its SHA-256 hash. Run `npm run migrate:telegram-cooks` and `npm run migrate:telegram-groups` once on an existing database, then re-register the Telegram webhook so Telegram sends the configured secret header.

### Reports

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/reports/daily` | Owner / Manager | Daily sales summary |

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
npm test
npm run test:credentials
npm run test:orders
npm run test:live
npm run seed
npm run migrate:telegram-cooks
npm run migrate:telegram-groups
npm run migrate:order-idempotency
npm run migrate:single-stall-assignment
npm run migrate:user-session-version
npm run migrate:refresh-sessions
```

Run `npm run migrate:order-idempotency` once for an existing database before
deploying the retry-safe checkout API. New development databases receive the
same nullable order fields and per-cashier unique index from Sequelize sync.

Run `npm run migrate:single-stall-assignment` once for an existing database.
It stops with a list of user IDs if duplicate assignments need manual review;
it never deletes ambiguous assignment data.

Run `npm run migrate:user-session-version` once for an existing database before
deploying session invalidation. Existing JWTs require a one-time re-login after
deployment. User edits/deletion then increment the version and immediately
invalidate protected HTTP and Socket.IO sessions.

`npm run test:credentials` expects the local API and a seeded Owner account. It creates temporary Manager, Cashier, Stall, assignment, and registered-device records; verifies device-bound PIN login, credential response safety, deactivation/reactivation, credential/role changes, deletion, and stale-session rejection; then cleans up those records.

`npm test` runs database-free report range, order-idempotency, and Telegram callback authorization tests. `npm run test:orders` expects the local API, MySQL, and a seeded Owner account; it creates uniquely named cashier, stall, category, product, device, and order records, verifies trusted totals, concurrent idempotent creation, changed-payload conflicts, stall scoping, cash change, duplicate confirmation, order history, and RBAC, then removes its database records. `npm run test:live` runs both live API suites.
