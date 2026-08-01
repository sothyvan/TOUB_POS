# Database Backup Security And P1-13 Response

## Purpose

Database backups contain the complete operational state of TouB POS. They are
not source code and must never be committed to Git, attached to a pull request,
or shared through an unapproved chat or drive.

## P1-13 Finding

The repository previously tracked
`backups/toubpos_db_backup_2026-07-13_23-10-21.sql`. It could not be proven to
contain synthetic-only data, so TouB POS treats it as sensitive.

The dump included rows from users, orders, order items, audit logs, products,
stalls, staff assignments, Telegram tickets, and historical KHQR records. Its
schema included password/PIN hashes, a legacy device-token field, Telegram
routing identifiers, QR payloads, QR MD5 values, payment references, and sales
history. The review found no named JWT, database-password, Telegram bot,
Telegram webhook, Bakong API, or ImageKit private-key variables in the dump,
but that does not make the operational rows safe to publish.

The file is removed from the current tree. `.gitignore` and the CI repository
data policy now reject backup directories, dump formats, encrypted backup
artifacts, and SQL files outside these intentional locations:

- `docs/database/schema.sql`
- `docs/database/queries.sql`
- `backend/src/database/migrations/*.sql`

## Credential And Identifier Review

Complete these actions before treating P1-13 as closed:

| Data class | Risk | Required action |
| --- | --- | --- |
| Owner/Manager password and Cashier PIN hashes | Offline password/PIN guessing | Reset every account represented in the dump, revoke its refresh sessions, and invalidate existing access sessions. Four-digit PINs must be replaced even though they were hashed. |
| Legacy Stall device tokens | A copied terminal token may impersonate a registered browser | Revoke affected legacy registrations and register the active terminals again. |
| Telegram chat/message identifiers | Operational metadata and privacy exposure, not bot authentication secrets | Review connected groups and authorized Cooks. Reconnect only if an identifier was exposed beyond the trusted team. Do not rotate the bot token solely because of this dump. |
| Historical QR payloads, MD5 values, references, and order history | Transaction privacy exposure | Keep KHQR disabled, restrict repository access during cleanup, and retain only approved accounting records in the database. No Bakong API token was identified in this dump. |
| Database/JWT/provider secrets | No named secret variables were identified in the dump | Rotate only if a separate secret scan or access review finds that they were committed or disclosed elsewhere. |

Record who performed each reset and when in a private incident record. Do not
put replacement credentials or complete Telegram identifiers in Git.

## Required Git History Cleanup

Deleting the file in a new commit does not erase it from older commits. A
repository administrator must coordinate a history rewrite after all affected
credentials and device registrations are revoked.

### Current remote verification (2026-08-01)

A fresh mirror clone of `origin` confirmed that the sensitive path is absent
from every normal remote branch and tag. Do not repeat the all-branch/tag
force-push below against the current repository state.

The blob remains reachable only through GitHub-managed pull-request refs for
pull requests 1 through 8. Those refs cannot be removed by force-pushing the
normal repository branches. A repository administrator must follow GitHub's
sensitive-data removal process and ask GitHub Support to remove the affected
cached pull-request views and references. After GitHub confirms removal, create
another fresh mirror clone and require this command to produce no output:

```bash
git rev-list --objects --all | grep toubpos_db_backup_2026-07-13_23-10-21.sql
```

The original rewrite procedure is retained below as the recovery record. It
must only be used if a future verification finds the path in a normal branch or
tag again.

1. Pause merges and notify every teammate.
2. Remove any plaintext `db-backup-*` artifacts from previous GitHub Actions
   runs and restrict Actions access to trusted repository members.
3. Take a protected administrative repository backup only if policy requires
   one; treat that copy as containing the exposed dump.
4. Temporarily permit the authorized administrator to force-push rewritten
   branches and tags.
5. In a fresh mirror clone, use `git filter-repo` to remove the exact path from
   every branch and tag:

   ```bash
   git filter-repo \
     --path backups/toubpos_db_backup_2026-07-13_23-10-21.sql \
     --invert-paths --force
   git push --force --all origin
   git push --force --tags origin
   ```

6. Restore branch protection immediately.
7. Ask every teammate to delete their old clone and make a fresh clone. A normal
   pull or merge can reintroduce the old history.
