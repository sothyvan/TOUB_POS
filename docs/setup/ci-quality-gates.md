# CI Quality And Security Gates

TouB POS runs `.github/workflows/ci.yml` for pull requests and pushes to
`main` and `development`. The workflow uses Node.js 22 and locked dependency
installation through `npm ci`.

## Required Checks

| Check | What it blocks |
| --- | --- |
| `CI policy` | Broken dependency-audit exceptions, tracked database dumps, unapproved SQL paths, or unsafe backup regressions |
| `Backend quality` | Backend lint errors, warning-count increases, unit-test failures, and unapproved high/critical production dependency findings |
| `Frontend quality` | Extraneous/missing frontend dependencies, frontend lint/test/build failures, and unapproved high/critical production dependency findings |
| `Clean database migration` | Migrations that cannot build a clean MySQL 8.4 database or leave migration status inconsistent |
| `Backend integration` | Failures in live authentication, credential-policy, role/stall isolation, checkout, idempotency, payment, order history, dependency-aware readiness, or graceful shutdown |
| `Browser E2E` | Regressions in management authentication/session restoration, terminal registration, Cashier PIN login, cash checkout, receipts, and browser route guards |

The backend currently has 64 known lint warnings. CI uses
`--max-warnings 64`, so existing warnings remain visible and any increase fails
the check. Reducing the warning baseline is encouraged.

## Dependency Audit Policy

`scripts/ci/check-npm-audit.mjs` runs `npm audit --omit=dev --json`. It blocks
all high and critical production findings unless the exact package, severity,
advisory description, and review date match
`scripts/ci/npm-audit-policy.json`.

The only current high-severity exception is the React Router RSC Action CSRF
finding documented in `docs/security/dependency-risk-register.md`. TouB POS is
a client-only Vite SPA and does not expose that server-action boundary. The CI
exception expires on 2026-08-31; expiry deliberately fails CI until the team
upgrades or reviews the decision.

Backend moderate Sequelize/UUID findings remain documented and visible but do
not block the high-severity CI gate.

## GitHub Branch Protection

The workflow cannot protect a branch by itself. A repository administrator must
open **Settings > Branches > Branch protection rules** (or Rulesets), protect
`main`, require a pull request, and require these status checks:

- `CI policy`
- `Backend quality`
- `Frontend quality`
- `Clean database migration`
- `Backend integration`
- `Browser E2E`

Apply the same rule to `development` if direct pushes should also be blocked.
Do not allow required checks to be skipped for normal team merges.

## Local Equivalent

Run these before opening a pull request:

```bash
cd backend
npm ci
npm run lint -- --max-warnings 64
npm test

cd ../frontend
npm ci
npm run deps:check
npm test
npm run lint
npm run build

cd ..
node --test scripts/ci/check-npm-audit.test.mjs
```

The live dependency audit requires access to the npm advisory service:

```bash
node scripts/ci/check-npm-audit.mjs backend
node scripts/ci/check-npm-audit.mjs frontend
```

The clean-migration job uses an isolated MySQL service in GitHub Actions and
never connects to Aiven or uses production credentials.

The backend-integration job also uses isolated MySQL 8.4 and Redis services. It applies
the migrations, loads deterministic demo fixtures, starts the API with
KHQR/background payment checks and Telegram dispatch disabled, and runs
`npm run test:live`. It then stops MySQL and requires readiness to return `503`
while liveness remains `200`, sends SIGTERM, and requires the process to log a
completed graceful shutdown. A redacted backend log is retained for seven days
only when the job fails.

The live suite is intentionally not part of the local-equivalent commands
above because it mutates its configured database. To run it locally, use a
disposable MySQL database, start the backend against that database, and then
run:

```bash
cd backend
npm run test:live
```

The browser suite uses Playwright Chromium and a separate disposable database
in CI. It starts the Vite frontend against the isolated API and keeps KHQR and
Telegram delivery disabled. Failed runs retain screenshots, traces, videos,
the HTML report, and the backend log for seven days.

Local browser execution must also target a disposable seeded database. With
that backend already running on port 3000:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```
