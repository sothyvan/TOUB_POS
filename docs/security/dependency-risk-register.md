# Dependency Risk Register

Last reviewed: 2026-07-31

This register covers production dependency advisories that cannot currently be
removed safely. Pull-request CI runs `npm audit --omit=dev` through
`scripts/ci/check-npm-audit.mjs`; only narrow, expiring exceptions in
`scripts/ci/npm-audit-policy.json` may bypass the high/critical gate.

## Accepted Finding: Sequelize / UUID

| Field | Decision |
| --- | --- |
| Advisory | `uuid` buffer-bounds issue in UUID v3/v5/v6 |
| Scanner severity | Moderate; reported once for `uuid` and once for dependent `sequelize` |
| Owner | Backend team |
| Exposure | TouB POS models use integer primary keys. Application code uses Node `crypto.randomUUID()`. Sequelize 6 calls dependency UUID v1/v4 without a caller-provided output buffer; the vulnerable v3/v5/v6 buffer path is not used. |
| Why not force-fix | npm proposes downgrading Sequelize 6 to Sequelize 3, which is incompatible and would introduce larger ORM and security risk. |
| Controls | Keep request data away from ORM UUID-generation internals; retain MySQL integer identifiers; rerun audit on every dependency change. |
| Expiry/review | Review by 2026-10-31 or immediately when Sequelize publishes a compatible UUID fix. |
| Exit condition | Upgrade to a supported Sequelize release whose UUID dependency is patched, with migration and regression testing. |

## Non-Applicable Finding: React Router RSC Action CSRF

| Field | Decision |
| --- | --- |
| Advisory | React Router RSC-mode action CSRF bypass |
| Scanner severity | High; reported for `react-router` and dependent `react-router-dom` |
| Owner | Frontend team |
| Exposure | TouB POS is a client-only Vite SPA using `BrowserRouter`, `Routes`, `Route`, `Navigate`, and `useNavigate`. It has no React Server Components, SSR router, framework/data-router actions, loaders, or server action endpoint. The vulnerable RSC action-processing boundary is absent. |
| Why not force-fix | The current `react-router-dom` release is 7.18.2. npm proposes a downgrade that would reintroduce older Router advisories; forcing React Router 8.3 under a 7.x DOM package violates its exact dependency contract. |
| Controls | Do not add React Router RSC/framework server actions without resolving this exception first; keep backend CSRF/auth enforcement independent of frontend routing. |
| Expiry/review | Review by 2026-08-31 or immediately when a compatible `react-router-dom` release includes React Router 8.3 or later. |
| Exit condition | Upgrade both Router packages together to an officially compatible patched release and rerun frontend verification. |

## Removed Findings

- Removed `bakong-khqr` and its obsolete transitive Axios runtime dependency.
- Updated transitive `body-parser` to `1.20.6`.
- Updated `react-router-dom`/`react-router` to `7.18.2`.
- Updated transitive PostCSS to `8.5.25`.
- Updated transitive DOMPurify to `3.4.12`.
