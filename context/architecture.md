# Architecture Context

## Stack

| Layer    | Technology           | Role                                         |
| -------- | -------------------- | -------------------------------------------- |
| Frontend | ReactJS              | UI rendering and state management            |
| Backend  | Node.js + Express.js | REST API and real-time event handling        |
| Database | MySQL                | Relational data storage                      |
| Auth     | JWT                  | Secure authentication and session management |

## System Boundaries

- `frontend/src/components/` — Reusable UI elements.
- `backend/routes/` — API route definitions and endpoint mapping.
- `backend/controllers/` — Request handling and response formatting.
- `backend/services/` — Core business logic and real-time listener logic.
- `backend/repositories/` — Database queries and data access logic.

## Storage Model

- **MySQL Database**: Stores all relational data including Users, Orders, Transactions, and Payment Confirmations.

## Auth and Access Model

- Every user signs in via a JWT-secured login endpoint.
- The system uses Role-Based Access Control (RBAC).
- Cashiers can only view and mutate transactions linked to their active session.
- Managers have read access to all system transactions and reports.

## Invariants

1. Request handlers must only handle HTTP routing; business logic strictly belongs in the services layer.
2. Auth must be enforced at every mutation boundary.
3. A transaction cannot be marked as complete without a valid, verified webhook/listener event.
4. Notifications must only be routed to the specific cashier who initiated the QR session.
