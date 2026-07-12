# Code Standards

## General

- Keep modules small and single-purpose.
- Do not mix unrelated concerns in one component or route.

## Frontend (ReactJS)

- Keep UI components functional and use hooks for state management.
- Validate unknown external input at system boundaries before trusting it.
- Make sure state changes are properly handled with useState and/or useEffect.

## Styling

- Ensure all cashier-facing interfaces are fully responsive for mobile, tablet and also work fine on big computer screens.
- **Layout Sizing:** Use relative units (`%`, `vw`, `vh`, `fr` in grid, `flex`) for major structural containers and widths to ensure fluid responsiveness.
- **Spacing Grid:** Use strict `8px`-based increments (`8px`, `16px`, `24px`, etc., or Tailwind equivalents like `p-2`, `m-4`) for padding, margins, gaps, and border radii. Fixed pixel sizes (or their `rem` equivalents) are correct for spacing, but not for structural layout widths.
- Geist Variable must be used for interface text. Use a system monospace stack only for compact technical labels, IDs, and report metadata.

## API Routes (Express.js)  

- Validate and parse request input before any logic runs.
- Enforce auth and ownership before any mutation.
- Return consistent, predictable JSON response shapes (e.g., `{ success: true, data: ... }`).

## File Organization

- `routes/` — Express router definitions.
- `controllers/` — Handlers for route requests.
- `services/` — Business logic.
- `repositories/` — Database interactions.

It's called Controller-Service-Repository pattern, and it's an industry standard for modern MVC backends.
