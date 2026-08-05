# Architecture Context

## Stack

| Layer        | Technology              | Role                                              |
| ------------ | ----------------------- | ------------------------------------------------- |
| Frontend     | ReactJS + Vite          | UI rendering and state management                 |
| API Client   | Axios                   | Centralized HTTP requests, auth/device headers, and error normalization |
| Charts       | Recharts                | Owner/Manager dashboard and reporting visualizations |
| Backend      | Node.js + Express.js    | REST API, WebSocket server, Telegram callback handler |
| Database     | MySQL                   | Relational data storage                           |
| Auth         | JWT                     | Secure authentication and session management      |
| Real-Time    | WebSocket (ws / socket.io) | Cashier-specific payment confirmation push     |
| Kitchen Bot  | Telegram Bot API        | Order relay and cook acknowledgement system       |
| Product Media | ImageKit              | Browser-direct product photo uploads and delivery |
| Abuse Controls | Redis/Valkey + express-rate-limit | Shared production authentication counters |

### Approved First Deployment Baseline

- Render is the approved first application host. The repository-root
  `render.yaml` defines a global static frontend, one Starter Node web service
  in Singapore for Express/Socket.IO/the Telegram dispatch worker, and one
  private Starter Render Key Value instance for shared authentication limits.
- MySQL remains on Aiven and must use the verified provider CA. Render receives
  database and integration secrets only through its environment configuration;
  no production secret is stored in the Blueprint or frontend build variables.
- The API runs managed migrations as a Render pre-deploy command, starts only
  when the migration ledger and dependencies are ready, and exposes
  `/api/health/ready` as the platform health check. Render's 20-second shutdown
  allowance exceeds TouB's 15-second internal drain budget.
- Keep one API instance for the first deployment. Horizontal scaling remains
  blocked until Socket.IO connection coordination is shared and verified. The
  Telegram outbox is already durable in MySQL and may safely resume in the
  single API process after restart.
- This is a deployment configuration baseline, not evidence of a successful
  deployment. Exact URLs, CORS/cookie behavior, proxy hops, Aiven TLS, service
  logs, alerts, and the cash-to-kitchen-to-report journey require live
  verification before launch.

## System Boundaries

- `frontend/src/app/` — Application routing and route-protection composition.
- `frontend/src/app/AppErrorBoundary.jsx` — Root render/lifecycle recovery boundary outside application providers. It presents a safe retry/reload screen and emits only sanitized correlation metadata.
- `frontend/src/features/` — Feature-owned UI grouped by business capability: authentication, cashier sales, catalog, management shell, payments, reports, staff, and stalls.
- `frontend/src/shared/layout/` — Cross-feature page shells and top-level layout components.
- `frontend/src/shared/theme/` — Persistent light/dark theme state and the shared theme toggle.
- `frontend/src/shared/notifications/` — Application-wide, accessible transient action feedback with a bounded queue and domain-neutral notification API.
- `frontend/src/components/ui/` — Reusable, domain-neutral UI primitives such as buttons, forms, dialogs, badges, pagination, loading states, and the keyboard skip link shared by public and authenticated shells.
- `frontend/src/pages/` — Remaining route-level Cashier and Owner/Manager orchestration pages. The login route is owned by `features/auth/pages/`.
- `frontend/src/hooks/`, `services/`, and `utils/` — Shared state/data hooks, Axios/Socket.IO clients, and domain-neutral helpers used across features.
- `frontend/e2e/` — Playwright browser journeys for critical role, session, terminal, checkout, receipt, and route-protection behavior. CI runs these serially against disposable MySQL/API/frontend instances.
- `backend/src/routes/` — API route definitions and endpoint mapping.
- `backend/src/controllers/` — Thin request handling and response formatting. Controllers delegate validation, authorization decisions, and workflow coordination to services.
- `backend/src/validation/` — Shared HTTP mutation schemas, normalization helpers, storage-aware limits, and the consistent `VALIDATION_ERROR` contract.
- `backend/src/services/` — Core business logic for auth, users, products, categories, stalls/devices, orders, reports, Telegram callbacks, WebSocket sessions, and external providers.
- `backend/src/repositories/` — Database queries and data access logic.
- `backend/src/services/telegram.service.js` — Low-level Telegram Bot API integration and outbound kitchen ticket dispatch.
- `backend/src/services/telegram-dispatch-worker.service.js` — Durable outbox worker that claims paid-order delivery jobs, retries transient failures, and records terminal outcomes.
- `backend/src/services/telegram-callback.service.js` — Inbound cook callback workflow, ticket state updates, and real-time UI notification.
- `backend/src/services/websocket.service.js` — WebSocket server; maps `cashier_id → socket` for isolated push.
- `backend/src/services/order.service.js` — Stable public order-service facade consumed by controllers and background jobs.
- `backend/src/services/orders/` — Focused order modules for creation, access/querying, cash confirmation, KHQR reconciliation, and Telegram retry/dispatch coordination.
- `backend/src/services/report.service.js` — Report validation, response mapping, trend composition, and public report orchestration.
- `backend/src/repositories/report.repository.js` — Owner-scoped raw SQL aggregations and paginated Sequelize ledger access.
- `backend/src/utils/report-range.util.js` — Validated business-local date boundaries, comparison ranges, timezone conversion, and trend granularity.
- `backend/src/startup/` — Automatic boot-time maintenance and process-local workers started by `server.js`.
- `backend/src/startup/graceful-shutdown.js` — Bounded SIGTERM/SIGINT drain orchestration for HTTP, Socket.IO, background workers, Redis, and Sequelize.
- `backend/src/database/` — Ordered Umzug migrations, the immutable current-schema baseline, and the `schema_migrations` ledger integration.
- `backend/src/scripts/dev/` — Manually invoked development operations such as the Ngrok/Telegram webhook tunnel.
- `backend/tests/` — Node test-runner coverage. Unit tests are database-free; `*.live.test.js` suites require the local API/MySQL and own cleanup of temporary records.
- Browser E2E fixtures come from the deterministic backend seed and must never target a shared development, staging, or production database.

