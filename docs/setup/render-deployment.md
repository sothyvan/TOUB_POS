# Deploy TouB POS On Render

This guide turns the repository's production controls into a first Render
deployment. It supplements the canonical [Production Runbook](production-runbook.md)
and does not change the audit's No-Go decision until the remaining operational
and product-policy gates are closed.

## 1. Deployment Shape

The root [`render.yaml`](../../render.yaml) creates:

- `toub-pos-web`: a global static site for the Vite frontend;
- `toub-pos-api`: one Starter Node web service for Express, Socket.IO, and the
  database-backed Telegram dispatch worker; and
- `toub-pos-rate-limit`: one private Starter Render Key Value instance for
  production authentication rate limits.

The API and Key Value service use the Singapore region. MySQL remains on Aiven
and must use the verified provider CA. Keep the API at one instance: the
current Socket.IO connection map is process-local, while the Telegram outbox is
already durable in MySQL and safely resumes after a restart.

Do not use a Free API instance for a live POS. Free services can sleep when
idle, which can delay checkout and interrupt live connections.

## 2. Before Creating The Blueprint

1. Merge only a commit that passed all required GitHub checks.
2. Confirm the Aiven database is the intended deployment database and take an
   encrypted, verified backup.
3. Have the Aiven host, port, database name, least-privilege user, password, and
   complete provider CA ready in a password manager.
4. Have the Telegram and ImageKit values ready if those integrations are part
   of the deployment.
5. Never paste a secret into Git, a pull request, a screenshot, or a Vite
   variable. Every `VITE_*` value is public in the browser bundle.

## 3. Create The Render Blueprint

1. Create or sign in to Render and connect the GitHub repository.
2. Choose **New > Blueprint**, select this repository, and use `render.yaml`.
3. Review the three proposed services before applying the Blueprint.
4. Enter every value marked `sync: false` in the Render dashboard. Use the
   following rules:

| Variable | Required value |
| --- | --- |
| `FRONTEND_ORIGIN` | Exact deployed frontend origin, with HTTPS and no path or trailing slash. |
| `VITE_API_BASE_URL` | Exact public API URL ending in `/api`. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Aiven connection values for the intended database. |
| `DB_SSL_CA` | Complete Aiven CA PEM supplied as a secret value. Do not commit a certificate file. |
| `TRUST_PROXY_HOPS` | Start with the reviewed Render proxy value and verify it using request logs before go-live; never use a permissive boolean. |
| Telegram variables | Backend-only bot token and webhook secret. |
| ImageKit variables | Existing account values; the private key remains backend-only. |

Render generates `JWT_SECRET`. Do not replace it casually: changing it signs
out active sessions. `RATE_LIMIT_REDIS_URL` is filled automatically from the
private Key Value connection string.

The first Blueprint creation has a URL dependency: the API needs the frontend
origin, while the frontend build needs the API URL. Use the planned Render
service URLs initially. After Render creates both services, copy their exact
HTTPS URLs into `FRONTEND_ORIGIN` and `VITE_API_BASE_URL`, then manually redeploy
the API and rebuild the static site. A custom domain can replace these values
later through the same two-variable update.

Because the initial frontend and API are separate Render sites,
`AUTH_COOKIE_SAME_SITE=none` is intentional and production HTTPS keeps the
refresh cookie Secure and HttpOnly.

## 4. Deployment Behavior

Render performs these steps for the API:

1. `npm ci`
2. `npm run db:migrate` as the pre-deploy command
3. `npm start`
4. repeated readiness checks against `/api/health/ready`

Production startup verifies the migration ledger again and refuses to start if
the database is unavailable, TLS verification fails, Redis is unavailable, or
migrations are pending. Render allows 20 seconds after SIGTERM; TouB begins
draining immediately and has a 15-second internal shutdown budget.

The static site runs a locked install, dependency-tree check, and production
build. Its rewrite rule sends client-side routes such as `/login` and
`/owner-portal` to `index.html` without changing `/api`, because the API uses a
separate hostname.

## 5. First Smoke Test

Do not seed the production database. Use approved synthetic accounts and data.

1. Open `/api/health/live` and `/api/health/ready`; both should return `200`.
2. Confirm API logs show structured JSON and no secret values.
3. Load the frontend and check the browser console for CSP or CORS failures.
4. Sign in as Owner, refresh the page, and sign out.
5. Register a disposable terminal and complete one synthetic Cash checkout.
6. Confirm the paid Order reaches the correct Telegram group and appears in
   the report.
7. Verify response and log `request_id` values match for one forced safe error.
8. Confirm KHQR is absent from the UI and rejected by the API.
9. Revoke the disposable terminal and remove the synthetic operational data
   using the approved cleanup procedure.

## 6. Monitoring And Limits

Render collects the API's standard output, including TouB's structured request,
error, lifecycle, and worker events. Configure Render notifications for failed
deploys and unhealthy service events, then review logs by `request_id`, event,
status, and error classification.

This first deployment does not complete observability by itself. Frontend
render events still need an approved ingestion destination, and production
alerts still need an owner, response channel, thresholds, and a tested incident
procedure. Do not horizontally scale the API until Socket.IO uses shared
coordination and multi-instance behavior has been tested.

## 7. Rollback

Use Render's previous compatible application deploy for code rollback. Do not
automatically reverse a database migration. Follow the Production Runbook:
verify an encrypted backup, review the migration's `down` behavior, and prefer
an isolated restore when data compatibility is uncertain. After rollback,
rerun readiness and the complete cash-to-kitchen-to-report smoke test.
