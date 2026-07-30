# TouB POS Current-System Fact Sheet

## 1. Document Purpose

This document records the current, code-verified state of TouB POS before the
team writes the Product Requirements Document (PRD), functional and technical
design, user flows, UI/UX design brief, and database schema document.

It is an **as-built baseline**, not a proposal. Later documents should reference
this file when describing existing behavior and clearly label anything else as
planned, suspended, or future work.

### Document Control

| Field | Value |
| --- | --- |
| Project | TouB POS |
| Baseline date | 30 July 2026 |
| Baseline type | Current implementation |
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Node.js, Express 4, Sequelize 6 |
| Database | MySQL |
| Status vocabulary | Implemented, retained but disabled, future/open |

### Source Precedence

When sources disagree, use this order:

1. Executable backend authorization, service, and model code.
2. Executable frontend routes, permissions, hooks, and API client code.
3. Canonical SQL in `docs/database/schema.sql`.
4. Active architecture and API documentation.
5. Historical plans, worksheets, reports, and handoffs.

Historical documents explain how the project evolved but do not override the
current implementation.

## 2. Product Definition

TouB POS is a lightweight, multi-stall point-of-sale system for small merchant
teams. It provides:

- A cashier workspace for stall-scoped product sales.
- Backend-owned order totals and payment state.
- Cash received and change calculation.
- Owner/Manager catalog, staff, stall, device, order, and reporting tools.
- Telegram-based kitchen tickets routed to a group connected to each stall.
- Real-time browser updates through Socket.IO.
- Audit records for important order and payment actions.

The active sales flow is cash-first. KHQR implementation and historical data are
retained, but new KHQR processing is disabled by default while the team evaluates
an approved merchant payment provider.

## 3. Current Users And Roles

### Web-App Roles

| Role | Current purpose | Login method | Current UI access |
| --- | --- | --- | --- |
| `platform_admin` | Temporary TouB POS team bootstrap account | Username and password | No platform portal; API-only owner creation |
| `owner` | Single owner of one customer business | Username and password | Full customer management portal |
| `manager` | Operational supervisor within an owner's business | Username and password | Management portal with operational permissions |
| `cashier` | Stall-scoped frontline POS staff | Registered terminal, cashier profile, and PIN | Cashier workspace and own orders |

### Telegram-Only Kitchen User

A cook is not a web-app role and does not receive a username, password, PIN, or
JWT. A cook is represented by a stall-scoped `telegram_cooks` record containing:

- Telegram user ID, stored completely only in MySQL/backend workflows.
- Display name.
- Active/revoked state.

Management APIs return a masked Telegram user ID. Order and report responses use
the cook display name without exposing the complete Telegram identity.

### Implemented Role Hierarchy

```text
TouB POS Team
└── platform_admin
    └── creates business owner accounts only

Customer Business
└── owner
    ├── creates/manages managers
    └── creates/manages cashiers
        └── manager creates/manages cashiers
```

Current creation and management rules:

- `platform_admin` can list and create Owner accounts.
- `platform_admin` cannot update or delete customer users through the current
  user service.
- Owner cannot create another Owner; Owner manages Manager and Cashier accounts.
- Manager manages Cashier accounts only.
- Cashier cannot access user-management APIs.
- Backend authorization is authoritative even if frontend controls are bypassed.

## 4. Authentication And Session Model

### Management Authentication

- `POST /api/auth/login` accepts username and password.
- Cashier accounts are rejected by the username/password flow.
- Passwords are compared using bcrypt.
- Inactive accounts are rejected.
- Successful login returns a JWT and a public user object.

### Cashier Authentication

- An Owner or Manager first registers a named terminal to a stall.
- The browser stores the raw device token; MySQL stores only its SHA-256 hash.
- The terminal loads only Cashiers assigned to its registered stall.
- `POST /api/auth/pin` verifies the selected Cashier, bcrypt PIN, device token,
  active terminal, and matching stall assignment.