### Frontend Dependency Direction

- Route entry points in `app/` compose pages and providers; they do not contain business logic.
- Owner/Manager feature tabs are lazy-loaded at their existing feature boundaries. The shared management shell remains immediate, while dashboard, catalog, stalls, staff, reports, and financial settings load only when selected. Production builds enforce separate size budgets for the Owner Portal entry and tab chunks.
- Feature components may import shared UI, hooks, services, utilities, and components from another feature only when the workflow genuinely crosses feature boundaries, such as reports opening the shared payment receipt.
- Shared layout and theme modules must remain domain-neutral and must not import cashier, catalog, staff, stall, or report business components.
- Feature files should not be moved back into the flat `components/` directory. New feature-specific UI belongs under the corresponding `features/<feature>/components/` folder.

### Backend Dependency Direction

- Routes compose authentication/authorization middleware, request schemas, and controllers.
- Request schemas reject unknown fields and normalize bounded HTTP input before controllers run. Provider-owned callback envelopes may use dedicated validation because their shape is controlled externally.
- Controllers translate validated HTTP input/output only and call services; they do not import Sequelize models or repositories directly.
- Services own business validation, RBAC/owner-scope decisions, external-provider coordination, and multi-step workflows.
- Large service domains may expose a stable facade while delegating to focused modules; consumers should import the facade unless they are part of the same domain.
- Repositories own Sequelize queries and persistence details and do not import controllers or services.
- Models define tables and associations and remain independent of HTTP concerns.

## Storage Model

