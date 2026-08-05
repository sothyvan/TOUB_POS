# TouB POS Production Readiness Audit

**Audit date:** 2026-07-30  
**Repository state:** `main` at `26135e4` (`Docs cleanup`)  
**Audit mode:** Read-only inspection and non-destructive verification

**Remediation update (2026-08-01):** P0-1/P0-2, P1 application controls, and
P2-1 through P2-11 have been implemented or closed with documented bounded
exceptions. The production recommendation remains unchanged because external
infrastructure, operational ownership, product-policy, and production-like
verification items are still open.

## 1. Executive Summary

### Overall rating: Not ready

TouB POS has a credible final-project architecture and several controls that are already stronger than a typical prototype. The backend owns prices and totals, cash confirmation is transactional, order items snapshot product data, customer roles are enforced server-side, cashier sessions are device-bound, credentials are hashed, CORS is restricted, and Telegram kitchen callbacks have focused authorization tests.

It is not ready for an unsupervised production launch. The original audit found two confirmed P0 defects affecting money or stall isolation:

1. Retrying checkout after a lost response can create a second paid order because order creation has no idempotency key and the frontend does not retain the first order ID.
2. Reassigning a cashier can leave an authenticated terminal bound to one stall while product and order services use the cashier's new stall assignment.

Both original P0 findings are now closed. P0-1 uses a per-cashier idempotency key, request fingerprint, database uniqueness, frontend pending-order recovery, and concurrent live tests. P0-2 now requires the current assignment, JWT stall, and registered-device stall to match; assignment moves are transactional, stale API/socket sessions are invalidated, and the one-stall-per-cashier rule is database-enforced.

Managed migrations, Telegram transaction recovery, safe logging, readiness and
graceful shutdown, CI quality gates, and critical browser coverage have since
been implemented. Production readiness remains blocked by unverified hosting
and monitoring configuration, unresolved product/operational policies, and the
open coordinated Git-history cleanup described under P1-13. The vulnerable
KHQR SDK has been removed; bounded Sequelize/UUID and React Router scanner
exceptions are time-limited in the dependency risk register.

**Go/no-go:** **No-Go for production.** A supervised school demonstration using prepared data, cash payments, a controlled network, and a tested rollback laptop is reasonable after the P0 issues are fixed and the demo checklist is completed.

### Evidence confidence

- **Confirmed:** Directly observed in code, documentation, repository contents, or command output.
- **Likely risk requiring validation:** The repository indicates a risk, but product policy or live infrastructure determines its real impact.
- **Not verifiable:** Requires access to deployed infrastructure, provider accounts, organizational processes, or production data.

## 2. What Is Already Production-Quality

- **Backend-owned sales values:** The client submits product IDs, quantities, notes, and payment method. Product prices, cashier, stall, line totals, and order totals are derived by the backend in `backend/src/services/orders/order-creation.service.js:24-38` and `:107-186`.
- **Transactional cash confirmation:** The order row is locked, underpayment is rejected using integer cents, payment and audit log updates share one transaction, and repeated confirmation returns `409` in `backend/src/services/orders/cash-payment.service.js:24-81`.
- **Order snapshots:** Names, USD/KHR prices, quantities, line totals, and notes are copied into order items at purchase time in `backend/src/services/orders/order-creation.service.js:146-177`.
- **Server-side authorization:** Protected routes use JWT authentication and role authorization; customer services also apply owner/stall access checks rather than trusting the UI.
- **Credential handling:** Owner/manager passwords and cashier PINs use bcrypt; normal repository responses exclude `password` and `pin` in `backend/src/repositories/user.repository.js:23-29` and `:59-99`.
- **Cashier device binding:** Cashier JWTs are tied to an active registered device and stall in `backend/src/middleware/auth.middleware.js:30-49`.
- **Security middleware:** Helmet, restricted CORS, request sanitization, and login/PIN rate limits are present in `backend/src/app.js:18-45` and `backend/src/middleware/rate-limit.middleware.js:8-23`.
- **KHQR safety switch:** KHQR order creation is rejected when disabled in `backend/src/services/orders/order-creation.service.js:92-100`; the database-free test suite verifies the suspension rules.
- **Telegram callback controls:** Callback handling verifies ticket, chat, message, paid order, and authorized cook. Focused unit tests cover callback authorization, group connection, and identifier masking.
- **Accessible shared modal foundation:** `frontend/src/components/ui/ModalShell.jsx:30-74` manages initial focus, focus trapping, Escape, and focus restoration.
- **Centralized API transport:** Axios authentication and common unauthorized handling are centralized in `frontend/src/services/apiClient.js`.
- **Buildable frontend:** The production Vite build completes successfully.

These controls should be preserved during remediation.

## 3. Confirmed Findings

### P0 - Blocks Launch or Risks Money, Security, or Irreversible Data Loss

#### P0-1. Checkout retry can create duplicate paid sales

- **Status:** Resolved on 2026-07-30; retained here as the original finding and acceptance record.
- **Severity:** P0
- **Category:** POS data integrity / reliability
- **Business impact:** A timeout or lost HTTP response after the server creates or confirms an order leaves the cart on screen. Retrying can create and pay a second order, doubling revenue, audit entries, and kitchen tickets.
- **Evidence:** `frontend/src/hooks/useOrders.js:91-108` creates an order, confirms cash, and only then clears the cart. On any error it discards `createdOrder.id`. `backend/src/services/orders/order-creation.service.js:102-186` always creates a new order and accepts no idempotency key.
- **Recommended remediation:** Generate a client checkout idempotency key when payment starts, persist it with the cart/pending checkout, enforce a unique database constraint, and return the original order for repeated keys. Persist the created order ID before confirmation so confirmation can be resumed without recreating the order.
- **Acceptance criteria:** Dropping the response after order creation and after cash confirmation, then retrying each request, results in exactly one order, one payment, one creation audit entry, and one kitchen ticket.
- **Estimated size:** L
- **Dependencies:** Database migration framework; API contract update; frontend recovery state; concurrency/integration tests.

#### P0-2. Cashier reassignment can break terminal stall isolation

- **Status:** Resolved on 2026-07-30; retained here as the original finding and acceptance record.
- **Severity:** P0
- **Category:** Authorization / tenant and stall scoping
- **Business impact:** A terminal registered to Stall A can begin loading and selling Stall B products if its logged-in cashier is reassigned to Stall B. The order can be attributed and routed to the wrong stall while the device session still appears valid.
- **Evidence:** Authentication only compares the device to JWT `device_id` and `stall_id` in `backend/src/middleware/auth.middleware.js:30-49`. Product listing independently reads the cashier's current assignment in `backend/src/services/product.service.js:92-98`; order creation does the same in `backend/src/services/orders/order-creation.service.js:107-115`. Neither compares that assignment with the authenticated device/JWT stall.
- **Recommended remediation:** During every cashier authentication, verify the active `StallStaff` assignment equals both the device stall and JWT stall. Put the verified stall ID on `req.user`/request context and use it for product and order access. Reassignment should revoke or disconnect stale sessions.
- **Acceptance criteria:** Reassigning a logged-in cashier causes the old terminal session to receive a specific authorization error and log out; it cannot read or sell products from either an unbound or newly assigned stall until a valid login on the correct terminal.
- **Estimated size:** M
- **Dependencies:** Auth middleware/repository change; Socket.IO check; reassignment event; integration tests.
- **Resolution:** Cashier API and Socket.IO authentication now compare the current assignment with the JWT and device stalls. Product and order services use the verified request stall, reassignment/unassignment invalidates active cashier sessions without deregistering terminals, assignment moves run transactionally, and `stall_staff.user_id` is unique. The live order suite verifies rejection of the stale terminal and correct catalog/order scope after login on the newly assigned terminal.

### P1 - Must Be Addressed Before Production

#### P1-1. Cash checkout is presented as available while offline, but no offline sale queue exists