- The Cashier JWT is bound to `device_id` and `stall_id`.
- Every protected Cashier API request must send both the JWT and
  `X-Device-Token`.

### Credential Rules

| Role | Password column | PIN column |
| --- | --- | --- |
| `platform_admin` | bcrypt hash | `NULL` |
| `owner` | bcrypt hash | `NULL` |
| `manager` | bcrypt hash | `NULL` |
| `cashier` | `NULL` | bcrypt hash |

Usernames are required and unique for all roles. Normal API responses exclude
password and PIN values/hashes.

### JWT And Browser Storage

- JWT lifetime defaults to eight hours.
- Management JWT claims include `id`, `username`, `role`, and `owner_id`.
- Cashier JWTs additionally include terminal/stall binding claims.
- The frontend stores the JWT and public user object in `localStorage`.
- The Axios client attaches `Authorization: Bearer <token>`.
- Cashier requests also attach `X-Device-Token`.
- Logout clears the authenticated session.
- Remote device revocation clears the affected Cashier session through a
  targeted Socket.IO event, with API/focus checks as fallback.

This localStorage access-token design is accepted for the final project.
Short-lived access tokens plus rotating HttpOnly refresh-token cookies remain a
future production improvement.

### Auth Security Controls

- `JWT_SECRET` is required at backend startup.
- Username/password login is limited to eight attempts per minute.
- PIN login is limited to five attempts per minute.
- Helmet security headers are enabled.
- CORS uses `FRONTEND_ORIGIN` in production and allows local development origins.
- Request logging recursively masks keys containing password, PIN, token,
  authorization, or secret.

## 5. Frontend Application Baseline

### Public And Protected Routes

| Route | Access |
| --- | --- |
| `/` | Public landing page |
| `/login` | Public login and terminal-registration entry |
| `/cashier` | Cashier only |
| `/owner-portal` | Owner and Manager |

`platform_admin` has no frontend route. Frontend route guards improve navigation
and user experience, while backend middleware enforces actual security.

### Cashier Workspace

Implemented cashier capabilities include:

- Product search and category filtering.
- Stall-scoped visible product catalog.
- Product images and compact responsive menu layouts.
- Cart quantity changes, item removal, clear-cart confirmation, and notes.
- Cash received input and change preview.
- Backend-created order and backend-confirmed cash payment.
- Paid receipt display.
- Own order history.
- Telegram kitchen ticket status and retry for the Cashier's own paid order when
  the latest dispatch is missing or failed.
- Real-time payment, kitchen-ticket, and device-revocation updates.

### Owner/Manager Portal

The management portal currently contains these tabs in desktop and mobile order:

1. Dashboard
2. Menu & Catalog
3. Stall Management
4. Staff Management
5. Sales Reports

Implemented management capabilities include:

- Product and category CRUD.
- Multiple stall assignments per product.
- Per-stall product prices and visibility.
- Product image uploads through ImageKit.
- Stall CRUD.
- Cashier-to-stall assignment.
- Multiple named terminal registrations and individual revocation.
- Role-scoped staff management.
- Stall-scoped Telegram cook authorization.
- Owner-only Telegram kitchen-group connection.
- Order/receipt viewing and failed kitchen-ticket retry.
- Report presets, custom dates, search, filters, pagination, charts, CSV export,
  and PDF export.

Current backend routes allow both Owner and Manager to perform operational
catalog, category, stall, staff-assignment, device, Telegram-cook, and reporting
actions. Owner-only behavior currently includes creating a Telegram kitchen-group
connection and managing Manager accounts. Destructive catalog/stall permissions
should be described exactly as implemented unless the team approves a stricter
future policy.

## 6. Catalog, Stall, And Device Rules

### Categories

- Categories are scoped by `owner_id`.
- Names are unique per Owner.
- Owner and Manager can create, update, list, and delete categories in their
  business scope.
- Each product belongs to one category.
- The UI can move existing products between categories.

### Products

- Product catalog ownership is derived through the product's owner-scoped
  category.
