# Toub POS Frontend

React + Vite web application for the TouB POS management portal and cashier workspace. The frontend talks to the Express API and keeps the backend as the source of truth for users, products, stalls, staff assignments, orders, and cash confirmation.

---

## Setup

### Prerequisites

- Node.js >= 18

### Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default.

The frontend expects the backend API at:

```text
http://localhost:3000/api
```

Override it with `VITE_API_BASE_URL` if needed.

---

## Project Structure

```text
frontend/src/
├── main.jsx               -> React DOM entry point
├── App.jsx                -> Route definitions and protected routes
├── auth/                  -> Auth provider, session storage, route guards
├── pages/                 -> Login, cashier, and owner/manager portal pages
├── components/            -> Reusable UI and feature components
├── hooks/                 -> Custom hooks for products, users, orders, auth state
├── services/api.js        -> Central API client with Bearer token attachment
├── utils/                 -> Formatting, permissions, storage, helper functions
└── index.css              -> Tailwind v4 theme and global styles
```

---

## Routing

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Owner/manager username-password login and cashier PIN login |
| `/owner-portal` | `owner`, `manager` | Customer business management portal |
| `/cashier` | `cashier` | Assigned-stall cashier workspace |
| `*` | Public | Redirects to `/login` or the correct protected workspace |

Frontend route guards improve UX, but backend authorization remains the source of truth.

---

## Auth And Session Storage

- The frontend stores the JWT access token and current user in localStorage.
- `services/api.js` automatically attaches `Authorization: Bearer <token>` when a token exists.
- Logout clears the token and current user.
- `401` responses clear the session and redirect the user back to login.
- HttpOnly refresh tokens are a future production improvement, not part of the current final-project implementation.

Credential rules:

- Platform Admin/Owner/Manager use username + password.
- Platform Admin/Owner/Manager accounts have no PIN.
- Cashier uses PIN login.
- Cashier PINs are hashed in the backend.
- Cashier accounts do not need a password.

`platform_admin` is API/bootstrap-only in the current project. It is used by the TouB POS team to create Owner accounts and does not have a frontend portal yet.

---

## Order And Checkout Behavior

- The cart can live in frontend state while the cashier is selecting items.
- The frontend does not create paid orders by itself.
- Checkout calls `POST /api/orders`.
- The backend calculates trusted prices and totals from MySQL.
- Cash orders start as `pending_payment`.
- Cash confirmation calls `POST /api/orders/:id/confirm-cash`.
- The cashier enters cash received; the frontend previews change, while the backend verifies the amount, calculates saved change due, changes cash orders to `paid`, and writes audit logs.
- Order history loads from the backend, so clearing browser localStorage does not erase saved orders.

KHQR checkout is temporarily hidden by default while TouB POS evaluates an approved merchant payment provider. `VITE_KHQR_ENABLED=true` exposes the retained KHQR interface only for an intentionally configured build; the backend must independently have `KHQR_ENABLED=true`. Cash remains the enabled checkout method, and historical KHQR orders remain visible.

---

## UI Guidelines

- Target devices: tablet and mobile browsers first.
- Design: high-contrast, large tap targets, and quick cashier workflows.
- Styling: Tailwind CSS v4 with app tokens in `index.css`.
- Components: functional React components with hooks.
- Owner and Manager screens should keep management actions clear and confirm destructive changes.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