- **Status:** Resolved on 2026-07-30 by adopting explicit online-only checkout; retained here as the original finding and acceptance record.
- **Severity:** P1
- **Category:** Reliability / UX
- **Business impact:** Cashiers are told they can continue taking cash, but checkout still requires the backend. During an outage the sale fails, and refresh or session expiry can lose the cart.
- **Evidence:** `frontend/src/features/cashier/components/CashierScreen.jsx:241-244` says cash payments can continue; `frontend/src/features/cashier/components/OrderPanel.jsx:117-120` says cash is available. `frontend/src/hooks/useOrders.js:94-98` still calls the API for both create and confirmation. The cart is memory-only in `frontend/src/hooks/useCart.js:21`.
- **Recommended remediation:** For the first production version, disable all checkout while offline and use truthful recovery messaging. Only claim offline sales after implementing a durable encrypted queue, conflict rules, idempotency, reconciliation, and operator visibility.
- **Acceptance criteria:** With the API unreachable, the UI never tells a cashier a sale can be completed; the current cart survives the documented recovery path.
- **Estimated size:** S for honest online-only behavior; XL for real offline sales
- **Dependencies:** Resolved: the current release is explicitly online-only.
- **Resolution:** The cashier now probes `/api/health` at startup, every five seconds, and after browser reconnect/focus. Cash and KHQR controls, including an open cash-confirmation dialog, remain disabled while the API is unreachable. `useOrders` independently rejects offline checkout and preserves the cart plus pending idempotency state. UI text now tells the cashier not to accept payment and to retry after reconnection. True offline order synchronization remains future scope.

#### P1-2. Active JWTs do not reflect user deactivation, deletion, or role changes

- **Status:** Resolved on 2026-07-30 with database-backed session versions and targeted socket invalidation; retained here as the original finding and acceptance record.
- **Severity:** P1
- **Category:** Authentication / session revocation
- **Business impact:** A deactivated owner, manager, or cashier can continue using an existing eight-hour token until expiry unless another device or assignment check happens to reject that session.
- **Evidence:** Protected requests verify JWT claims but do not consistently query the current user row for active/deleted/role state. Inactive status is checked during login, while P0-2 separately resolves cashier assignment changes.
- **Recommended remediation:** Add a session version or revocation timestamp and verify current active/deleted/role/owner state for protected requests and socket connections. Invalidate sessions on credential, role, active-state, and ownership changes.
- **Acceptance criteria:** Deactivation, deletion, or role change prevents the next API request and disconnects affected sockets without waiting for JWT expiry.
- **Estimated size:** L
- **Dependencies:** User schema migration; auth/session policy; cache strategy if query cost matters.
- **Resolution:** Added `users.session_version` and included it in newly issued JWTs. Protected HTTP and Socket.IO authentication now loads the current user and requires an active, non-deleted row with matching username, role, owner scope, and version. User edits and soft deletion atomically increment the version, emit `user:session_invalidated`, and disconnect that user's sockets. The frontend clears stale sessions while preserving cashier terminal registration. Live tests verify deactivation, reactivation, password change, role change, deletion, and `401 SESSION_INVALIDATED`.

#### P1-3. LocalStorage JWT makes an XSS compromise an eight-hour account compromise

- **Status:** Resolved on 2026-07-30 with short-lived in-memory access JWTs and
  rotating HttpOnly refresh sessions; retained here as the original finding and
  acceptance record.
- **Severity:** P1
- **Category:** Frontend security
- **Business impact:** Any successful same-origin script injection can read and exfiltrate owner, manager, or cashier JWTs and perform actions until expiry.
- **Evidence:** JWTs are read and written in `frontend/src/features/auth/authStorage.js:14-36` and attached in `frontend/src/services/apiClient.js:40`. The documented exception in `context/architecture.md:62` explicitly accepts this only for the final project.
- **Recommended remediation:** For production, use short-lived access tokens with refresh-token rotation in Secure, HttpOnly, SameSite cookies, plus a deliberate CSRF strategy. Until then, minimize token lifetime/privilege and enforce a strict CSP.
- **Acceptance criteria:** Refresh credentials are inaccessible to JavaScript, access tokens are short-lived, refresh reuse is detected, and CSRF/XSS tests cover the chosen design.
- **Estimated size:** L
- **Dependencies:** Auth API/schema changes; HTTPS; cookie/CORS/CSRF design.
- **Resolution:** Removed active JWT/user persistence from localStorage. Login
  now issues a short-lived access JWT plus an opaque eight-hour refresh token
  stored in a Secure, HttpOnly cookie. MySQL stores only SHA-256 token/CSRF
  hashes, family lineage, expiry, revocation, user session version, and optional
  cashier device binding. Refresh rotates both tokens once, detects reuse,
  requires double-submit CSRF proof, and revokes on logout or user/device
  invalidation. Axios restores sessions after reload, serializes concurrent
  refresh attempts, retries failed protected requests once, and keeps Socket.IO
  credentials current.

#### P1-4. Telegram kitchen dispatch durability - Resolved

- **Severity:** P1
- **Category:** Reliability / partial failure
- **Original impact:** Payment could commit successfully while the process exited before any durable Telegram work existed.
- **Resolution:** Cash and retained KHQR confirmation now create one unique `telegram_dispatch_jobs` row inside the payment transaction. A background worker claims due jobs with database row locks and `SKIP LOCKED`, retries transient failures with exponential backoff, records bounded terminal errors, and resumes queued work after restart.
- **Duplicate policy:** Concurrent workers cannot claim the same job. Existing sent/done tickets complete the job idempotently. If the process exits while Telegram's `sendMessage` outcome is unknown, the ticket/job becomes a visible manual-retry case instead of being automatically resent.
- **Verification:** Unit coverage validates retry backoff; the live Order flow verifies that successful cash confirmation creates the outbox row.
- **Estimated size:** L
- **Dependencies:** Migration; background worker; monitoring; Telegram idempotency policy.

#### P1-5. Production schema changes have no managed migration and rollback system - Resolved

- **Severity:** P1
- **Category:** Database operations
- **Business impact:** Deployments can encounter schema drift or partially applied changes, with no migration ledger or tested rollback. This can prevent startup or corrupt expectations between code and database.
- **Resolution:** TouB POS now uses ordered Umzug migrations under `backend/src/database/migrations/`, with successful migration names stored in MySQL `schema_migrations`. The immutable baseline creates a clean database or validates an existing current schema. Production startup performs a pending-migration check without changing schema; deployments run `npm run db:migrate`. Development startup and seed commands apply pending migrations without `sequelize.sync()`.
- **Rollback policy:** One-step rollback is explicitly gated by `ALLOW_MIGRATION_ROLLBACK=true`; the baseline refuses destructive rollback when core business rows exist. The backend README documents backup verification, deployment order, rollback, and restore preference.
- **Acceptance criteria:** A clean database and a copy of the current schema both migrate to the same version; migration state is recorded; failed migration and rollback/restore drills are documented and tested.
- **Estimated size:** L
- **Dependencies:** Database owner; backup/restore test; deployment pipeline.

#### P1-6. Known production dependency vulnerabilities remain - Resolved With Bounded Exceptions

- **Severity:** P1
- **Category:** Supply-chain security
- **Business impact:** Published vulnerabilities remain in production dependency trees. The disabled KHQR library brings an obsolete Axios version with high-severity advisories.
- **Resolution:** Removed `bakong-khqr` and its obsolete Axios tree; startup now rejects KHQR enablement until a new provider adapter is installed. Updated `body-parser` to 1.20.6, React Router DOM/Router to 7.18.2, PostCSS to 8.5.25, and DOMPurify to 3.4.12. After high-severity advisories newly surfaced by the registry audit on 2026-08-05 and failed both quality jobs, refreshed the already-compatible lockfile ranges to `socket.io-parser@4.2.7` in both applications and backend `ip-address@10.4.0`.
- **Residual scan:** Backend production audit reports two moderate entries for one Sequelize/UUID dependency chain and no high/critical findings. Frontend reports one high React Router advisory twice (direct wrapper and transitive package). The Router finding is non-applicable to TouB's client-only `BrowserRouter` SPA because no RSC, SSR, data-router action, loader, or server-action boundary exists.
- **Risk decisions:** `docs/security/dependency-risk-register.md` records owners, call-path evidence, rationale, controls, review deadlines, and exit conditions. npm's proposed Sequelize downgrade and Router downgrade/forced version mismatch were rejected as higher-risk changes.
- **Acceptance criteria:** Production audit has no unresolved high/critical findings; any accepted lower finding has owner, rationale, exposure analysis, and expiry date; regression tests pass.
- **Estimated size:** M
- **Dependencies:** Payment-provider decision; dependency compatibility testing.

