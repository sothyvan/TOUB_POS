# TouB POS Documentation

Start here. This index separates current project documentation from historical
implementation records.

## Five-Minute Reading Path

1. Read the [Product Requirements Document](product/toub-pos-prd.md) for the
   product scope, users, requirements, and release boundaries.
2. Read the [Functional and Technical Design](design/toub-pos-functional-technical-design.md)
   for system behavior, architecture, security, and integration decisions.
3. Use the [API endpoint reference](api/endpoints.md) while developing or
   testing frontend/backend integrations.
4. Use the [Database Schema Document](database/toub-pos-database-schema.md) and
   executable [schema.sql](database/schema.sql) for data design.
5. Check [progress-tracker.md](../context/progress-tracker.md) for current
   implementation status and next work.

## Authoritative Documents

| Topic | Document |
| --- | --- |
| Product scope and requirements | [TouB POS PRD](product/toub-pos-prd.md) |
| Functional and technical architecture | [Functional and Technical Design](design/toub-pos-functional-technical-design.md) |
| User journeys and recovery paths | [User Flow Diagrams](design/toub-pos-user-flow-diagrams.md) |
| UI/UX standards | [UI/UX Design Brief](design/toub-pos-ui-ux-design-brief.md) |
| API contract | [API Endpoints](api/endpoints.md) |
| Authentication behavior | [Authentication Flow](api/auth-flow.md) |
| Dependency security exceptions | [Dependency Risk Register](security/dependency-risk-register.md) |
| Current payment behavior | [Payment Flow](design/payment-flow.md) |
| Database design | [Database Schema Document](database/toub-pos-database-schema.md) |
| Executable course SQL | [schema.sql](database/schema.sql) and [queries.sql](database/queries.sql) |
| Entity relationship diagram | [ERD](database/erd.md) |
| Local setup | [Getting Started](setup/getting-started.md) |
| Final-project report | [TouB POS Project Report](reports/TOUB_POS_Project_Report.md) |

## Source Of Truth

- Executable application code is the source of truth for implemented behavior.
- `context/architecture.md` records current architectural boundaries and
  invariants.
- Sequelize models and `docs/database/schema.sql` must remain synchronized.
- `context/progress-tracker.md` records completed work, open questions, and next
  steps.
- KHQR is suspended and its legacy generator SDK has been removed. The current
  payment document is `docs/design/payment-flow.md`.

## Archive

Past handoffs, plans, reports, and source snapshots are kept in
[docs/archive](archive/README.md) for traceability. They are historical records,
not current implementation instructions.
