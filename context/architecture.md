# Architecture Context

## Stack

| Layer        | Technology              | Role                                              |
| ------------ | ----------------------- | ------------------------------------------------- |
| Frontend     | ReactJS + Vite          | UI rendering and state management                 |
| Backend      | Node.js + Express.js    | REST API, WebSocket server, webhook handler       |
| Database     | MySQL                   | Relational data storage                           |
| Auth         | JWT                     | Secure authentication and session management      |
| Real-Time    | WebSocket (ws / socket.io) | Cashier-specific payment confirmation push     |
| Kitchen Bot  | Telegram Bot API        | Order relay and cook acknowledgement system       |

## System Boundaries

- `frontend/src/components/` — Reusable UI elements.
- `frontend/src/pages/` — Route-level page components (`/`, `/admin-portal`).
- `backend/routes/` — API route definitions and endpoint mapping.
- `backend/controllers/` — Request handling and response formatting.
- `backend/services/` — Core business logic, WebSocket session management, Telegram bot logic.
- `backend/repositories/` — Database queries and data access logic.
- `backend/services/telegram.service.js` — Telegram Bot API integration (order relay, cook callback).
- `backend/services/websocket.service.js` — WebSocket server; maps `cashier_id → socket` for isolated push.

## Storage Model

- **MySQL Database**: Stores all relational data including Users, Stalls, Staff assignments, Orders, Order Items (with modifiers), and Payment Confirmations.
- **localStorage (Frontend)**: Device registration token (`toub-device-registered`), auth JWT, active user session. Cleared on logout.

## Auth and Access Model

- Every user signs in via a JWT-secured login endpoint.
- The system uses Role-Based Access Control (RBAC).
- Cashiers can only view and mutate transactions linked to their active session.
- Managers have read access to all system transactions and reports.

## Invariants

1. Request handlers must only handle HTTP routing; business logic strictly belongs in the services layer.
2. Auth must be enforced at every mutation boundary.
3. A transaction cannot be marked as complete without a valid, verified webhook/listener event — except for cash, which is confirmed by explicit cashier dialog action.
4. WebSocket payment notifications must only be pushed to the socket registered by the cashier who initiated that specific QR session. No broadcast.
5. A terminal (device) may only load menu items and staff rosters scoped to its registered stall. Cross-stall data must never be returned.
6. Only authorized Telegram user IDs (cook accounts) may trigger order state changes via bot callbacks.
7. Order item modifiers/notes must be stored as a snapshot at time of order — not linked to a live config.

## Frontend State Management

- **UI State**: Handled locally within components using `useState` and `useEffect` (e.g., active modals, UI toggles).
- **Global/Server State**: Abstracted into custom hooks (e.g., `useProducts`, `useOrders`) which interface with the central API service.
- **Cart Management**: Cart state is managed globally or passed down from a parent POS container to ensure synchronization between the product grid and the order panel.

## Real-Time & Payment Flow (KHQR)

- When a KHQR code is generated, the frontend opens a WebSocket connection identified by `{ cashier_id, order_id }`.
- `websocket.service.js` maintains a `Map<cashier_id, socket>` to track active sessions.
- Upon successful payment, the banking webhook (`POST /api/webhook/payment`) triggers the services layer to:
  1. Update `orders.status = 'completed'` in DB.
  2. Push `payment_confirmed` event via WebSocket to **only** the socket mapped to that `cashier_id`.
  3. Call `telegram.service.js` to relay the order payload to the stall's Telegram kitchen channel.
- The Telegram bot posts a structured ticket with inline "Done" button.
- Cook taps "Done" → Telegram sends a callback query → backend validates the cook's Telegram ID against `TelegramSession` → edits the message to mark it complete.

## Telegram Kitchen Bot Architecture

- **Outbound**: `telegram.service.js` uses the Bot API `sendMessage` with inline keyboard buttons after each confirmed order.
- **Inbound**: A webhook endpoint (`POST /api/webhook/telegram`) receives callback queries from cook button taps.
- **Security**: Each callback validates `from.id` against the authorized `TelegramSession` records for that stall.
- **State update**: Uses `editMessageText` + `editMessageReplyMarkup` to mutate the ticket in-place (no new messages).
- **Format**: Ticket includes stall label, order ID, item list with modifiers, totals, and timestamp.

