# CI Quality And Security Gates

TouB POS runs `.github/workflows/ci.yml` for pull requests and pushes to
`main` and `development`. The workflow uses Node.js 22 and locked dependency
installation through `npm ci`.

## Required Checks

| Check | What it blocks |
| --- | --- |
| `CI policy` | Broken or overly broad dependency-audit exception logic |
| `Backend quality` | Backend lint errors, warning-count increases, unit-test failures, and unapproved high/critical production dependency findings |
| `Frontend quality` | Frontend lint/build failures and unapproved high/critical production dependency findings |
| `Clean database migration` | Migrations that cannot build a clean MySQL 8.4 database or leave migration status inconsistent |

The backend currently has 65 known lint warnings. CI uses
`--max-warnings 65`, so existing warnings remain visible and any increase fails
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

Apply the same rule to `development` if direct pushes should also be blocked.
Do not allow required checks to be skipped for normal team merges.

## Local Equivalent

Run these before opening a pull request:

```bash
cd backend
npm ci
npm run lint -- --max-warnings 65
npm test

cd ../frontend
npm ci
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
