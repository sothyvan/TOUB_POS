# Administrative Audit Log Policy

## Purpose

The `audit_logs` table is an append-only investigation record for payment and
privileged management changes. It answers who changed what, for which customer
business, and through which correlated HTTP request.

## Access

- The application exposes no general audit-log read, update, or delete endpoint.
- Production access is limited to approved operators using a dedicated read-only
  database/reporting role. Customer support must filter by `owner_id` and must
  not inspect another business without an approved support case.
- Application runtime code may insert audit rows only. Audit correction is a new
  compensating event; existing rows are not edited.
- Exported audit evidence is treated as confidential operational data and must
  use the same encryption and access controls as database backups.

## Retention

- Retain production audit events for at least 365 days.
- No automated purge is enabled until the project owner confirms applicable
  Cambodian accounting, employment, and privacy requirements.
- Any later purge job must be owner-scoped, documented, reviewed, and tested
  against backup/restore requirements before deployment.

## Data Minimization

Audit rows may contain stable action names, actor/owner/target IDs, request IDs,
timestamps, and bounded before/after summaries. They must never contain passwords,
PINs, hashes, JWTs, cookies, authorization or CSRF values, raw device tokens,
Telegram tokens, or complete Telegram user/chat identifiers.