#### P1-7. Database TLS disables certificate verification - Resolved

- **Severity:** P1
- **Category:** Infrastructure security
- **Business impact:** An attacker able to intercept database traffic could impersonate the database endpoint despite TLS being enabled.
- **Former evidence:** `backend/src/config/db.js` previously set `rejectUnauthorized: false`.
- **Resolution:** Added a shared database TLS resolver used by Sequelize and raw MySQL connections. Production requires exactly one provider CA source through `DB_SSL_CA_PATH` or `DB_SSL_CA`, enables `rejectUnauthorized: true`, and fails environment validation for missing, unreadable, ambiguous, or malformed CA configuration. The production migration command enforces the same contract.
- **Verification:** The team installed the Aiven provider CA and verified the production-mode connection plus fail-closed behavior. The provider CA remains outside version control.
- **Acceptance criteria:** Production connects with `rejectUnauthorized: true` and the configured CA; a wrong CA or hostname fails.
- **Estimated size:** S
- **Dependencies:** Hosting provider CA and TLS documentation.

#### P1-8. No CI quality or security gate exists - Resolved

- **Severity:** P1
- **Category:** Release engineering
- **Business impact:** Broken builds, lint regressions, failing tests, vulnerable dependencies, or migration mistakes can reach the deployment branch without automated rejection.
- **Former evidence:** `.github/workflows/` previously contained only scheduled backup/keep-alive jobs.
- **Resolution:** Added `.github/workflows/ci.yml` for pull requests and pushes to `main`/`development`. It uses locked installs, backend lint with a fixed warning ceiling, backend unit tests, frontend lint/build, expiring dependency-audit exceptions, policy self-tests, and a clean MySQL 8.4 migration job. The first pull-request run passed and `main` branch protection requires the checks and teammate review.
- **Acceptance criteria:** A PR cannot merge when any required quality job fails; branch protection requires the checks.
- **Estimated size:** M
- **Dependencies:** GitHub permissions; test database strategy; vulnerability exception policy.

#### P1-9. Highest-risk workflows lack automated end-to-end and failure-path coverage - Critical integration and browser journeys implemented and required in CI

- **Severity:** P1
- **Category:** Testing
- **Business impact:** Checkout retries, payment partial failures, tenant isolation, role boundaries, device reassignment, browser refresh, and kitchen delivery can regress undetected.
- **Progress:** CI now provisions disposable MySQL 8.4, applies migrations, seeds deterministic data, starts the API with external payment and Telegram workers disabled, and runs the existing auth-refresh, credential-policy, and order-flow live suites. These suites cover role and credential boundaries, refresh rotation/reuse, checkout totals and idempotency, cash confirmation, product/stall isolation, device reassignment, histories, and Telegram outbox creation.
- **Browser progress:** Playwright now covers management login, refresh-session restoration, role and logout guards, terminal registration, Cashier PIN login, stall-scoped product selection, backend cash checkout, paid receipt, and order-history visibility. CI runs Chromium against separate disposable MySQL/API/frontend instances with external KHQR and Telegram workers disabled, and the Browser E2E check is required on `main`.
- **Remaining work:** Forced database/provider timeout recovery, responsive browser journeys, and deeper management permission scenarios remain valuable follow-up coverage.
- **Acceptance criteria:** CI runs deterministic integration and E2E suites with forced timeout/retry/concurrency cases; failures demonstrate that money and scope invariants are asserted.
- **Estimated size:** XL
- **Dependencies:** Migration baseline; test fixtures; CI service containers; P0 API contracts.

#### P1-10. Cart and in-progress checkout cannot recover from refresh, crash, or JWT expiry

- **Severity:** P1
- **Category:** POS reliability
- **Business impact:** A busy cashier can lose the cart or be unsure whether a payment completed, leading to re-entry and duplicate-sale risk.
- **Original evidence:** Cart state started as memory-only state in
  `frontend/src/hooks/useCart.js`, while pending checkout recovery was limited
  to one browser tab through `sessionStorage`.
- **Recommended remediation:** Persist a versioned cart and pending checkout state locally, restore after authentication, reconcile pending order IDs against the backend, and expire stale carts safely.
- **Progress:** Implemented versioned 12-hour cart and pending-checkout recovery
  scoped by cashier and registered device. Restored cart items are reconciled
  against the current backend catalog, while trusted prices and payment status
  remain backend-owned. Known pending order IDs are fetched after session
  restoration; pending payments resume, paid responses recover the receipt,
  and interrupted creates retain their idempotency key. Device revocation
  clears terminal recovery records.
- **Verification:** Frontend lint and production build pass. The Browser E2E
  flow now covers cart restoration across refresh/logout and a dropped cash
  confirmation response followed by paid-order recovery on reload.
- **Acceptance criteria:** Refresh and forced logout during cart entry restore the cart; refresh after order creation resumes/reconciles the same order rather than creating another.
- **Estimated size:** M
- **Dependencies:** P0-1 idempotency and recovery contract.

#### P1-11. Production request validation lacks consistent limits and schemas

- **Severity:** P1
- **Status:** Resolved on 2026-07-31 with centralized mutation schemas and boundary tests; retained here as the original finding and acceptance record.
- **Category:** Input validation / availability
- **Business impact:** Extremely large quantities or values can produce unrealistic sales, overflow database fields, or trigger internal errors. Validation behavior varies by service.
- **Evidence:** `backend/src/services/orders/order-creation.service.js:151` checks only that quantity is a positive integer; no maximum exists. Product price parsing in `backend/src/services/product.service.js:11-18` checks positivity but not maximum, USD decimal precision, or a shared schema. Notes alone have a clear 500-character limit at `order-creation.service.js:50-61`.
- **Recommended remediation:** Add centralized request schemas with field presence, type, trim, length, precision, maximum quantity/value, unknown-field policy, and consistent 400 responses.
- **Acceptance criteria:** Boundary tests cover every mutation; malformed and oversized input always returns a clean 4xx without a database/provider error.
- **Resolution:** Added route-bound schemas for authentication, users, products, categories, stalls, staff/device/cook management, orders, cash confirmation, and bodyless commands. Schemas trim strings, enforce model lengths/types/enums, reject unknown fields, bound prices/cash/order quantities to storage-safe values, and return `400 VALIDATION_ERROR`. Order services retain defense-in-depth item-count, quantity, and aggregate-total limits. Database-free tests cover every application mutation schema; Telegram callbacks keep their dedicated provider-envelope validation.
- **Estimated size:** L
- **Dependencies:** Product limits; currency policy; API contract documentation.

#### P1-12. Authentication rate limiting is process-local and proxy handling is undefined