- Product name and positive USD/KHR prices are validated by the backend.
- Category IDs and assigned Stall IDs must exist in the same owner scope.
- A product may have zero Stall assignments and remain in the management catalog.
- Default USD/KHR prices are retained when the last Stall assignment is removed.
- A Cashier sees a product only when it is active, not deleted, assigned to the
  Cashier's Stall, and visible in that Stall assignment.
- Product binary files are stored by ImageKit; MySQL stores the delivered URL.

### Stalls And Staff

- Every customer Stall is linked to its Owner.
- Managers operate inside their Owner's scope through `owner_id`.
- Only Cashiers can be assigned to Stalls.
- Cashier assignment validates both the User and Stall against the same business.
- Stall deletion is implemented as a soft delete/inactivation.

### Registered Terminals

- A Stall can have multiple active named devices.
- Each device has its own token hash and can be revoked independently.
- Device responses expose operational metadata but not token hashes.
- Device revocation targets only the selected terminal.
- The Owner/Manager device registry refreshes through Socket.IO events.

## 7. Active Order And Cash Payment Flow

### Order Creation

`POST /api/orders` is Cashier-only. The frontend sends:

- Payment method.
- Product ID.
- Quantity.
- Optional notes up to 500 characters.

The backend:

1. Derives Cashier ID from the JWT.
2. Derives Stall ID from the Cashier assignment.
3. Loads Stall-specific Product prices from MySQL.
4. Rejects invalid quantity, hidden products, and products outside the Stall.
5. Rejects client-submitted trusted fields such as price, total, status,
   `cashier_id`, and `stall_id`.
6. Calculates trusted totals.
7. Creates an Order with `pending_payment`.
8. Stores Order Item name, price, quantity, line-total, and notes snapshots.
9. Writes an `order_created` Audit Log.

### Cash Confirmation

`POST /api/orders/:id/confirm-cash`:

- Accepts `cash_received_usd`.
- Allows the creating Cashier or a same-business Owner/Manager.
- Requires a cash Order in `pending_payment`.
- Rejects underpayment, paid Orders, cancelled Orders, and non-cash Orders.
- Calculates and stores change using integer cents.
- Sets status to `paid` and records `completed_at`.
- Writes a `cash_payment_confirmed` Audit Log.
- Emits a same-business management update.
- Dispatches the paid Order to the Stall's Telegram kitchen group asynchronously.

### Order Access

- Cashier order history is filtered by `cashier_id`.
- Owner/Manager order history is filtered by their business Owner scope.
- Cashier can retrieve only an Order they created.
- Owner/Manager can retrieve only an Order belonging to their business.

### Status Caveat

The schema supports `pending_payment`, `paid`, and `cancelled`. The active routes
do not currently expose a general order-cancellation endpoint. Later PRD and flow
documents must not describe cancellation as an implemented user action unless the
team implements and verifies it.

## 8. KHQR Status

KHQR is **retained but disabled by default**.

- Backend flag: `KHQR_ENABLED=false`.
- Frontend flag: `VITE_KHQR_ENABLED=false`.
- Disabled KHQR creation/status checks return `503` with `KHQR_DISABLED`.
- The background checker exits without querying pending payments when disabled.
- Cashier KHQR controls and resume actions are hidden when disabled.
- Historical KHQR Orders, receipts, report values, audit data, schema fields, and
  provider code remain readable.

The retained implementation can generate Individual KHQR payloads, store
`qr_payload`, `qr_md5`, payment reference and expiry, and check Bakong by MD5.
It must remain disabled until the team approves a suitable merchant provider,
credentials, request limits, reconciliation contract, and production support.

## 9. Telegram Kitchen Flow

### Group Connection

- One Telegram group can be connected to a Stall.
- Only the same-business Owner can generate a group-connection link.
- The link contains a short-lived, one-time raw token.
- MySQL stores only the token's SHA-256 hash.
- Telegram consumes the token through a `startgroup` message in a group or
  supergroup.