- **MySQL Database**: Stores all relational data including Users, Stalls, Staff assignments, Orders, Order Items (with modifiers), and Payment Confirmations.
- **Schema lifecycle**: Ordered Umzug migrations are the only schema-change path. Production startup is read-only and fails when migrations are pending; deployment runs `npm run db:migrate` before starting the API. Development startup and seed commands apply pending migrations without using `sequelize.sync()`.
- **Database transport**: Production MySQL connections require the hosting provider CA through `DB_SSL_CA_PATH` or `DB_SSL_CA`. Sequelize and raw MySQL connections use `rejectUnauthorized: true`; missing, unreadable, or invalid CA configuration fails startup/migration rather than disabling certificate or hostname verification.
- **Authentication rate-limit store**: Development may use process-local counters. Production requires a Redis-compatible shared store so every API instance observes the same broad-IP and IP/account counters. Account subjects are SHA-256 hashed in store keys, Redis failures fail closed, and startup verifies the store before accepting traffic.
- **Database backups**: Database dumps are never source artifacts and must not be tracked by Git. The repository backup command writes plaintext only to an operating-system temporary directory, retains an AES-256 GPG-encrypted artifact plus SHA-256 checksum outside version control, and requires a separate protected encryption passphrase. The scheduled workflow uploads the encrypted files before restoring them into an isolated MySQL service, verifies required tables and migration status, and deletes temporary plaintext automatically. The approved recovery targets are a 24-hour RPO and 4-hour RTO. CI allows SQL only in the canonical migration and course-document paths.
- **Telegram dispatch outbox**: `telegram_dispatch_jobs` stores one durable job per paid Order. The payment transaction and enqueue either commit together or roll back together; a database-locking worker performs the external Telegram call afterward.
- **ImageKit**: Stores product photo binary assets. The backend issues short-lived browser-upload authentication parameters to Owner/Manager users only, while MySQL stores only the delivered asset URL in `products.image_url`.
- **Browser auth storage**: Short-lived access JWTs and the public user session
  exist only in JavaScript memory. A rotating opaque refresh token is held in a
  Secure, HttpOnly cookie; MySQL stores only its SHA-256 hash and rotation
  lineage. A non-credential CSRF proof returned by login/refresh is persisted
  separately and sent as `X-CSRF-Token`; it must match both the API cookie and
  stored hash on refresh/logout. This supports separate frontend/API domains.
- **localStorage (Frontend)**: Limited to the raw per-device registration token,
  registration metadata, theme, non-auth preferences, and versioned cashier
  recovery records containing product IDs, quantities, notes, and checkout
  identifiers. Recovery records are scoped by cashier and registered device,
  expire after 12 hours, and never supply trusted product prices or payment
  status. The raw device
  token is never stored in MySQL; the database stores its SHA-256 hash. Device
  data and recovery records are cleared on remote revocation, while normal
  cashier logout preserves terminal registration and recoverable work.

## Auth and Access Model

- Every web user signs in through a JWT-secured auth endpoint.
- Credential login issues a short-lived access JWT plus an opaque refresh token
  with an eight-hour absolute expiry. The refresh token rotates after every use,
  is stored only in an HttpOnly cookie, and is represented by a hash in
  `refresh_sessions`.
- Page reload restores the session through `POST /api/auth/refresh`; the access
  token is never restored from localStorage. Axios shares one refresh operation
  across concurrent expired requests and retries each original request once.
- Refresh and logout use double-submit CSRF protection. Production cookies are
  Secure; `AUTH_COOKIE_SAME_SITE` must match the chosen same-site or cross-site
  deployment topology.
- Owner/Manager username-password login and Cashier PIN login are separate, rate-limited flows. Express resolves client IPs through an explicit `TRUST_PROXY_HOPS` value; production does not use permissive boolean proxy trust.
- The system uses Role-Based Access Control (RBAC).
- The active roles are `platform_admin`, `owner`, `manager`, and `cashier`.
- `platform_admin` is a temporary TouB POS team bootstrap role that can create business Owner accounts only. It is API-only for now and does not access the owner/manager portal.
- Owners have full control over one customer business and may create Manager and Cashier users only.
- Managers handle day-to-day operations and may create/manage Cashier users only.
- Cashiers can only view and mutate transactions linked to their active session.
- Cashier PIN login requires an active registered device for the cashier's assigned stall. Cashier JWTs include `device_id` and `stall_id`, and protected cashier requests verify the matching device token is still active.
- Every JWT also includes `session_version`. Protected HTTP requests and Socket.IO
  connections load the current user row and require an active, non-deleted user
  with matching username, role, owner scope, and session version. User edits or
  deletion increment the version and emit a targeted real-time logout event.
