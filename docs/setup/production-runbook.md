# TouB POS Production Runbook

This is the canonical deployment and operations guide for the current TouB POS
release. Application code remains the final source of truth. The controls below
make the software safer to deploy, but they do not by themselves approve a real
merchant launch; complete the open release gates in
[`PRODUCTION_READINESS_AUDIT.md`](../../PRODUCTION_READINESS_AUDIT.md).

## 1. Current Release Boundaries

- Cash is the only enabled checkout method.
- Keep `KHQR_ENABLED=false` and `VITE_KHQR_ENABLED=false`. The removed legacy
  provider adapter cannot be restored by changing environment flags.
- Checkout requires a working API and database. There is no offline sale queue.
- The current release has no refund/paid-order void, cash-drawer
  reconciliation, or inventory deduction workflow.
- `platform_admin` is an API-only bootstrap role. Owner and Manager use the
  management portal; Cashiers use PIN login on an active registered terminal.
- The current worker and Socket.IO connection maps assume a reviewed
  single-instance deployment. Horizontal scaling requires additional shared
  real-time coordination.

## 2. Required Services And Release Inputs

- Node.js 22.13 or newer and locked `npm ci` installs.
- A built frontend served over HTTPS.
- One backend service reachable only through the reviewed HTTPS proxy path.
- MySQL 8 with a least-privilege application account and a trusted provider CA.
- Redis or Valkey for shared production authentication rate limits.
- ImageKit credentials if product uploads are enabled.
- A Telegram bot, webhook secret, connected kitchen groups, and authorized
  Cooks if kitchen dispatch is part of the release.
- A protected secret manager. Never put production values in Git, build logs,
  screenshots, or frontend variables unless they are explicitly public.

Before release, confirm the pull request has passed every required check listed
in [CI Quality And Security Gates](ci-quality-gates.md).

The approved first-host implementation is documented in
[Deploy TouB POS On Render](render-deployment.md). The provider guide supplies
concrete Blueprint settings; this runbook remains authoritative for security,
release, smoke-test, rollback, and go-live decisions.

## 3. Production Configuration

Start from `backend/.env.example` and `frontend/.env.example`, but provide real
values through the hosting secret/configuration system. Important rules are:

| Area | Production rule |
| --- | --- |
| Runtime | Set `NODE_ENV=production`. |
| Database | Configure host, port, database, user, password as needed, and exactly one of `DB_SSL_CA_PATH` or `DB_SSL_CA`. Certificate and hostname verification fail closed. |
| Authentication | Generate a strong `JWT_SECRET`; set the approved access/refresh lifetimes. Production refresh cookies are Secure and HttpOnly. |
| Browser origin | Set `FRONTEND_ORIGIN` to the exact deployed frontend origin. Build the frontend with the real HTTPS `VITE_API_BASE_URL`, or `/api` for same-origin hosting. |
| Proxy | Set `TRUST_PROXY_HOPS` to the exact verified hop count. Do not guess or trust every proxy. |
| Rate limits | Set a TLS Redis/Valkey URL where available and an environment-specific `RATE_LIMIT_REDIS_PREFIX`. Production startup requires the shared store. |
| API docs | Leave `API_DOCS_ENABLED=false` unless required. If enabled, use separate documentation credentials; the password must be at least 16 characters. |
| Payments | Keep both KHQR flags `false`. Do not configure historical Bakong values as if they activate payments. |
| Telegram | Store the bot token and webhook secret only on the backend. Review worker retry/timeout settings and group ownership. |
| Operations | Set the report timezone, readiness timeout, and shutdown grace period for the selected host. |

If frontend and API are on different sites, review the refresh-cookie
`SameSite` setting and HTTPS behavior in the deployed browser. Do not weaken
CORS or CSP to work around a hostname mismatch.

## 4. Database And Deployment Order

Use a maintenance window whenever a migration can conflict with application
writes.

1. Create an encrypted backup and verify its checksum and restore procedure.
2. Confirm the production environment points to the intended database.
3. Install locked backend dependencies and inspect migration status:

   ```bash
   cd backend
   npm ci
   npm run db:migrate:status
   ```

4. Apply reviewed migrations before starting the new API:

   ```bash
   npm run db:migrate
   npm run db:migrate:status
   ```