8. If the repository was public or shared outside the trusted team, follow the
   Git hosting provider's sensitive-data removal process for cached views and
   pull-request references.
9. From a fresh clone, verify the path is absent:

   ```bash
   git rev-list --objects --all | grep toubpos_db_backup_2026-07-13_23-10-21.sql
   ```

The command must produce no output. This procedure intentionally is not run by
ordinary feature-branch code because it rewrites shared commit IDs.

## Encrypted Backup Operation

`backup_database.py` now:

1. Loads database settings from protected process environment variables, with
   ignored `backend/.env` fallback for local administration.
2. Writes the temporary `mysqldump` plaintext under the operating system's
   temporary directory.
3. Encrypts it using GPG symmetric AES-256 encryption.
4. Deletes the temporary plaintext when the operation ends.
5. Creates a SHA-256 sidecar for corruption detection.
6. Keeps only ignored `backups/*.sql.gpg` and `.sql.gpg.sha256` files.

The GitHub workflow requires a separate
`BACKUP_ENCRYPTION_PASSPHRASE` Actions secret of at least 20 characters. It
uploads only the encrypted artifact and checksum, retains them for 14 days, and
has read-only repository permission. The encryption passphrase must not equal
the database password and must be stored in the team's approved password manager.

Every scheduled run uploads the encrypted files first, then uses
`verify_database_restore.py` to verify the checksum, decrypt into an operating-
system temporary directory, import into an isolated MySQL service, and confirm
the required application tables. The workflow finally runs the backend migration
status command against that restored database. A failed drill makes the workflow
fail without deleting the already-uploaded encrypted backup.

To restore, download an approved encrypted artifact, decrypt it interactively
in a restricted temporary directory, import it into a disposable database, and
delete the plaintext immediately after verification:

```bash
sha256sum --check toub_pos_backup_TIMESTAMP.sql.gpg.sha256
gpg --output restore.sql --decrypt toub_pos_backup_TIMESTAMP.sql.gpg
mysql --host=HOST --port=PORT --user=USER --password DATABASE < restore.sql
```

Test restoration before releases and after changing the passphrase. Losing the
passphrase makes existing encrypted backups unrecoverable; rotating it does not
re-encrypt old artifacts.

## Recovery Targets And Evidence

- Backup schedule: daily at 23:00 Asia/Phnom_Penh (16:00 UTC).
- Encrypted artifact retention: 14 days in GitHub Actions.
- Technical restore drill: every scheduled/manual backup run, into disposable MySQL.
- Restore evidence: workflow run duration, restore-step result, and migration-status result.
- Approved RPO: 24 hours. In a worst-case incident, the team accepts losing no
  more than the transactions since the latest daily backup.
- Approved RTO: 4 hours. The team must restore and validate application-ready
  database service within four hours of declaring a database-recovery incident.
- Access: repository Actions artifacts and the encryption passphrase are limited
  to approved maintainers; production deployment must confirm the hosting plan's
  member permissions and geographic redundancy.

## Closure Checklist

- [x] Unsafe dump removed from the current repository tree.
- [x] Generated backup and dump formats ignored.
- [x] CI rejects unapproved tracked SQL and backup artifacts.
- [x] Automated backup output encrypted without retained plaintext.
- [x] Encrypted artifacts include a SHA-256 checksum.
- [x] Scheduled workflow contains an isolated restore and migration-status drill.
- [x] No active plaintext GitHub Actions backup artifacts remain. A public API
  inventory on 2026-08-01 found only three active `db-backup-*` artifacts, and
  each run's workflow uploaded encrypted `.sql.gpg` output.
- [ ] Affected user credentials, sessions, and device registrations reviewed and rotated.
- [x] Normal remote branches and tags rewritten and verified from a fresh mirror clone.
- [ ] GitHub-managed pull-request refs 1 through 8 and cached views removed through
  GitHub's sensitive-data removal process, then verified from another fresh mirror.
- [ ] All teammates re-cloned after the rewrite.
- [ ] Updated encrypted backup workflow completed its first successful restore drill.
- [x] Business RPO of 24 hours and RTO of 4 hours approved and recorded.