- Owners and Managers have access to the management portal, transactions, reports, and operational tools according to their permission level.
- Platform Admin, Owner, and Manager accounts store a bcrypt password hash and must have `pin = NULL`.
- Cashier accounts store a bcrypt PIN hash and must have `password = NULL`.
- Password hashes, raw PINs, and PIN hashes are never returned by normal API responses.
- Internal session versions are never returned by normal user or login responses.
- Express applies a deny-by-default CSP and Helmet security headers to API responses. The Vite build injects an enforcing frontend-document CSP derived from `VITE_API_BASE_URL`, allowing only self-hosted scripts, the configured API/Socket.IO origin, ImageKit uploads, and the existing bounded image/style requirements.
- Swagger remains available without separate credentials only in development. Production omits `/api/docs` by default; explicitly enabling it requires separate Basic Auth credentials and applies an isolated documentation CSP.
- Future SaaS/multi-customer versions should expand `platform_admin` into a full audited platform console with tenant isolation, subscription/license management, owner recovery, and support-only access rules.

## Invariants

1. Request handlers must only handle HTTP routing; business logic strictly belongs in the services layer.
2. Auth must be enforced at every mutation boundary.
3. Cash requires explicit cashier/manager/owner confirmation. If KHQR is re-enabled after provider approval, it cannot be marked paid without a verified provider result matching the trusted order.
4. WebSocket payment notifications must only be pushed to the socket registered by the cashier who initiated that specific QR session. No broadcast.
5. A terminal may only load menu items and staff rosters scoped to its registered stall. Multiple devices may belong to one stall, and revoking one must not affect another.
   - Every cashier request and socket connection must prove that the current `stall_staff` assignment, JWT `stall_id`, and registered device `stall_id` are identical.
   - A cashier has at most one `stall_staff` row, enforced by a unique database index. Moving or removing an assignment locks the stable User row and performs assignment, refresh-session revocation, and administrative auditing in one transaction before invalidating live sessions; physical terminals remain registered.
6. Telegram ticket completion requires an exact ticket/chat/message match and an active stall-scoped `telegram_cooks` identity. Cooks remain outside web RBAC.
7. Telegram group routing may only be connected through a short-lived, one-time, hashed setup token created by the same-business Owner. Managers may manage cook identities but cannot reroute the kitchen destination. Client-submitted `telegram_chat_id` values are not trusted.
8. Order item modifiers/notes must be stored as a snapshot at time of order — not linked to a live config.
9. For the current release, the trusted final order total equals the backend-calculated item subtotal. The frontend must not invent service fees or taxes. Any future charge requires an approved backend-owned policy covering rates, rounding, exemptions, snapshots, receipts, and reports.
10. Product USD/KHR prices are synchronized in the management UI using the Owner's saved rate; editing either field regenerates the other. Every Order stores trusted USD and whole-riel KHR totals and the Owner's business exchange rate at creation time. New cashier Orders use USD as the canonical settlement value while showing both totals. Cash confirmation may accept independent USD and KHR amounts, but conversion, underpayment checks, and both equivalent change amounts are backend-owned. Historical orders retain their original pricing-currency and rate snapshots; changing the current setting never rewrites them.
11. Unhandled React render and lifecycle failures must reach the root error boundary. Its fallback must not clear browser recovery records or display the thrown message/stack, and diagnostics must contain only a generated correlation ID, sanitized pathname, and component names. Event-handler and asynchronous failures remain the responsibility of their normal request/workflow error handling because React error boundaries do not catch them.
12. Public and authenticated application shells must expose one `main-content` landmark reachable through the first keyboard-focusable skip link. Interactive controls must retain a visible focus indicator, validation errors must be announced, and icon-only controls must have an accessible name.

## Frontend State Management

- **UI State**: Handled locally within components using `useState` and `useEffect` (e.g., active modals, UI toggles).
- **Global/Server State**: Abstracted into custom hooks (e.g., `useProducts`, `useOrders`) which interface with the central Axios-backed API service.
- **Cart Management**: `useCart` owns the active cart for the cashier workspace.
  It persists only product IDs, quantities, and notes in a versioned,
  cashier/device-scoped 12-hour recovery record. After authentication and
  catalog loading, persisted items are reconciled against current backend
  products; missing or hidden products are dropped, and current backend names,
  prices, images, and categories replace stale display data.