- Invalid, expired, reused, private-chat, and cross-Stall group connections are
  rejected.
- Complete Telegram chat IDs remain backend-only; management receives connection
  state, title, and a masked ID.

### Ticket Dispatch

- A paid cash Order is dispatched asynchronously to its Stall's connected group.
- Telegram failure does not roll back the paid Order.
- Ticket status is stored separately as `pending`, `sent`, `failed`, or `done`.
- Owner/Manager may retry a missing or failed paid-order ticket in their business.
- Cashier may retry only their own missing or failed paid-order ticket.
- Pending, sent, and done tickets cannot be duplicated through retry.

### Cook Completion

- Telegram callback requests require the configured webhook secret.
- The callback must match the exact Order, ticket, chat, and message.
- The Order must be paid and the ticket must be sent.
- The Telegram user must be an active Cook for that Stall.
- Successful completion edits the existing Telegram message, records the cook
  identity/display name, sets the ticket to `done`, and emits real-time UI updates.

## 10. Reporting Baseline

Owner and Manager reports use backend-owned `GET /api/reports/sales`.

Supported report behavior includes:

- Today, current Monday-Sunday week, month, and custom date ranges.
- Optional Stall and Cashier filters.
- Transaction-ledger search.
- Server-side ledger pagination.
- Summary revenue, paid-order count, average order value, and payment mix.
- Stall and Cashier breakdowns.
- Business-local hourly revenue.
- Hourly, daily, or seven-day trend granularity.
- Previous-period comparisons.
- CSV and PDF export in the frontend.
- Receipt viewing from the transaction ledger.
- Socket.IO-triggered refetch with polling fallback.

Orders are stored in UTC. Report date boundaries and buckets use
`REPORT_TIMEZONE_OFFSET`, defaulting to Cambodia's `+07:00`.

## 11. Data Ownership And Main Entities

| Entity | Purpose |
| --- | --- |
| `users` | Web users, roles, owner scope, and role-appropriate credentials |
| `stalls` | Customer business selling locations and Telegram destination |
| `stall_devices` | Independently revocable registered terminals |
| `stall_staff` | Cashier-to-Stall assignments |
| `categories` | Owner-scoped catalog groups |
| `products` | Catalog metadata and retained default prices |
| `stall_products` | Per-Stall product assignment, prices, and visibility |
| `orders` | Payment method, state, trusted totals, and payment metadata |
| `order_items` | Historical product name/price/quantity/notes snapshots |
| `audit_logs` | Actor, action, Order, details, and timestamp |
| `telegram_tickets` | Kitchen delivery and completion state |
| `telegram_cooks` | Stall-scoped Telegram completion allowlist |
| `telegram_group_connections` | Hashed, expiring one-time group setup attempts |

The Sequelize models and `docs/database/schema.sql` currently define the same
active role enums, Order states, Telegram tables, device table, and KHQR fields.
The later database schema document must verify every column, index, foreign key,
nullability rule, and delete behavior in detail.

## 12. Real-Time Events

Socket.IO runs on the same HTTP server as Express.

- Cashier sockets authenticate with JWT and active device token.
- Management sockets authenticate with JWT and Owner scope.
- `payment_confirmed` targets the creating Cashier.
- `device:revoked` targets the selected registered terminal.
- `device_registry_updated` targets same-business management.
- `order_updated` targets same-business management.
- `kitchen_ticket_updated` targets the creating Cashier and same-business
  management.
- Telegram group connection changes notify same-business management without
  exposing the complete chat ID.

Polling/refetch remains a fallback for missed events and reconnects.

## 13. Environment And External Services

Required backend startup configuration:

- `JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_NAME`
- `DB_PASSWORD` only when `DB_PASSWORD_REQUIRED=true`
- `FRONTEND_ORIGIN` in production

Feature-specific configuration:

- Telegram bot token, webhook secret, and group-link expiry.
- ImageKit public/private keys and URL endpoint.
- Report timezone offset.
- KHQR/Bakong account, API, expiry, and checker settings, currently disabled.

Secrets are backend-only and must not be committed or returned to the frontend.

## 14. Implemented, Suspended, And Future Matrix

### Implemented

- JWT authentication and server-side RBAC.
- Role-specific bcrypt credentials.
- Rate limiting, Helmet, CORS, and sanitized request logging.
- Multi-owner data isolation through Owner scope.
- Stall-scoped Cashier terminal sessions.
- Products, categories, Stalls, staff assignments, and registered devices in MySQL.
- Backend-owned cash Orders, change calculation, history, and audit logs.
- Telegram Stall routing, Cook authorization, ticket completion, retry, and live
  UI updates.
- Owner/Manager dashboards, reports, filters, receipt viewing, CSV, and PDF.
- Responsive light/dark frontend design.

### Retained But Disabled

- New KHQR Order creation.
- Bakong MD5 status checking.
- KHQR background reconciliation.
- Cashier KHQR modal, polling, and resume controls.

### Future Or Open

- Approved merchant QR payment provider.
- Full `platform_admin` portal and multi-customer SaaS administration.
- Subscription/licensing and Owner recovery.
- General Order cancellation workflow.
- Automatic retry worker for failed Telegram delivery.
- Offline-first ordering and background synchronization.
- Parked transactions.
- Hardware integrations such as receipt printers and cash drawers.
- HttpOnly refresh-token cookie architecture.
- Formal deployment, monitoring, backup, and disaster-recovery procedures.

## 15. Known Documentation Traps

Later documents must avoid these outdated or ambiguous statements:

- Do not use `admin` as an active role. The active roles are `platform_admin`,
  `owner`, `manager`, and `cashier`.
- Do not describe Cook as a web user.
- Do not describe KHQR as an active cashier payment method.
- Do not claim Bakong sends a payment webhook; retained verification checks by
  MD5 through the backend.
- Do not describe multiple Owners for one customer business.
- Do not describe client-calculated prices or totals as trusted.
- Do not describe product/category/Stall/staff data as localStorage-owned.
- Do not claim Order cancellation is available merely because the enum contains
  `cancelled`.
- Do not expose complete Telegram user, chat, or message IDs in user-facing
  examples.

## 16. Baseline Evidence Map

| Area | Primary implementation evidence |
| --- | --- |
| Product scope | `context/project-overview.md` |
| Architecture and invariants | `context/architecture.md` |
| Frontend routes | `frontend/src/app/App.jsx` |
| Frontend permissions | `frontend/src/utils/permissions.js` |
| Auth storage and headers | `frontend/src/features/auth/authStorage.js`, `frontend/src/services/apiClient.js` |
| Backend route protection | `backend/src/routes/` |
| JWT and device middleware | `backend/src/middleware/auth.middleware.js` |
| Credential and hierarchy rules | `backend/src/services/auth.service.js`, `backend/src/services/user.service.js` |
| Catalog/stall scope | `backend/src/services/product.service.js`, `backend/src/services/stall.service.js` |
| Order creation and cash | `backend/src/services/orders/` |
| Reports | `backend/src/services/report.service.js`, `backend/src/repositories/report.repository.js` |
| Telegram security/routing | `backend/src/services/telegram-*.service.js` |
| Real-time behavior | `backend/src/services/websocket.service.js`, `frontend/src/services/socketClient.js` |
| Data model | `backend/src/models/`, `docs/database/schema.sql`, `docs/database/erd.md` |
| Environment contract | `backend/src/config/env.js`, `backend/.env.example` |

## 17. Next Documentation Step

Use this fact sheet to create `docs/product/toub-pos-prd.md`. The PRD should:

- Assign stable requirement IDs.
- Separate implemented requirements from future requirements.
- Define product goals, users, business value, constraints, success criteria, and
  out-of-scope behavior.
- Reference this baseline for current behavior instead of repeating technical
  implementation details.