- **Severity:** P1
- **Status:** Implemented on 2026-07-31; final closure requires verifying `TRUST_PROXY_HOPS` through the selected production provider's real proxy path.
- **Category:** Authentication / deployment
- **Business impact:** Multiple instances allow attempts to bypass per-process limits. Behind a proxy, incorrect client IP handling can rate-limit all users together or fail to identify attackers correctly.
- **Evidence:** Rate limiters use the default in-memory store in `backend/src/middleware/rate-limit.middleware.js:8-23`. No `app.set('trust proxy', ...)` appears in `backend/src/app.js`.
- **Recommended remediation:** Configure the exact trusted proxy hop count and use a shared production rate-limit store. Add account-aware controls and monitoring without enabling username enumeration.
- **Acceptance criteria:** Tests through the real proxy show distinct client limits, multiple app instances share counters, and clean `429` responses remain stable.
- **Implementation:** Production now requires an exact `TRUST_PROXY_HOPS` value and a Redis-compatible `RATE_LIMIT_REDIS_URL`. Startup connects and pings the shared store before listening; store failures fail closed. Broad IP and hashed IP/account keys use isolated namespaces. Disposable CI starts MySQL plus Redis and verifies that separate Express instances share counters, distinct forwarded clients remain independent, and the API returns the stable `429 RATE_LIMITED` contract without recording usernames or PIN identities in Redis keys or logs.
- **Estimated size:** M
- **Dependencies:** Deployment topology; Redis or equivalent shared store.

#### P1-13. Tracked SQL dump contains operational and credential-shaped data

- **Severity:** P1
- **Category:** Privacy / repository hygiene
- **Status:** Current-tree and future-backup controls implemented on 2026-07-31. Final closure requires deleting historical plaintext Actions artifacts, rotating affected credentials/device registrations, rewriting shared Git history, and verifying from a fresh clone.
- **Business impact:** If any row is real, repository readers receive password/PIN hashes, user records, order history, audit data, Telegram routing identifiers, and historical KHQR payloads. Even demo dumps normalize unsafe backup handling.
- **Evidence:** `backups/toubpos_db_backup_2026-07-13_23-10-21.sql:57` contains audit rows; `:166` contains order/payment records and QR payloads. The dump also contains user and Telegram-related tables.
- **Recommended remediation:** Establish whether the dump is synthetic. If not provably synthetic, remove it from Git history, rotate affected credentials/identifiers, and document the incident. Store encrypted backups outside source control and ignore dump files.
- **Acceptance criteria:** Secret/history scanning finds no live data in current history; backup storage is encrypted and access-controlled; a documented synthetic fixture replaces any needed demo data.
- **Implementation:** Removed the unverified dump from the current tree, ignored generated dump/backup formats, and added a CI allowlist that permits SQL only in the canonical migration and course-document locations. Automated backups now create plaintext only in an operating-system temporary directory, encrypt the result with GPG AES-256 using a separate protected passphrase, retain only `.sql.gpg`, and upload the encrypted artifact for 14 days with read-only workflow permission. Regression tests verify the path policy and plaintext cleanup. `docs/security/database-backup-security.md` records the exposure classes, rotation decisions, old-artifact deletion, restore procedure, and administrator-only history rewrite. The current Git ancestry still contains the old object until that coordinated rewrite is completed.
- **Estimated size:** M, potentially L if history/credential rotation is required
- **Dependencies:** Data owner determination; repository visibility; secret rotation authority.

#### P1-14. Health check is not a readiness check and shutdown is not graceful

- **Severity:** P1
- **Category:** Operations / availability
- **Status:** Implemented on 2026-07-31; final closure requires the first disposable CI run to pass its real MySQL-loss and SIGTERM assertions, plus matching production host probe/termination settings.
- **Business impact:** A load balancer can send traffic to an instance whose database is unavailable. Deploy termination can interrupt requests or payment/order work.
- **Evidence:** `/api/health` always returns a static success response in `backend/src/app.js:60-62`. `backend/src/server.js:44-49` starts the HTTP server but registers no `SIGTERM`/`SIGINT` drain and database close sequence.
- **Recommended remediation:** Separate liveness from readiness; readiness should verify critical database connectivity with a tight timeout. Add graceful server/socket shutdown and stop accepting new work before closing DB connections.
- **Acceptance criteria:** Database loss makes readiness fail while liveness remains meaningful; termination drains in-flight requests within the configured grace period.
- **Implementation:** Added separate `/api/health/live` and `/api/health/ready` contracts while preserving `/api/health` as the dependency-aware compatibility endpoint used by the frontend and CI. Readiness stays closed during startup/drain, probes MySQL with a bounded timeout, returns sanitized `503` state on failure, and disables caching. SIGTERM/SIGINT now mark the process draining, reject new business requests, stop and await background workers, close Socket.IO and HTTP traffic, close the shared Redis limiter client, then close Sequelize within a validated grace period. Repeated signals share one shutdown promise and timeout forces remaining HTTP connections closed. Unit coverage exercises database failure/timeout, draining, cleanup ordering/idempotency/failure continuation, and forced timeout. Disposable integration CI now stops MySQL to require readiness `503` with liveness `200`, then requires a `shutdown_completed` event after SIGTERM.
- **Estimated size:** M
- **Dependencies:** Hosting health-check contract; deployment timeout.

### P2 - Important Improvements

#### P2-1. Global production errors can leak internals while server errors lose diagnostics

- **Severity:** P2
- **Category:** Error handling / observability
- **Business impact:** Raw ORM/provider messages may reveal internals to clients, while production operators lack a structured server-side error record.
- **Evidence:** `backend/src/middleware/error.middleware.js:6-16` returns `err.message` for all statuses and logs full errors only outside production.
- **Recommended remediation:** Return a generic message for unexpected 500s, preserve safe application errors, log structured internal details with correlation IDs, and redact sensitive fields.
- **Acceptance criteria:** Forced DB errors return a generic response and create a searchable redacted log with request correlation.
- **Implementation:** Added validated/client-propagated or server-generated request correlation IDs returned through `X-Request-ID` and error JSON. Unexpected server failures now return only `INTERNAL_SERVER_ERROR` with a generic message, while intentional application errors retain their stable public contract. Request completion and error diagnostics are one-line JSON events sharing the correlation ID; nested credentials, authorization/cookie/CSRF/session data, PINs, tokens, secrets, and sensitive values embedded in diagnostic strings are redacted. Database-free regression coverage forces a Sequelize-style failure and verifies the generic response, retained internal error classification, correlation, and redaction.
- **Estimated size:** M
- **Dependencies:** Logging/monitoring destination.

#### P2-2. Security headers deliberately disable CSP and API documentation is public

- **Severity:** P2
- **Category:** Web security
- **Business impact:** The strongest browser mitigation for the localStorage token risk is absent, and public Swagger increases reconnaissance surface.
- **Evidence:** `backend/src/app.js:19-22` sets `contentSecurityPolicy: false`; Swagger is mounted unconditionally at `:47`.
- **Recommended remediation:** Define a tested CSP for frontend assets and ImageKit, then gate or intentionally publish production API docs with a documented policy.
- **Acceptance criteria:** CSP report/enforce mode passes core flows without unsafe broad exceptions; production docs exposure is an explicit deployment choice.
- **Implementation:** Added an enforcing frontend-document CSP generated during Vite build from `VITE_API_BASE_URL`. Scripts remain self-only; connections are limited to self, the configured API/Socket.IO origin, and ImageKit's fixed upload endpoint, with development-only localhost allowances. Existing inline React/SweetAlert presentation requires style-only allowances, while historical owner-managed product URLs require HTTPS image loading. Express now applies an explicit deny-by-default API CSP. Swagger remains available by default in development, is absent by default in production, and production enablement fails closed unless separate Basic Auth credentials are configured; enabled Swagger receives an isolated documentation policy. Backend and frontend policy tests plus build-output verification cover the contract.
- **Estimated size:** M
- **Dependencies:** Asset/domain inventory; hosting headers.

#### P2-3. Audit trail covers payments but not administrative changes

**Implementation status (2026-07-31): Implemented locally.** A managed forward
migration expands `audit_logs` with Owner scope, target, and request correlation;
the fixed administrative event catalog covers catalog, identity, Stall, staff,
terminal, Cook, and Telegram-group mutations. Each business mutation and audit
insert shares a transaction, and bounded metadata sanitization excludes secrets
and raw protected identifiers. Access and minimum retention are documented in
`docs/security/audit-log-policy.md`; the pull request's disposable-MySQL
migration and live integration checks passed.