- **Checkout Recovery**: A pending checkout stores its signature, payment
  method, idempotency key, and backend order ID in the same scoped recovery
  boundary. `useOrders` checks a known order ID after session restoration,
  resumes pending Cash/KHQR UI, opens an already-paid receipt, and reuses the
  idempotency key when the create response was interrupted.
- **Backend Availability**: Cashier checkout is online-only. The cashier page probes the public API health endpoint, reacts to browser connectivity events, and disables every payment action while the API is unreachable. The cart remains editable and is not cleared by connection failures.
- **Authentication State**: Owned by `features/auth/`, including context, storage keys, login UI, and the login route page.
- **Theme State**: Owned by `shared/theme/`; the selected light/dark mode is persisted in browser storage and consumed through `useTheme`.

## Reporting Flow

- Owner/Manager sales reports use `GET /api/reports/sales` instead of frontend-only calculations.
- The backend applies same-business owner scope, date range filters, optional stall/cashier filters, and returns summary totals, payment mix, stall/cashier breakdowns, hourly revenue, and ledger rows.
- Active Owner/Manager reports refetch their current filters when the authenticated management socket receives an order or kitchen-ticket update; periodic polling remains a fallback for reconnects or missed events.
- Preset and custom calendar ranges use the same backend report contract; custom ranges send validated `start_date` and `end_date` values.
- Dashboard hourly revenue and exported PDF totals/rows come from the backend report response. The frontend may still use loaded order details for receipt viewing or as a temporary display fallback while the report request loads.
- Dashboard requests opt into `include_trends=true`: today and one-day custom ranges return hourly points; the current Monday-based week always returns seven Monday-Sunday points; month and custom ranges through 31 days return daily points; longer custom ranges return seven-day buckets. Future weekdays are display-only zero points, while summaries and previous-week comparisons stay week-to-date. Comparison percentages remain backend-owned.
- Order timestamps remain stored in UTC. Report date boundaries and hourly buckets use `REPORT_TIMEZONE_OFFSET` (default `+07:00` for Cambodia) so dashboards reflect business-local time independently of the API server timezone.

## Current Payment Flow (Phase 4)

- Cashier checkout calls `POST /api/orders` with product IDs, quantities, optional notes, and payment method only.
- Each checkout attempt sends a client-generated `Idempotency-Key`. The backend stores the key uniquely per cashier with a SHA-256 request fingerprint, returns the original order for an exact replay, and rejects key reuse with changed order data.
- The frontend retains the key and created order ID in `sessionStorage` until checkout succeeds. A retry resumes the same pending order and never creates another order merely because a create or confirmation response was lost.
- Cash and KHQR checkout require a reachable TouB POS backend. The UI checks backend availability every five seconds and on browser reconnect/focus, disables payment controls while unavailable, and never claims cash can complete offline.
- The backend derives `cashier_id` from the JWT and `stall_id` from the cashier's staff assignment.
- Authentication verifies the current cashier assignment against both the JWT and registered terminal. Order creation rechecks and locks that same assignment inside its transaction before using the verified stall ID.
- The backend loads product prices from MySQL, calculates trusted subtotal/total values, snapshots item names/prices, and creates the order as `pending_payment`.
- Cash confirmation uses `POST /api/orders/:id/confirm-cash`.
- Cash confirmation is allowed for the creating Cashier, or an Owner/Manager within the same business owner scope.
- Successful cash confirmation requires at least one of `cash_received_usd` or `cash_received_khr`, evaluates the combined tender with the Order's saved rate, rejects underpayment, stores each physical tender amount plus equivalent USD and KHR change values, changes `orders.status` to `paid`, sets `completed_at`, and writes a `cash_payment_confirmed` audit log.
- The frontend must not create paid orders locally or submit trusted fields such as totals, status, `cashier_id`, or `stall_id`.

## KHQR Individual Payment Flow (Suspended)

