# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent behavior from scratch.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture.md` was violated.
3. `progress-tracker.md` reflects the completed work.

## Database & SQL Synchronization Rules

- This project uses Sequelize ORM for backend database interactions, but also maintains raw SQL files in `docs/database/schema.sql` and `docs/database/queries.sql` for course validation.
- **Strict Invariant**: Database changes require bidirectional (back-and-forth) synchronization. Any modification to a Sequelize model, association, or repository query **MUST** be reflected in the raw SQL files (`docs/database/schema.sql` and `docs/database/queries.sql`), and any change to the raw SQL files **MUST** be ported back to the Sequelize models and repositories to ensure 100% parity.
