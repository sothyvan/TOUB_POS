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
3. A transaction cannot be marked as complete without a valid, verified webhook/listener event. Except for cash payment method, it can be marked as complete without webhook/listener event.
4. Notifications must only be routed to the specific cashier who initiated the QR session.

## Frontend State Management

- **UI State**: Handled locally within components using `useState` and `useEffect` (e.g., active modals, UI toggles).
- **Global/Server State**: Abstracted into custom hooks (e.g., `useProducts`, `useOrders`) which interface with the central API service.
- **Cart Management**: Cart state is managed globally or passed down from a parent POS container to ensure synchronization between the product grid and the order panel.

## Real-Time & Payment Flow (KHQR)

- The system relies on event-driven updates for payments.
- When a KHQR code is generated, the frontend enters a polling or WebSocket listening state.
- Upon successful payment, the banking webhook hits the `backend/routes/` which triggers the `services/` layer to update the DB and push a real-time success event to the specific cashier's active session.

## Core Data Entities

- **User / Staff**: Contains auth credentials and role (`manager` vs `cashier`).
- **Product**: Catalog items with price, category, and inventory status.
- **Order**: Represents a transaction. Belongs to a `User` (the cashier who processed it).
- **OrderItem**: Junction table linking `Order` and `Product` (recording quantity and historical price).

## Error Handling Strategy

- **Backend**: All errors are caught by a global Express error handler and mapped to a standard JSON format: `{ success: false, code: 400, message: "..." }`.
- **Frontend**: The `services/api.js` layer intercepts failing requests and surfaces them to the UI via toast notifications or inline error states, preventing silent failures.
