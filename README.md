# Toub POS

A lightweight Point-of-Sale system designed for small merchant teams. Toub POS combines dynamic QR payment verification, real-time cashier-specific notifications, multi-cashier coordination, and automatic daily sales reporting — eliminating payment confusion during busy sales periods.

---

## Architecture

| Layer    | Technology          | Role                                          |
|----------|---------------------|-----------------------------------------------|
| Frontend | React + Vite        | Cashier & manager UI (tablet/mobile-first)    |
| Backend  | Node.js + Express   | REST API, JWT auth, real-time event handling  |
| Database | MySQL               | Users, orders, transactions, products         |
| Auth     | JWT (RBAC)          | Cashier vs. Manager role enforcement          |

```
TOUB_POS/
├── backend/     → Express REST API
├── frontend/    → React (Vite) web app
└── context/     → Architecture, standards, and progress tracking docs
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MySQL ≥ 8
- npm

### 1. Clone the repo

```bash
git clone <repo-url>
cd TOUB_POS
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env       # Fill in your DB credentials and JWT secret
npm install
npm run dev
```

The API will be available at `http://localhost:3000`.

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## User Roles

| Role     | Permissions                                                  |
|----------|--------------------------------------------------------------|
| Cashier  | Create orders, generate QR codes, receive payment confirmations |
| Manager  | All cashier actions + view all transactions + daily reports + user/product management |

---

## Core User Flow

1. Cashier logs in and is assigned to a device session.
2. Cashier selects items or enters an order total → system generates a dynamic QR code.
3. Customer scans the QR and transfers payment.
4. The system detects the payment and pushes an instant confirmation to that cashier's screen.
5. The transaction is automatically recorded in the central sales history.

---

## API Base URL

```
http://localhost:3000/api
```

See [`backend/README.md`](./backend/README.md) for full endpoint documentation.

---

## Development Context

All architecture decisions, coding standards, UI guidelines, and sprint progress are tracked in [`context/`](./context/).