- **Severity:** P2
- **Category:** Auditability
- **Business impact:** Operators cannot reliably answer who changed a product price, reassigned a cashier, revoked a device, changed a kitchen group, or deleted a user/stall.
- **Evidence:** Runtime `AuditLog.create` calls are limited to order creation and cash/KHQR confirmation in `backend/src/services/orders/`; product, user, stall, device, and Telegram-management services do not write audit events.
- **Recommended remediation:** Define an audit event catalog and log security/financially relevant before/after summaries, actor, owner scope, target, timestamp, and request correlation. Restrict access and retention.
- **Acceptance criteria:** Every privileged mutation in the agreed catalog produces an immutable, tenant-scoped audit event without storing secrets.
- **Estimated size:** L
- **Dependencies:** Audit retention/access policy; migration/index review.

#### P2-4. Staff reassignment is a non-transactional destroy-then-create operation

**Implementation status (2026-07-31): Implemented locally.** Earlier stall-session
hardening had already made replacement transactional, added `UNIQUE(user_id)` to
the model/clean schema, and moved refresh-session revocation plus P2-3 auditing
into the same transaction. P2-4 now also locks the stable User row before reading
the optional assignment, serializing concurrent first assignments, reassignments,
and removals. A forward migration verifies enrolled databases, fails safely when
legacy duplicates exist, and adds the uniqueness index only when absent. All 66
backend unit tests and capped lint pass; disposable-MySQL rollback and
concurrency verification remains required before merge.

- **Severity:** P2
- **Category:** Concurrency / data integrity
- **Business impact:** A failure or race after removal can leave a cashier unassigned or produce a stale assignment result.
- **Evidence:** `backend/src/repositories/stall.repository.js:125-126` destroys existing assignments and then creates the new row without a transaction.
- **Recommended remediation:** Wrap reassignment and related device/session revocation in one transaction, lock the relevant user assignment, and enforce one active stall per cashier at the database level.
- **Acceptance criteria:** Concurrent assignments produce one deterministic final assignment; forced failure rolls back to the prior valid state.
- **Estimated size:** M
- **Dependencies:** Assignment invariant and unique constraint migration.

#### P2-5. Financial policy is inconsistent with documented scope

**Status (P2-5 implementation): Resolved for the current release.** Product
scope now explicitly applies no automatic service fee or tax. The frontend
shows only the item subtotal/final total, the backend remains the source of
trusted prices and totals, and regression tests protect the subtotal-only
display policy. Adding charges in a future release still requires approved
legal/accounting and product rules plus backend, schema, receipt, reporting,
and test changes.

- **Severity:** P2
- **Category:** Product completeness / finance
- **Business impact:** Receipts and reports may not match the intended pricing policy. Tax/fee obligations cannot be inferred safely.
- **Original evidence:** The project scope advertised fixed 3%/8% charges while the frontend used zero-value placeholders and backend order creation stored subtotal equal to total. P2-5 removed that contradiction and documented the implemented subtotal-only policy.
- **Recommended remediation:** Product/finance stakeholders must either remove these charges from the approved scope or define backend-owned rates, inclusivity, rounding, exemptions, display, snapshots, and reporting.
- **Acceptance criteria:** One approved policy is reflected consistently in backend calculations, receipt snapshots, reports, tests, and documentation.
- **Estimated size:** L if implemented; S if formally removed from scope
- **Dependencies:** Legal/accounting and product decisions.

#### P2-6. Currency and rounding rules are incomplete

**Status (P2-6 implementation): Resolved locally, pending CI/live migration verification.** Owners manage one audited business rate; product USD/KHR fields synchronize from that rate and Orders snapshot both totals plus the rate. Cash confirmation accepts independent or mixed USD/KHR tender, calculates both change equivalents on the backend using integer cents/riel, and receipts/reports use the saved settlement data.

- **Severity:** P2
- **Category:** Financial correctness
- **Original business impact:** USD and KHR item snapshots existed, but order totals and cash settlement were USD-centric and the KHR exchange-rate lifecycle was unresolved.
- **Original evidence:** Order items stored both currencies while Order settlement was USD-only and active frontend code used conflicting hardcoded rates without a sale-time snapshot.
- **Recommended remediation:** Define accepted tender currencies, conversion source, effective date, rounding denomination, order-level rate snapshot, and receipt/report behavior.
- **Acceptance criteria:** Boundary examples reconcile exactly across cart, backend, receipt, refund/void policy, and reports.
- **Estimated size:** L
- **Dependencies:** Product/accounting decision; schema migration.

#### P2-7. Backup process lacks encryption and demonstrated restore validation

**Implementation status (2026-07-31): Technical controls implemented locally.**
Backups are AES-256 encrypted, accompanied by a SHA-256 checksum, retained for
14 days, and uploaded before an automated isolated-MySQL restore drill verifies
core tables and current migration status. Closure still requires the first
successful scheduled/manual workflow run. The Owner/team approved a 24-hour
RPO and 4-hour RTO on 2026-07-31.

- **Severity:** P2
- **Category:** Disaster recovery
- **Business impact:** A backup can expose data, be incomplete, or prove unusable during an incident.
- **Original evidence:** `.github/workflows/db-backup.yml` uploaded raw `backups/*.sql` artifacts for 30 days. No checksum, encryption, restore job, RPO/RTO, or restore drill was defined.
- **Recommended remediation:** Use provider snapshots or encrypted object storage, documented retention, access control, checksums, and scheduled restore verification into an isolated database.
- **Acceptance criteria:** A timed restore drill reaches a verified application-ready database within approved RTO/RPO, with evidence recorded.
- **Estimated size:** M
- **Dependencies:** Hosting/storage platform; data retention policy.

#### P2-8. Frontend has no top-level error boundary

- **Severity:** P2
- **Category:** Reliability / UX
- **Business impact:** An unexpected render error can blank the active POS screen with no recovery instruction.
- **Original evidence:** Repository search found no React `ErrorBoundary`, `componentDidCatch`, or `getDerivedStateFromError` implementation under `frontend/src`.
- **Recommended remediation:** Add route-level/top-level boundaries with a safe retry/reload path and error reporting that excludes tokens and customer data.
- **Acceptance criteria:** A forced render exception shows a usable fallback, preserves recoverable checkout state, and reports a correlation identifier.
- **Estimated size:** S
- **Dependencies:** Logging/monitoring destination; cart recovery.
- **Implementation status:** Merged. `AppErrorBoundary` wraps the theme, auth, router, and lazy routes; its fallback offers retry/reload, preserves local recovery records, and shows a generated `ERR-...` reference. Structured browser diagnostics contain only the event name, correlation ID, sanitized pathname, and sanitized component names. Unit coverage verifies redaction and logger failure safety, while a development-only Playwright probe verifies the fallback, preserved cart/pending-checkout values, hidden raw error text, and retry recovery. Production ingestion/search for the structured browser event remains a deployment follow-up once the monitoring destination is selected.

#### P2-9. Frontend production bundle has a large owner portal chunk

- **Severity:** P2
- **Category:** Performance
- **Business impact:** Management screens load more slowly on mobile or weak networks, increasing time-to-interactive.
- **Original evidence:** `npm run build` warned that `OwnerPortalPage` was 575.34 kB minified (157.73 kB gzip), above Vite's 500 kB chunk warning.
- **Recommended remediation:** Profile first, then route/lazy-load heavy reports, PDF/export libraries, and chart modules. Preserve cashier startup priority.
- **Acceptance criteria:** No unexplained chunk warning; measured management route load improves on a throttled mobile profile with no functional regression.
- **Estimated size:** M
- **Dependencies:** Bundle analyzer and performance budget.
- **Implementation status:** Merged. Build-manifest analysis measured the merged P2-8 baseline Owner Portal entry at 578.77 kB (158.83 kB gzip). Dashboard, catalog, Stall, report, staff, and financial-settings tabs now load through separate React lazy boundaries with a shared loading state. The Owner Portal entry is 96.94 kB (26.88 kB gzip), an 83% minified reduction; the largest tab chunk is the Recharts-backed dashboard at 357.95 kB (104.29 kB gzip), and the production build has no chunk-size warning. A tested Vite plugin fails builds above a 150 KiB Owner Portal entry budget or 450 KiB tab budget. Authenticated tab navigation and a throttled deployment measurement remain deployment verification steps.