- KHQR is disabled by default while TouB POS evaluates an approved merchant payment provider.
- Backend `KHQR_ENABLED` and frontend `VITE_KHQR_ENABLED` must remain `false`; backend startup rejects an attempted enable.
- With KHQR disabled, backend order creation and status checks return `503` with code `KHQR_DISABLED`; the background checker does not query MySQL or Bakong.
- Cash checkout, historical KHQR order reads, reports, receipts, and audit history remain unaffected.
- The vulnerable legacy `bakong-khqr` SDK and its obsolete Axios dependency have been removed from the runtime.
- The retained status/history code is not an enable-ready provider integration. A future rollout requires a new approved adapter and security review.
- Cashier checkout calls `POST /api/orders` with safe item data and `paymentMethod = "khqr"`.
- The backend calculates trusted totals from MySQL and creates the order as `pending_payment`.
- The backend stores `qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at`.
- The frontend displays the backend QR payload and polls `POST /api/orders/:id/check-khqr-status` while the modal is open as a fallback.
- `BAKONG_ACCOUNT_ID` is required; KHQR generation must fail clearly instead of falling back to a placeholder account.
- The backend calls Bakong Open API `POST /v1/check_transaction_by_md5` with the stored `qr_md5`.
- `BAKONG_OPEN_API_TOKEN` is backend-only and must never be sent to the frontend.
- If Bakong reports payment success, the backend validates amount, currency, and configured destination account before marking the order `paid`.
- Already-paid status checks are idempotent and do not duplicate audit logs.
- A backend background checker scans unexpired `pending_payment` KHQR orders and uses the same Bakong validation path as the status-check endpoint.
- When either the status-check endpoint or background checker marks a KHQR order as `paid`, the backend emits a cashier-scoped `payment_confirmed` WebSocket event to the cashier who created that order and dispatches the paid order to the stall's Telegram kitchen channel.

## Real-Time & Kitchen Flow

- `websocket.service.js` initializes a Socket.IO server on the same HTTP server as Express.
- Cashier, Owner, and Manager sockets authenticate with the existing JWT. Platform Admin sockets are rejected because the temporary bootstrap role has no live POS UI.
- The service maintains strict socket maps by `cashier_id`, device ID, and management `owner_id`. It emits `payment_confirmed` only to the creating cashier, `device:revoked` only to the selected terminal, and `device_registry_updated` only to same-business management sockets so device lists refresh after registration or revocation. No payment or revocation broadcast.
- Owner/Manager sockets receive `order_updated` for same-business order creation and payment status changes, then refresh order history from the backend.
- When KHQR is explicitly enabled, `startup/khqr-background-checker.js` periodically checks unexpired pending KHQR orders through Bakong. It stays stopped by default.
- KHQR-paid orders reuse the same `dispatchToTelegram` kitchen ticket flow as confirmed cash orders.
- Owner/Manager order history surfaces `telegram_tickets.status` and can retry missing or failed Telegram dispatches for paid orders in their business. Cashiers can retry only their own paid orders. Pending tickets are treated as in-progress and are not retryable; sent/done tickets are not resent.
- Cash and retained KHQR confirmation create a unique `telegram_dispatch_jobs` row inside the payment transaction. The worker claims due jobs with `FOR UPDATE SKIP LOCKED`, retries temporary failures with exponential backoff, and resumes pending work after restart.
- If the process stops while a Telegram `sendMessage` result is unknown, the worker marks the pending ticket/job failed for manual review instead of automatically risking a duplicate kitchen message.
- When Telegram dispatch finishes as `sent` or `failed`, the backend emits `kitchen_ticket_updated` so the UI does not stay stuck on the temporary `pending` state.
- When an authorized cook taps "Done" in Telegram, the callback records their Telegram identity, updates the ticket to `done`, and emits `kitchen_ticket_updated` to the creating cashier and same-business Owner/Manager sockets.
- The Telegram bot should post a structured ticket with inline "Done" button after paid order confirmation.
- Cook taps "Done" → Telegram sends a callback query → backend verifies the webhook secret, exact ticket context, stall chat, and active cook identity before editing or persisting the ticket.

## Telegram Kitchen Bot Architecture

