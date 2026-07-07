# Toub POS

A lightweight Point-of-Sale system for small merchant teams operating across multiple stalls. TouB POS now uses backend-owned products, staff assignments, orders, cash confirmation, KHQR Individual payment confirmation with backend Bakong status checking, and audit logs, with future phases planned for live WebSocket updates and Telegram kitchen dispatch.

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
| `owner` | Full system owner | Full management access, including Owner, Manager, and Cashier accounts |
| `manager` | Operational supervisor | Manage daily operations and Cashier accounts only |
| `cashier` | Frontline POS staff | Use assigned-stall cashier workspace and own order history |

Credential rules:

- Owner/Manager accounts log in with username + password.
- Owner/Manager accounts have `pin = NULL`.
- Cashier accounts log in with PIN.
- Cashier PINs are bcrypt-hashed.
- Cashier accounts may have `password = NULL`.

---

## Current Order Flow

1. Cashier logs in with PIN and works from their assigned stall.
2. Cashier selects visible products from the stall-scoped catalog.
3. Frontend sends product IDs, quantities, notes, and payment method to `POST /api/orders`.
4. Backend derives cashier/stall from the JWT and assignment, calculates trusted totals from MySQL, and snapshots item names/prices.
5. Cash orders start as `pending_payment`.
6. Cash confirmation uses `POST /api/orders/:id/confirm-cash`.
7. Confirmation changes the order status to `paid` and writes an audit log.

KHQR Individual checkout is backend-owned in Phase 5. The frontend displays the backend QR payload and asks the TouB backend to check payment status. The backend checks Bakong Open API by QR md5/hash before marking the order as `paid`. Live WebSocket payment updates and Telegram kitchen dispatch are later phases.

---

## API Base URL

```text
http://localhost:3000/api
```

See [`backend/README.md`](./backend/README.md) and [`docs/api/endpoints.md`](./docs/api/endpoints.md) for endpoint documentation.

---

## Development Context

Architecture decisions, coding standards, UI guidelines, and sprint progress are tracked in [`context/`](./context/).