#### P2-10. Dependency installation is not clean

- **Severity:** P2
- **Category:** Maintainability
- **Business impact:** Local and CI environments may differ, obscuring dependency drift.
- **Original evidence:** Frontend `npm ls --depth=0` reported multiple extraneous WASM/runtime packages and `tslib`.
- **Recommended remediation:** Reproduce from a clean checkout with `npm ci`, determine why extraneous modules exist, and keep only lockfile-declared packages.
- **Acceptance criteria:** Clean `npm ci` followed by `npm ls --depth=0` exits without extraneous/missing dependencies.
- **Estimated size:** S
- **Dependencies:** None.
- **Implementation status:** Merged. A clean Windows install reproduced six orphaned packages from `@tailwindcss/oxide-wasm32-wasi`: npm skips the incompatible optional `wasm32` parent but hoists its bundled runtime chain, causing `npm ls` to label the files extraneous. npm 10.9.3 and 11.6.2 behaved identically, and Tailwind 4.3.1 retains the same package structure. TouB now declares the six already-locked versions as exact build-only development dependencies, documenting npm's installed layout without changing application imports or broadly upgrading dependencies. `npm run deps:check` executes `npm ls --depth=0` and is enforced immediately after `npm ci` by Frontend quality CI.

#### P2-11. Documentation contains stale production and payment claims

- **Severity:** P2
- **Category:** Documentation / operations
- **Business impact:** Teammates and reviewers may deploy or explain behavior using obsolete webhook, ngrok, device, and KHQR assumptions.
- **Evidence:** `docs/reports/TOUB_POS_Project_Report.md:842-846` calls the system production-ready and fully KHQR-integrated; `:182`, `:328`, `:339`, and `:388-410` describe webhook/ngrok behavior inconsistent with the current suspended polling design. `context/progress-tracker.md` also contains truncated/stale entries.
- **Recommended remediation:** Mark historical reports clearly, create one canonical production runbook, and align current architecture, payment status, credential/device model, commands, and known limitations.
- **Acceptance criteria:** A new teammate can set up and explain the current system using canonical docs without encountering contradictory active guidance.
- **Estimated size:** M
- **Dependencies:** Product/payment decisions.
- **Implementation status:** Implemented locally for review. Added
  `docs/setup/production-runbook.md` as the canonical deployment and operations
  guide, linked it from the active documentation entry points, and corrected
  local setup to use locked installs and managed migrations. The course project
  report is now explicitly historical and is no longer listed as authoritative
  guidance. Active authentication and database notes now describe short-lived
  access JWTs, rotating HttpOnly refresh sessions, suspended KHQR processing,
  and the absence of a Bakong payment webhook. The progress tracker distinguishes
  retained historical milestones from current behavior and records P2-10 as
  merged. Active-document relative links, repository policies, 71 backend unit
  tests, 16 frontend unit tests, both linters, the frontend dependency-tree
  check and production build, and `git diff --check` pass.

### P3 - Optional or Longer-Term Improvements

#### P3-1. Add stronger owner authentication

- **Severity:** P3
- **Category:** Security
- **Business impact:** MFA and step-up authentication reduce damage from stolen owner credentials.
- **Evidence:** Current Owner/Manager authentication uses username/password,
  a short-lived in-memory access JWT, and a rotating refresh session with an
  eight-hour default absolute lifetime.
- **Recommended remediation:** Add phishing-resistant MFA or TOTP and step-up checks for platform/owner destructive actions.
- **Acceptance criteria:** Sensitive owner actions require recent strong authentication and have recovery procedures.
- **Estimated size:** L
- **Dependencies:** Identity/recovery policy.

#### P3-2. Add distributed real-time and worker infrastructure before horizontal scaling

- **Severity:** P3
- **Category:** Scalability
- **Business impact:** Socket maps and background work are process-local, so multiple Node instances will not share connections or jobs.
- **Evidence:** In-memory socket maps are defined in `backend/src/services/websocket.service.js:5-8`; the KHQR checker is process-local and currently disabled.
- **Recommended remediation:** Add a Socket.IO adapter and durable queue only when scaling or provider work requires them.
- **Acceptance criteria:** Events and jobs operate exactly once/as designed across multiple instances.
- **Estimated size:** L
- **Dependencies:** Redis/queue platform; deployment topology.

#### P3-3. Add formal accessibility and performance budgets

- **Severity:** P3
- **Category:** UX / quality
- **Business impact:** Automated guardrails prevent regressions on touch terminals and mobile management screens.
- **Evidence:** Shared modals include good focus behavior, but no automated accessibility or performance checks exist.
- **Recommended remediation:** Add axe-based E2E checks, keyboard/touch test cases, Lighthouse budgets, and supported viewport/device definitions.
- **Acceptance criteria:** CI enforces agreed thresholds on critical routes.
- **Implementation baseline (2026-08-01):** Added a shared keyboard skip link,
  correctly scoped main landmarks, global visible focus treatment, login
  alert/PIN-status semantics, missing form/control names, and four source-policy
  regression tests. A live Chromium check verifies the landing-page keyboard
  and landmark behavior. This reduces confirmed accessibility defects but does
  not close P3-3 because axe-based critical-route CI, agreed thresholds,
  contrast/screen-reader/touch review, supported-device coverage, and Lighthouse
  budgets are not yet implemented.
- **Estimated size:** M
- **Dependencies:** E2E framework.

## 4. Likely Risks Requiring Validation

These are not asserted as defects until the responsible stakeholder confirms the requirement or deployment facts.

1. **No refund, paid-order void, or correction workflow.** The current order lifecycle emphasizes `pending_payment`, `paid`, and kitchen completion. A real merchant normally needs controlled mistake correction and accounting history. Confirm legal/accounting and business policy before designing it.
2. **No cash drawer session/reconciliation workflow.** Confirm whether shift opening float, expected cash, counted cash, variance, and supervisor close are required.
3. **No inventory deduction/adjustment workflow.** Product availability is catalog visibility, not stock control. Confirm whether production scope promises inventory.
4. **One owner per customer business is encoded by convention more than a first-class Business entity.** `owner_id` is the tenant anchor. Validate ownership transfer, owner deletion/recovery, and platform-admin support boundaries.
5. **ImageKit direct browser uploads may need stricter tenant/media lifecycle controls.** Validate account ACLs, upload expiry, transformations, quotas, orphan cleanup, and whether arbitrary external `image_url` values are acceptable.
6. **Telegram is a critical kitchen dependency.** Validate bot permissions, rate limits, group ownership, outage procedure, duplicate behavior, privacy expectations, and a paper/manual fallback.
7. **Date/time behavior needs deployed verification.** Reports have configurable timezone handling, but database/session timezone, host timezone, DST assumptions, export dates, and receipt times must be tested in the real environment.
8. **Platform-admin operational model is temporary.** Validate bootstrap, owner recovery, support access, credential rotation, and auditing before real customers exist.
9. **Capacity is unknown.** Product list behavior may be acceptable at current scale, but expected stalls, products, concurrent terminals, order volume, and report range limits are not documented.
10. **Compliance requirements are undefined.** Validate Cambodia tax invoice, receipt retention, privacy, employment data, payment data, breach response, and record-deletion obligations.

## 5. Missing or Unverifiable External Systems

The repository cannot prove the following:

