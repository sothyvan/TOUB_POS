# Toub POS

A lightweight Point-of-Sale system for small merchant teams operating across multiple stalls. TouB POS uses backend-owned products, staff assignments, orders, cash confirmation, audit logs, live updates, and Telegram kitchen dispatch. Automatic KHQR checkout is temporarily disabled while the team evaluates an approved merchant payment provider.

---

## Architecture

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React + Vite | Owner/manager portal and cashier POS workspace |
| Backend | Node.js + Express | REST API, JWT auth, RBAC, order/payment business rules |
| Database | MySQL + Sequelize | Users, stalls, products, orders, order items, audit logs |
| Auth | JWT access token | Stored in frontend localStorage for this final-project scope |
| Security | Helmet + rate limiting | Security headers and login/PIN abuse protection |

```text
TOUB_POS/
├── backend/     -> Express REST API
├── frontend/    -> React (Vite) web app
├── docs/        -> API, database, design, and handoff docs
└── context/     -> Architecture, standards, and progress tracking docs
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- MySQL >= 8
- npm

### 1. Set up the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API runs at `http://localhost:3000`.

### 2. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

---

## User Roles

| Role | Meaning | Main Permissions |
|------|---------|------------------|
| `platform_admin` | TouB POS team bootstrap account | API-only creation of business owner accounts |
| `owner` | Full business owner | Full management access for one customer business, including Manager and Cashier accounts |
| `manager` | Operational supervisor | Manage daily operations and Cashier accounts only |
| `cashier` | Frontline POS staff | Use assigned-stall cashier workspace and own order history |

Credential rules:

- Platform Admin/Owner/Manager accounts log in with username + password.
- Platform Admin/Owner/Manager accounts have `pin = NULL`.
- Cashier accounts log in with PIN.
- Cashier PINs are bcrypt-hashed.
- Cashier accounts may have `password = NULL`.

TouB POS allows one Owner per customer business. Additional supervisors should be created as Managers, not extra Owners. The temporary `platform_admin` role is for the TouB POS team to bootstrap new Owner accounts before a full platform administration system exists.

---

## Current Order Flow

1. Cashier logs in with PIN and works from their assigned stall.
2. Cashier selects visible products from the stall-scoped catalog.
3. Frontend sends product IDs, quantities, notes, and payment method to `POST /api/orders`.
4. Backend derives cashier/stall from the JWT and assignment, calculates trusted totals from MySQL, and snapshots item names/prices.
5. Cash orders start as `pending_payment`.
6. Cash confirmation uses `POST /api/orders/:id/confirm-cash`.
7. Confirmation changes the order status to `paid` and writes an audit log.

Cash is the currently enabled checkout method. The previous backend-owned KHQR implementation and historical order fields are retained, but new KHQR creation, status polling, and background checks are disabled unless both backend `KHQR_ENABLED=true` and frontend `VITE_KHQR_ENABLED=true` are explicitly configured. The default remains `false` while an approved merchant integration is evaluated.

---

## API Base URL

```text
http://localhost:3000/api
```

See [`backend/README.md`](./backend/README.md) and [`docs/api/endpoints.md`](./docs/api/endpoints.md) for endpoint documentation.

---

## Development Context

Architecture decisions, coding standards, UI guidelines, and sprint progress are tracked in [`context/`](./context/).