- **Outbound**: `telegram.service.js` uses the Bot API `sendMessage` with inline keyboard buttons after each confirmed order.
- **Inbound**: `POST /api/telegram/callback` receives callback queries from cook button taps.
- **Group connection**: Owner requests a short-lived `startgroup` link for one same-business stall. Telegram consumes the one-time hashed token inside the selected group, and the backend stores that group's ID/title as the stall's kitchen destination.
- **Security**: The webhook secret authenticates Telegram as caller. Group setup additionally requires an unexpired one-time token; ticket completion requires an authorized stall cook. Arbitrary frontend payloads and ordinary inbound callbacks cannot rewrite stall chat routing.
- **Identifier minimization**: Complete Telegram user/chat/message IDs stay in MySQL and backend-only workflows. Management responses expose masked identifiers, while order/report responses expose only the cook display name needed by the UI.
- **State update**: Uses `editMessageText` + `editMessageReplyMarkup` to mutate the ticket in-place (no new messages).
- **Format**: Ticket includes stall label, order ID, item list with modifiers, totals, and timestamp.

## Core Data Entities

- **User / Staff**: Unique username, role (`platform_admin` / `owner` / `manager` / `cashier`), and exactly one role-appropriate credential: Platform Admin/Owner/Manager use a bcrypt password hash; Cashier uses a bcrypt hash of the 4-digit PIN.
- **Stall**: A physical booth location. Has a name, assigned menu profile, staff roster, and zero or more registered devices.
- **StallDevice**: A named physical terminal with a hashed token, active/revoked state, last-seen timestamp, and most recent cashier metadata. Cashier JWTs are bound to its ID.
- **StallStaff**: Junction — maps `User` to `Stall` (a cashier can belong to one stall).
- **Category**: Global menu group shared across stalls.
- **Product**: Shared catalog item metadata with name, owner-scoped category, image, and default USD/KHR prices. A product may remain in the management catalog with zero stall assignments; its default price is retained for later reassignment while it stays unavailable to cashiers.
- **StallProduct**: Junction that maps a `Product` to a `Stall` and stores synchronized `price_usd`/`price_khr` display values plus visibility.
- **Order**: A transaction. Belongs to a `User` (cashier) and a `Stall`. Has payment method, status, totals, KHQR metadata when relevant, and cash received/change fields when cash is confirmed.
- **OrderItem**: Links `Order` to `Product`. Stores quantity, price snapshot, and **`notes`** (modifiers like "no ice").
- **AuditLog**: Append-only, tenant-scoped history for payment and privileged administrative actions. It stores the actor, stable action, Owner scope, target, request correlation, safe before/after summary, and timestamp; the business mutation and audit insert share one transaction.
- **TelegramTicket**: Tracks Telegram kitchen dispatch state for an order, including Telegram message/chat IDs, send status, and cook completion timestamp.
- **TelegramDispatchJob**: Durable one-per-Order kitchen delivery instruction with claim lock, attempt count, retry time, and bounded failure detail.
- **TelegramCook**: Stall-scoped Telegram-only identity allowed to complete kitchen tickets. It has no password, PIN, JWT, or management UI access beyond its Telegram callback permission.
- **TelegramGroupConnection**: Short-lived, one-time setup attempt that stores a SHA-256 token hash, stall, management creator, expiry, and consumed Telegram group metadata.

## Error Handling Strategy

- **Backend**: Every request receives a validated or server-generated correlation ID in `X-Request-ID`. The global Express error handler preserves intentional public application errors, but maps unexpected server failures to `{ success: false, code: "INTERNAL_SERVER_ERROR", message: "Internal server error.", request_id: "..." }` without exposing ORM, provider, configuration, or stack details.
- **Diagnostics**: Request completion and failure events are emitted as one-line JSON records with the same correlation ID. Nested credentials, authorization/cookie/CSRF/session values, PINs, tokens, and secrets are recursively redacted; unexpected error name, internal code, message, and stack remain server-side for diagnosis.
- **Frontend**: The `services/api.js` layer intercepts failing requests and surfaces them to the UI via toast notifications or inline error states, preventing silent failures.

## Runtime Health And Shutdown

- `GET /api/health/live` reports only that the Node process can answer HTTP. It
  does not check MySQL and is suitable for a hosting liveness/restart probe.