- Production host, domain, HTTPS certificate, reverse proxy, WAF, network firewall, and trusted proxy hops.
- MySQL network restrictions, least-privilege account grants, encryption at rest, verified TLS CA, replication, failover, and capacity.
- Secret generation strength, secure secret store, access control, rotation schedule, and incident rotation procedure.
- Whether the tracked SQL dump is entirely synthetic and whether Git history has ever contained real `.env` values.
- GitHub branch protection, required reviewers, artifact access, dependency update process, and repository visibility.
- Monitoring, centralized logs, metrics, traces, alerts, paging ownership, uptime targets, and incident response.
- Backup success history, restore evidence, RPO/RTO, retention/legal policy, and geographic redundancy.
- Deployed frontend caching/CDN/source-map policy and asset availability.
- Telegram bot/group production configuration, webhook registration, operator ownership, and provider availability.
- ImageKit account security, data location, quotas, and deletion/retention.
- Approved merchant payment provider. KHQR is intentionally unavailable and must remain disabled until a supported contract exists.
- Load, soak, concurrency, low-bandwidth, browser compatibility, accessibility, penetration, and disaster-recovery test results.

## 6. Test and Automation Gaps

### Checks that exist

- Backend default unit suite: report range, KHQR suspension, Telegram callback authorization, Telegram group connection, and identifier safety.
- Backend opt-in live credential/order tests that require a running API and database.
- ESLint for both apps.
- Vite production build.

### Highest-priority missing tests

1. Checkout create/confirm idempotency under response loss and duplicate clicks.
2. Two simultaneous cash confirmations on one order.
3. Cashier reassignment while API and Socket.IO sessions remain connected.
4. User deactivation/deletion/role change with an active token.
5. Cross-owner and cross-stall access for every read and mutation route.
6. Crash after payment commit but before Telegram dispatch.
7. Telegram timeout, rate limit, duplicate send, and restart recovery.
8. Browser refresh/JWT expiry during cart, create, and payment confirmation.
9. Database migration from current schema and rollback/restore drill.
10. Owner/manager/cashier E2E journeys, keyboard/touch use, responsive layouts, and accessibility.
11. Report correctness for timezone boundaries, refunds/voids if introduced, currency, and large datasets.
12. Production configuration contract and readiness behavior.

The live tests were not run during this audit because they require a running backend/MySQL environment and create/update/delete records. That would not be a safe, non-destructive audit check against an unknown local database.

## 7. Deployment and Operational Checklist

### Release gate

- [x] Resolve P0-1 checkout idempotency with automated concurrent replay tests.
- [x] Resolve P0-2 cashier device/assignment stall consistency with automated regression tests.
- [ ] Approve the remaining production product scope, especially refunds/voids, cash reconciliation, and inventory. Current-release taxes/fees and dual-currency settlement now have explicit policies.
- [x] Remove applicable high/critical production dependency findings and formally record non-applicable scanner findings.
- [x] Establish clean, versioned database migrations and a tested baseline.
- [ ] Remove/rotate any potentially real data or credentials from Git history.
- [x] Build pull-request CI quality, dependency-security, and clean-migration checks.
- [x] Require the initial CI checks through GitHub branch protection/rulesets.

### Infrastructure

- [ ] Use HTTPS end to end and secure headers, including a tested CSP.
- [ ] Configure exact CORS origins and trusted proxy hops.
- [x] Use verified MySQL TLS with provider CA.
- [ ] Verify and document least-privilege production DB credentials.
- [ ] Store secrets in the hosting secret manager; rotate before launch.
- [x] Define liveness/readiness checks and graceful shutdown. Production host probe and termination settings still require verification.
- [ ] Decide single-instance versus multi-instance Socket.IO/worker architecture.
- [ ] Configure centralized redacted logs, metrics, alerts, and correlation IDs.

### Data and recovery

- [x] Encrypt backups outside source control.
- [x] Define RPO, RTO, retention, access, and deletion policy.
- [ ] Run and record a full restore drill.
- [ ] Test migration failure and rollback/restore.
- [x] Create deterministic synthetic demo/seed data.
- [ ] Define order correction, reconciliation, and audit procedures.

### Application

- [x] Validate every mutation with shared schemas and business limits.
- [x] Implement current-user/session invalidation.
- [x] Implement checkout idempotency and pending-payment recovery.
- [x] Make offline messaging truthful by enforcing online-only checkout.
- [x] Make Telegram dispatch durable and observable.
- [x] Add error boundaries and safe production error responses.
- [ ] Confirm KHQR flags remain disabled in all production environments.

### Verification

- [x] Run clean `npm ci` in both apps through required CI jobs.
- [x] Run backend lint with zero errors and an agreed warning policy.
- [x] Run backend unit, integration, and live tests on a disposable database.
- [x] Run frontend lint, unit tests, build, and required Browser E2E checks.
- [ ] Run dependency, secret, and license scans.
- [ ] Run concurrency, load, accessibility, browser, and low-network tests.
- [ ] Execute a complete production-like cash-to-kitchen-to-report scenario.
- [ ] Test provider/database/network outage and recovery playbooks.

## 8. Recommended Remediation Phases

### Phase A - Money and Scope Invariants

Fix checkout idempotency, pending checkout recovery, device/assignment consistency, transactional reassignment, quantity/value bounds, and concurrency tests.

### Phase B - Authentication and Security

Implement current-user/session invalidation, production token architecture, verified DB TLS, proxy-aware shared rate limiting, CSP, dependency remediation, and repository data cleanup.

### Phase C - Database and Reliability

Adopt managed migrations, operationalize Telegram outbox monitoring, add readiness/graceful shutdown, improve error handling, and define currency/tax/correction/reconciliation rules.

### Phase D - Automated Release Confidence

Create disposable integration environments, browser E2E tests, accessibility checks, CI quality gates, branch protection, and deployment smoke tests.

### Phase E - Operations and Launch

Deploy production observability, encrypted backups, restore drills, runbooks, incident ownership, capacity/load tests, compliance review, and a staged pilot.

## 9. First 10 Actions

1. **Completed:** Implement and test an idempotency contract for order creation and cash checkout.
2. **Completed:** Enforce that cashier assignment, device stall, JWT stall, product scope, and order scope are identical on every request/socket.
3. **Completed:** Adopt online-only checkout, remove the false offline-cash promise, preserve the cart during connection failure, and automatically re-enable payment after API recovery.
4. Establish a migration framework and baseline the current database.
5. Determine whether the tracked SQL dump is synthetic; purge/rotate if uncertain or real.
6. Remove the suspended KHQR runtime dependency or isolate it, then remediate remaining high dependency advisories.
7. **Completed:** Current-user revocation plus short-lived in-memory access JWTs,
   rotating HttpOnly refresh sessions, CSRF protection, and reuse detection are
   implemented and live/browser-tested.
8. **Completed:** Paid-order Telegram dispatch uses a transactional outbox, locked worker claims, bounded retry, restart recovery, and existing role-scoped manual retry visibility.
9. **Completed:** Add CI with clean installs, lint, tests, build, audit policy, and disposable MySQL integration tests.
10. Define and test production operations: verified DB TLS, readiness, graceful shutdown, logging/alerts, encrypted backups, and restore.

## 10. Commands and Results

