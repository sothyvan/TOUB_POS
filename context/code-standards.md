# Code Standards

## General

- Keep modules small and single-purpose.
- Do not mix unrelated concerns in one component or route.

## Frontend (ReactJS)

- Keep UI components functional and use hooks for state management.
- Validate unknown external input at system boundaries before trusting it.

## Styling

- Use CSS custom property tokens or consistent utility classes — no hardcoded hex values.
- Ensure all cashier-facing interfaces are fully responsive for mobile and tablet views.

## API Routes (Express.js)

- Validate and parse request input before any logic runs.
- Enforce auth and ownership before any mutation.
- Return consistent, predictable JSON response shapes (e.g., `{ success: true, data: ... }`).

## File Organization

- `routes/` — Express router definitions.
- `controllers/` — Handlers for route requests.
- `services/` — Business logic.
- `repositories/` — Database interactions.