5. Start the backend with `npm start`. Production startup checks the migration
   ledger and refuses to modify or start against an outdated schema.
6. Build and deploy the frontend with its final API URL:

   ```bash
   cd frontend
   npm ci
   npm run deps:check
   npm run build
   ```

Do not run demo seed commands against a live merchant database. Do not use
`docs/database/schema.sql` in place of managed migrations.

## 5. Health Probes And Graceful Shutdown

Configure the host as follows:

| Probe | Endpoint | Meaning |
| --- | --- | --- |
| Liveness | `GET /api/health/live` | The Node process is alive. It does not prove MySQL is usable. |
| Readiness | `GET /api/health/ready` | The application is ready and MySQL responds within the configured timeout. |
| Compatibility | `GET /api/health` | Dependency-aware readiness used by the current frontend and CI. |

Remove an instance from traffic when readiness returns `503`. Allow at least
`SHUTDOWN_GRACE_PERIOD_MS` plus a small platform margin after SIGTERM so the API
can drain requests, stop workers, close Socket.IO and Redis, and close MySQL.

## 6. Release Smoke Test

Run this against production-like synthetic data before real use:

1. Confirm liveness and readiness return successful, sanitized responses.
2. Log in as Owner/Manager, reload the page, and confirm refresh-session
   restoration and logout.
3. Register a terminal, log in as an assigned Cashier with PIN, and confirm a
   reassigned or revoked terminal cannot keep using its old session.
4. Create a cash order, confirm mixed or single-currency tender, and check the
   USD/KHR totals, change, receipt, history, and report.
5. Confirm a paid order creates a durable Telegram dispatch job and reaches the
   correct Stall group; verify only an authorized Cook can mark it done.
6. Confirm an unknown route and an unexpected server error return safe error
   bodies with `X-Request-ID`, without stack traces or provider/database text.
7. Confirm KHQR is absent from the Cashier UI and a direct KHQR API attempt is
   rejected safely.

## 7. Monitoring And Incident Checks

- Collect the backend's one-line JSON logs in a restricted centralized system.
  Search by `request_id`, event, status, route, actor, and error classification.
- Never log passwords, PINs, JWTs, cookies, authorization/CSRF headers, refresh
  tokens, device tokens, provider tokens, private keys, or raw secrets.
- Alert on readiness failures, repeated `5xx`/`429` responses, Redis or MySQL
  connection failures, graceful-shutdown failures, and Telegram jobs reaching
  terminal failure.
- Owners and Managers can inspect the tenant-scoped Kitchen delivery health
  panel. It polls `GET /api/operations/telegram` every 30 seconds and refreshes
  after management socket events. The API exposes safe failure categories and
  bounded order references; it never exposes raw provider errors, worker lock
  identities, Telegram chat IDs, or tokens.
- Configure `TELEGRAM_MONITOR_PENDING_STALE_MS` and
  `TELEGRAM_MONITOR_PROCESSING_STALE_MS` for the expected dispatch cadence, and
  `TELEGRAM_MONITOR_LATENCY_WINDOW_HOURS` for the dashboard window. Defaults are
  60 seconds, 60 seconds, and 24 hours. The in-product panel is operational
  visibility, not a replacement for externally routed production alerts.
- Keep the documented 24-hour recovery-point objective (RPO) and four-hour
  recovery-time objective (RTO), and retain evidence from scheduled restore
  drills.
- Maintain a manual kitchen fallback for Telegram outages and tell Cashiers not
  to accept payment while the API is unreachable.

## 8. Rollback And Recovery

Prefer deploying the previous compatible application artifact. Revert a
database migration only after reviewing its `down` behavior and verifying a
backup; the command deliberately requires `ALLOW_MIGRATION_ROLLBACK=true` for
that one operation. If a migration changed business data or compatibility is
uncertain, restore the verified encrypted backup into an isolated database,
validate it, and follow the approved recovery procedure instead of improvising
against production.

After any rollback or restore, rerun readiness plus the complete cash-to-
kitchen-to-report smoke test and record the incident, decision, and evidence.

## 9. Go-Live Decision

The repository cannot verify hosting, certificates, proxy topology, secret
storage, database grants, monitoring ownership, Telegram/provider accounts, or
legal/accounting requirements. A responsible owner must close or formally
accept those items in the production-readiness audit before calling the system
production-ready.