- `GET /api/health/ready` and compatibility path `GET /api/health` return `200`
  only after startup completes and MySQL answers within
  `READINESS_DATABASE_TIMEOUT_MS`. Starting, draining, timeout, and database
  failure return sanitized `503` responses with caching disabled.
- On SIGTERM/SIGINT, the application phase changes to `draining` before cleanup.
  Health routes remain available, while new business requests receive
  `503 SERVICE_DRAINING` with `Connection: close`.
- Shutdown stops and awaits KHQR/Telegram worker runs, closes Socket.IO and the
  HTTP listener, closes the shared Redis limiter client, and closes Sequelize.
  `SHUTDOWN_GRACE_PERIOD_MS` bounds the sequence; after the deadline remaining
  HTTP connections are forced closed and the process exits unsuccessfully.
- The hosting platform termination allowance must be longer than the configured
  application grace period. Readiness, not liveness, controls traffic routing.

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **KHQR / Bakong integration** | 🟢 Controlled | Disabled by default through backend and frontend feature flags because the available Open API polling allowance is not suitable for normal POS volume. Keep the retained integration inactive until an approved merchant provider and operating limits are confirmed. |
| 2 | **WebSocket routing — accidental broadcast to wrong cashier** | 🔴 High | `websocket.service.js` authenticates cashier sockets with JWT, keeps a strict `Map<cashier_id, socketIds>`, and emits only to the mapped cashier sockets. Continue to avoid broad `io.emit()` payment broadcasts. |
| 3 | **Telegram Bot async failures** | 🟢 Controlled | Payment commits a unique durable outbox job in the same transaction. A database-locking worker retries transient failures with backoff and records terminal failures; `telegram_tickets` remains independent from payment state and existing role-scoped manual retry remains available. A crash during the external send is treated as ambiguous and requires manual review because Telegram `sendMessage` has no idempotency key. |
| 3A | **Unauthorized Telegram ticket completion** | 🟢 Controlled | Telegram callbacks require a valid webhook secret, exact order/ticket/chat/message context, matching stall chat, and an active stall-scoped cook identity. Completion records the Telegram actor ID/name. |
| 4 | **KHR exchange rate governance** | ✅ Resolved by P2-6 | Owner-managed per business, constrained to whole-hundred KHR values and audited. New Orders snapshot the rate; historical records never use a later setting. A live-rate API remains out of scope. |
| 5 | **Stall data isolation — cross-stall data leak** | 🔴 High | Every query that returns cashier-facing products, orders, or staff must scope by the authenticated user and their backend stall assignment. Never trust a client-supplied stall ID for cashier access. |
| 6 | **Legacy localStorage fallback regression** | 🟡 Medium | Products, categories, stalls, users, and orders are now backend-owned. Future UI work must not reintroduce localStorage as the source of truth for persisted POS data; localStorage should remain limited to auth/session/device-style browser state. |
| 7 | **Duplicate KHQR status checks** | 🔴 High | Frontend polling and the background checker may verify the same order concurrently. The KHQR confirmation service uses a database row lock, rechecks status inside the transaction, and writes the payment audit log only for the first successful transition. |
| 8 | **QR amount or destination mismatch** | 🔴 High | A provider result may belong to the wrong amount or account. The backend validates Bakong amount, USD currency, and destination account against trusted order/environment values before marking an order paid. |
| 9 | **Session expiry mid-shift** | 🟢 Controlled | Access JWTs expire after about 15 minutes and are transparently renewed through a rotating refresh session with an eight-hour absolute shift limit. A rejected refresh returns to PIN login; checkout idempotency and the existing cart preserve incomplete work. |
| 10 | **Device token lifecycle** | 🟢 Controlled | `stall_devices` supports multiple named terminals per stall with SHA-256 token hashes. Owner/Manager users can revoke one device; backend middleware rejects its device-bound JWT requests and Socket.IO emits a targeted forced logout. Future production work may add token expiry/rotation and dedicated device audit events. |
| 11 | **Future platform admin data access** | 🔴 High | The current `platform_admin` role is limited to owner bootstrap only. If TouB POS becomes a multi-customer SaaS product, expand it with tenant isolation, support-session auditing, and least-privilege access before enabling any broader cross-customer administration. |

