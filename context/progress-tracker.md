# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Project Scaffolding — **COMPLETE**

## Completed

- Defined all context files.
- Drafted SE deliverables in `context/software-engineering.md`.
- **Scaffolded full backend structure** (`backend/src/{routes,controllers,services,repositories,middleware,config}`).
  - `app.js` + `index.js` Express entry points.
  - Auth middleware (JWT verify + RBAC `authorize()`).
  - Global error handler middleware.
  - MySQL2 connection pool config.
  - Route files: auth, order, product, user, report.
  - Controller stubs for all routes.
  - `auth.service.js` fully implemented (bcrypt + JWT sign).
  - `user.repository.js` fully implemented.
  - Stub services/repositories for order, product, report.
- **Reorganized frontend** (`CashierWorkspace.jsx` → `pages/CashierPage.jsx`, CSS deduplicated into `styles/`, import paths corrected).
- **Resolved React Doctor diagnostics** (fixed 13 warnings, score improved from 93 to 96):
  - Replaced non-semantic `role="button"` container with `<button>` tag for cart backdrop in `CashierScreen.jsx`.
  - Added descriptive `aria-label` to quantity inputs in `CashierScreen.jsx` and `OrderPanel.jsx`.
  - Renamed vague event handlers in quantity inputs to `handleQuantityChange` and `handleQuantityBlur`.
  - Optimized cart mutation hook `useCart.js` by combining chained map-filter operations into single-pass `.reduce()` loops.
  - Relocated pure functions `blankUserForm` and `blankProductForm` outside of component render scopes in `UserAdmin.jsx` and `ProductAdmin.jsx`.
  - Removed unused exports from `seedData.js`.

## Next Up

- Unit 1: Implement the backend Express server end-to-end.
  - Install dependencies (`npm install` in `backend/`).
  - Create MySQL schema (users, products, orders, transactions tables).
  - Implement `user.service.js` + `user.controller.js` (create user with bcrypt hash).
  - Implement `product` repository/service/controller.
  - Wire frontend Login page and connect to `POST /api/auth/login`.

## Open Questions

- What specific payment gateway API (e.g., Bakong KHQR) will be used to build the real-time listener webhook?
- Will the frontend use `react-router-dom` for routing, or a custom auth-guard pattern?