## Core Data Entities

- **User / Staff**: Auth credentials, role (`admin` / `manager` / `cashier`), 4-digit PIN.
- **Stall**: A physical booth location. Has a name, assigned menu profile, and registered device token.
- **StallStaff**: Junction — maps `User` to `Stall` (a cashier can belong to one stall).
- **Product**: Catalog item with `price_usd`, `price_khr`, category, image, visibility flag.
- **Category**: Groups products. Belongs to a stall's menu profile.
- **Order**: A transaction. Belongs to a `User` (cashier) and a `Stall`. Has payment method, status, and totals.
- **OrderItem**: Links `Order` to `Product`. Stores quantity, price snapshot, and **`notes`** (modifiers like "no ice").
- **TelegramSession**: Authorized Telegram user IDs per stall kitchen channel (cook identity lock).

## Error Handling Strategy

- **Backend**: All errors are caught by a global Express error handler and mapped to a standard JSON format: `{ success: false, code: 400, message: "..." }`.
- **Frontend**: The `services/api.js` layer intercepts failing requests and surfaces them to the UI via toast notifications or inline error states, preventing silent failures.

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **KHQR / Bakong webhook integration** | 🟡 Medium | Use Bakong's official **development API** environment for all testing. Register for dev credentials at the Bakong developer portal. Do not mock — integrate against the real dev sandbox from the start so behavior matches production exactly. |
| 2 | **WebSocket routing — accidental broadcast to wrong cashier** | 🔴 High | Isolated per-cashier notification is a confirmed core feature. Risk is implementing it incorrectly. `websocket.service.js` must maintain a strict `Map<cashier_id, socket>` and emit only to the mapped socket. Never use `io.emit()` or room broadcasts. Validate `cashier_id` on every emit. |
| 3 | **Telegram Bot async failures** | 🟡 Medium | Telegram failure must never block or rollback the order. Strategy: (1) Always log the error. (2) Store `telegram_status` (`pending` / `sent` / `failed`) on the `orders` table — set to `failed` on catch. (3) Show an admin dashboard badge for failed orders so manager can manually relay. Auto-retry queue is out of scope (Future). |
| 4 | **KHR exchange rate — hardcoded vs. live** | 🟡 Medium | Decision required before building the product form. Recommend: hardcode the rate as a `.env` constant (`KHR_RATE=4100`) for now. Add a note in the admin panel showing the current rate. Live rate API is out of scope. |
| 5 | **Stall data isolation — cross-stall data leak** | 🔴 High | Every repository query that returns products, orders, or staff **must** include `WHERE stall_id = ?` scoped from the authenticated device token — never from a client-supplied query param. |
| 6 | **Frontend ↔ Backend integration gap** | 🟡 Medium | Frontend currently runs entirely on `localStorage`. All hooks (`useProducts`, `useOrders`, `useUsers`) must be migrated to real API calls. Do this incrementally per feature, not all at once. |
| 7 | **Webhook duplicate events** | 🔴 High | Bakong/ABA may retry the same webhook multiple times (network timeouts). Processing it twice marks an order complete twice or creates duplicate records. Mitigation: at the start of the webhook handler, check `if order.status === 'completed' → return 200 immediately` (idempotency guard) before any DB write. |
| 8 | **QR amount mismatch** | 🔴 High | A webhook may arrive for the wrong amount or wrong merchant. Never auto-confirm just because a payment event arrived. Webhook handler must assert `webhook.amount === order.total_usd` and `webhook.merchant_id === env.MERCHANT_ID` before marking the order complete. Reject mismatches with a `400` and log them. |
| 9 | **JWT expiry mid-shift** | 🟡 Medium | Cashier's 8h token can expire while they are mid-order. The next API call returns `401`, the cart is lost, and the cashier is confused. Mitigation: frontend must intercept all `401` responses, store the current cart in `sessionStorage`, redirect to PIN re-entry, and restore the cart after re-authentication. |
| 10 | **Device token revocation** | 🟡 Medium | No current mechanism to remotely deregister a terminal (e.g., stolen tablet). The device token in `stalls.device_token` remains valid indefinitely. Mitigation: admin portal must include a "Revoke Terminal" action that clears `stalls.device_token = NULL`, immediately invalidating that device's access. |

