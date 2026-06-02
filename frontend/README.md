# Toub POS — Frontend

React + Vite web application. Provides the cashier workspace and manager admin panel, optimized for tablet and mobile browsers.

---

## Setup

### Prerequisites

- Node.js ≥ 18

### Install & Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173` by default.

> The frontend expects the backend API at `http://localhost:3000/api`. See [`backend/README.md`](../backend/README.md) to get the API running first.

---

## Project Structure

```
frontend/src/
├── main.jsx              → React DOM entry point
├── App.jsx               → Router root (react-router-dom)
├── index.css             → Global CSS reset and base styles
├── App.css               → App-level layout styles
│
├── pages/                → Full-page view components (one per route)
│   ├── LoginPage.jsx     → /login
│   └── CashierPage.jsx   → /cashier  (cashier + admin workspace)
│
├── components/           → Reusable UI components
│   ├── LoginScreen.jsx
│   ├── Topbar.jsx
│   ├── CashierScreen.jsx
│   ├── OrderPanel.jsx
│   ├── AdminWorkspace.jsx
│   ├── ProductAdmin.jsx
│   ├── CategoryAdmin.jsx
│   ├── UserAdmin.jsx
│   └── OrderHistory.jsx
│
├── hooks/                → Custom React hooks
│   └── useSavedState.js  → localStorage-backed useState
│
├── utils/                → Pure utility functions (no React)
│   ├── format.js         → Money formatting, initials, code generation
│   ├── ids.js            → Unique ID generation
│   └── permissions.js    → Role-based permission checks
│
├── styles/               → Component-scoped CSS files
│   └── CashierWorkspace.css
│
└── data/
    └── seedData.js       → Static seed data for dev/demo
```

---

## Routing

| Path       | Component     | Description                          |
|------------|---------------|--------------------------------------|
| `/login`   | `LoginPage`   | PIN-based login for cashiers/managers |
| `/cashier` | `CashierPage` | Main POS workspace                   |
| `*`        | Redirect      | Falls back to `/login`               |

---

## UI Guidelines

- **Target devices**: Tablet and mobile browsers (touch-first).
- **Design**: High-contrast, large tap targets, minimal cognitive load.
- **Styling**: CSS custom properties for all design tokens — no hardcoded hex values.
- **Components**: Functional components only, state managed via hooks.

Key CSS variables defined in `index.css`:

| Variable           | Role              |
|--------------------|-------------------|
| `--bg-base`        | Page background   |
| `--bg-surface`     | Card / surface    |
| `--text-primary`   | Primary text      |
| `--text-muted`     | Secondary text    |
| `--accent-primary` | Primary action    |
| `--state-error`    | Error / alert     |
| `--state-success`  | Success / confirm |

---

## Available Scripts

| Command           | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start Vite dev server with HMR     |
| `npm run build`   | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build       |
| `npm run lint`    | Run ESLint                         |