| Command | Result |
|---|---|
| `git status --short` | Clean before audit document creation |
| `git branch --show-current` | `main` |
| `git rev-parse --short HEAD` | `26135e4` |
| `backend: npm run lint` | Passed with 0 errors and 70 warnings, mainly `no-console` plus repository `require-await` warnings |
| `backend: npm test` | Passed: 14 tests, 0 failures |
| `frontend: npm run lint` | Passed |
| `frontend: npm run build` | Passed; Vite warned about the 575.34 kB `OwnerPortalPage` chunk |
| `backend: npm audit --omit=dev --json` | Failed as a gate: 5 production vulnerabilities (2 high, 2 moderate, 1 low) |
| `frontend: npm audit --omit=dev --json` | Failed as a gate: 4 production vulnerabilities (2 high, 1 moderate, 1 low) |
| `backend: npm ls --depth=0` | Passed; declared top-level dependency tree resolved |
| `frontend: npm ls --depth=0` | Reported extraneous WASM/runtime packages and `tslib` |
| Type check | Not available; project is JavaScript and neither package defines a type-check script |
| Frontend automated tests | Not available; no frontend test script/suite is defined |
| Backend live API tests | Not run; they require live MySQL/API and mutate data |
| `backend: npm run migrate:single-stall-assignment` | Passed; enforced one stall assignment per cashier while retaining the stall foreign-key index |
| `backend: npm run test:orders` after P0 remediation | Passed: trusted totals, idempotency, cash rules, history, stale-session rejection, and new-stall scope |
| `backend: npm test` after P0 remediation | Passed: 16 tests, 0 failures |
| Frontend lint/build after P0 remediation | Passed; the existing 575.34 kB owner-portal chunk warning remains |
| Frontend lint/build after P1-1 remediation | Passed; backend availability checks and online-only payment guards compile cleanly |
| `backend: npm run migrate:user-session-version` | Passed; added the user session-version column |
| `backend: npm run test:credentials` after P1-2 remediation | Passed: deactivation, reactivation, credential/role changes, deletion, and stale JWT rejection |
| `backend: npm run migrate:refresh-sessions` | Passed twice; migration is repeatable |
| `backend: npm run test:auth-refresh` after P1-3 remediation | Passed: HttpOnly cookie issuance, CSRF rejection, rotation, reuse-family revocation, and logout |
| `backend: npm run test:credentials` after P1-3 remediation | Passed with layered account/IP rate limits and refresh-session revocation |
| `backend: npm run test:orders` after P1-3 remediation | Passed; checkout, totals, RBAC, and idempotency were unchanged |
| Browser auth verification after P1-3 remediation | Passed: no JWT/user in localStorage, protected reload restored through refresh cookie, and logout cleared cookies |
| `backend: npm run migrate:telegram-outbox` | Passed twice; durable outbox migration is repeatable |
| `backend: npm test` after P1-4 remediation | Passed: 17 tests, including Telegram retry-backoff coverage |
| `backend: npm run test:orders` after P1-4 remediation | Passed; cash confirmation transactionally creates the Telegram dispatch job |
| Frontend lint/build after P1-4 remediation | Passed; no frontend behavior changed and the existing 575.79 kB owner-portal chunk warning remains |
| `backend: npm run db:migrate` after P1-5 remediation | Passed on the configured current schema and applied zero changes on repeat |
| P1-5 clean-schema migration drill | Passed on a disposable database: two ordered migrations applied and `schema_migrations` reported zero pending |
| P1-5 rollback/forward drill | Passed on an empty disposable database: rollback was blocked without the explicit safety flag, both migrations reverted with the flag, and both reapplied successfully |
| P1-5 backup/restore drill | Passed: an empty migrated schema was exported with `mysqldump`, restored into a second disposable database, and retained both ledger entries with zero pending migrations |
| Backend dependency remediation after P1-6 | `bakong-khqr`/Axios removed; `body-parser` patched; production audit now reports 0 high, 0 critical, and one accepted moderate Sequelize/UUID chain (shown as two entries) |
| Frontend dependency remediation after P1-6 | Router 7.18.2, PostCSS 8.5.25, and DOMPurify 3.4.12 installed; only the documented non-applicable RSC-action Router advisory remains |
| Backend verification after P1-6 | Lint passed with 0 errors and 65 existing warnings; 19 unit tests passed |
| Frontend verification after P1-6 | Lint and production build passed; existing 575.79 kB Owner Portal chunk warning remains |
| P1-7 provider TLS verification | Passed by the team with the Aiven CA; production connection succeeds and fail-closed behavior is verified |
| P1-8 audit-policy self-tests | Passed: 5 tests cover the accepted Router finding, new findings, unrelated Router findings, expiry, and registry errors |
| Backend verification after P1-8 | Lint passed at the 65-warning ceiling; all 25 unit tests passed |
| Frontend verification after P1-8 | Lint and production build passed; existing 575.79 kB Owner Portal chunk warning remains |
| P1-8 GitHub enforcement | First pull-request workflow passed all four checks; teammate review and required checks are enforced on `main` |
| P1-9 backend integration CI | First run caught missing `products.is_active`/`products.is_deleted`; migration `202607310003` fixed the drift, the rerun passed, and the check is required on `main` |
| P1-9 browser E2E | Playwright critical journeys and isolated CI job are implemented; Browser E2E passes and is a required `main` branch check |
| Frontend verification after P2-9 | 16 unit tests and lint passed; production build passed without a chunk warning. Owner Portal entry fell from 578.77 kB to 96.94 kB and build-time budgets cover the entry and lazy tab chunks |
| Frontend clean install after P2-10 | Passed: fresh `npm ci` installed 257 packages and `npm run deps:check` exited successfully with no extraneous, missing, or invalid dependencies; the audit policy reports no unapproved high/critical production findings |
| Documentation alignment after P2-11 | Passed: relative links across 28 active Markdown files, repository audit/data policy tests, repository data scan, 71 backend unit tests, backend lint at 61 pre-existing warnings, 16 frontend unit tests, clean dependency tree, frontend lint/build, and `git diff --check` |

The P1-8 live npm audit request could not be run in this local environment
because external dependency metadata egress was not approved. GitHub CI will run
the policy against npm's advisory service after push. The policy parser itself
was verified locally with deterministic fixtures.

## 11. Areas Inspected

- Root context, standards, progress, README, reports, design, API, database, and deployment documentation.
- Backend configuration, startup, routes, middleware, controllers, services, repositories, models, utilities, startup jobs, scripts, tests, and dependency manifests.
- Frontend app/auth structure, shared UI, cashier, catalog, stalls, staff, reports, hooks, API/socket clients, local storage use, styles, build configuration, and dependencies.
- SQL schema/queries/ERD, tracked backup, GitHub workflows, environment example files, and Git ignore rules.
- Auth/RBAC, tenant and stall scoping, devices, orders, cash payment, KHQR suspension, Socket.IO, Telegram kitchen flow, reporting, ImageKit, audit logs, and backup behavior.

## 12. Questions Requiring Stakeholder Input

### Product and finance

- Current-release checkout is approved as online-only; true offline order synchronization remains future scope.
- What are the approved refund, void, correction, and cash reconciliation workflows?
- Current release: no automatic service fee or tax. Reopen legal calculation, rounding, display, snapshot, and reporting requirements before introducing either charge.
- Current release: cash may be tendered independently or together in USD/KHR; the Owner-managed business rate is snapshotted on each new Order and historical records never use a later rate.
- Is inventory management promised or explicitly out of scope?

### Backend and data

- Is there an existing production database that must be baselined?
- Is the tracked SQL dump guaranteed synthetic?
- What scale is expected for owners, stalls, products, terminals, daily orders, and report retention?
- What is the ownership transfer/recovery model for the one-owner tenant design?

### Payment provider

- Which approved merchant provider, status contract, limits, reconciliation process, and support agreement will replace suspended KHQR polling?

### Infrastructure and security

- Where will frontend, API, MySQL, Redis/queue, images, logs, and backups run?
- What reverse proxy/CDN topology and trusted proxy count will be used?
- Who owns secrets, rotations, alerts, incidents, restores, and releases?
- What uptime, RPO, RTO, retention, and breach-response targets apply?

### Compliance and operations

- What receipt/tax/privacy/employee-data requirements apply in Cambodia?
- What is the fallback when internet, Telegram, database, or image hosting is unavailable?
- Who can inspect administrative audit events and how long are they retained?

## 13. Final Recommendation

**No-Go for production at this repository state.**

The original P0 acceptance tests are now closed. Proceed with the P1 security, migrations, recovery, dependency, CI, and operational controls, then re-audit in a production-like environment. Keep KHQR disabled until an approved provider and reconciliation model exist. A controlled final-project demo can continue on a separate readiness track, but it should not be described as a real production deployment.
