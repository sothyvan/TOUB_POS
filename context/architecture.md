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
- **localStorage (Frontend)**: Device registration token (`toub-device-registered`), auth JWT, active user session. Cleared on logout. This is accepted for the final project; production should move to short-lived access tokens plus HttpOnly refresh-token cookies.

## Auth and Access Model

- Every web user signs in through a JWT-secured auth endpoint.
- Owner/Manager username-password login and Cashier PIN login are separate, rate-limited flows.
- The system uses Role-Based Access Control (RBAC).
- The primary roles are `owner`, `manager`, and `cashier`.
- Owners have full business and system control, including creating Owner, Manager, and Cashier users.
- Managers handle day-to-day operations and may create/manage Cashier users only.
- Cashiers can only view and mutate transactions linked to their active session.
- Owners and Managers have access to the management portal, transactions, reports, and operational tools according to their permission level.
- Owner and Manager accounts store a bcrypt password hash and must have `pin = NULL`.
- Cashier accounts store a bcrypt PIN hash and must have `password = NULL`.
- Password hashes, raw PINs, and PIN hashes are never returned by normal API responses.
- Express applies Helmet security headers while keeping local Swagger documentation compatible.
- Future SaaS/multi-customer versions may add a separate `platform_admin` role for the TouB POS developer/operator team. This role is outside the customer business RBAC model and must be implemented with tenant isolation, audit logging, and support-only access rules.

## Invariants

1. Request handlers must only handle HTTP routing; business logic strictly belongs in the services layer.
2. Auth must be enforced at every mutation boundary.
3. A transaction cannot be marked as paid without a valid, verified webhook/listener event — except for cash, which is confirmed by explicit cashier/manager/owner action.
4. WebSocket payment notifications must only be pushed to the socket registered by the cashier who initiated that specific QR session. No broadcast.
5. A terminal (device) may only load menu items and staff rosters scoped to its registered stall. Cross-stall data must never be returned.
6. Telegram callback authorization needs a replacement cook-identity model before production; current Telegram persistence is limited to order ticket dispatch state.
7. Order item modifiers/notes must be stored as a snapshot at time of order — not linked to a live config.

## Frontend State Management

- **UI State**: Handled locally within components using `useState` and `useEffect` (e.g., active modals, UI toggles).
- **Global/Server State**: Abstracted into custom hooks (e.g., `useProducts`, `useOrders`) which interface with the central API service.
- **Cart Management**: Cart state is managed globally or passed down from a parent POS container to ensure synchronization between the product grid and the order panel.

## Current Payment Flow (Phase 4)

- Cashier checkout calls `POST /api/orders` with product IDs, quantities, optional notes, and payment method only.
- The backend derives `cashier_id` from the JWT and `stall_id` from the cashier's staff assignment.
- The backend loads product prices from MySQL, calculates trusted subtotal/total values, snapshots item names/prices, and creates the order as `pending_payment`.
- Cash confirmation uses `POST /api/orders/:id/confirm-cash`.
- Cash confirmation is allowed for the creating Cashier, Owner, or Manager.
- Successful cash confirmation changes `orders.status` to `paid`, sets `completed_at`, and writes a `cash_payment_confirmed` audit log.
- The frontend must not create paid orders locally or submit trusted fields such as totals, status, `cashier_id`, or `stall_id`.

## Planned Real-Time & Payment Flow (Phase 5 KHQR)

- Real KHQR webhook confirmation is not implemented yet; the current payment webhook path is a placeholder.
- When a KHQR code is generated in the future, the frontend should open a WebSocket connection identified by `{ cashier_id, order_id }`.
- `websocket.service.js` should maintain a `Map<cashier_id, socket>` to track active sessions.
- Upon successful verified payment, the banking webhook (`POST /api/webhook/payment`) should trigger the services layer to:
  1. Validate duplicate events, amount, merchant, and order state.
  2. Update `orders.status = 'paid'` in DB.
  3. Push `payment_confirmed` event via WebSocket to **only** the socket mapped to that `cashier_id`.
  4. Call `telegram.service.js` to relay the order payload to the stall's Telegram kitchen channel.
- The Telegram bot should post a structured ticket with inline "Done" button.
- Cook taps "Done" → Telegram sends a callback query → backend validates cook authorization through a future Telegram-only cook identity model → edits the message to mark it complete.

## Telegram Kitchen Bot Architecture

- **Outbound**: `telegram.service.js` uses the Bot API `sendMessage` with inline keyboard buttons after each confirmed order.
- **Inbound**: A webhook endpoint (`POST /api/webhook/telegram`) receives callback queries from cook button taps.
- **Security**: Telegram ticket state is stored in `TelegramTicket`; cook authorization rules still need a replacement model before production.
- **State update**: Uses `editMessageText` + `editMessageReplyMarkup` to mutate the ticket in-place (no new messages).
- **Format**: Ticket includes stall label, order ID, item list with modifiers, totals, and timestamp.

## Core Data Entities

- **User / Staff**: Unique username, role (`owner` / `manager` / `cashier`), and exactly one role-appropriate credential: Owner/Manager use a bcrypt password hash; Cashier uses a bcrypt hash of the 4-digit PIN.
- **Stall**: A physical booth location. Has a name, assigned menu profile, and registered device token.
- **StallStaff**: Junction — maps `User` to `Stall` (a cashier can belong to one stall).
- **Product**: Catalog item with `price_usd`, `price_khr`, category, image, visibility flag.
- **Category**: Groups products. Belongs to a stall's menu profile.
- **Order**: A transaction. Belongs to a `User` (cashier) and a `Stall`. Has payment method, status, and totals.
- **OrderItem**: Links `Order` to `Product`. Stores quantity, price snapshot, and **`notes`** (modifiers like "no ice").
- **AuditLog**: Records sensitive POS actions such as order creation and cash payment confirmation, including the actor, action, order, details, and timestamp.
- **TelegramTicket**: Tracks Telegram kitchen dispatch state for an order, including Telegram message/chat IDs, send status, and cook completion timestamp.

## Error Handling Strategy

- **Backend**: All errors are caught by a global Express error handler and mapped to a standard JSON format: `{ success: false, code: 400, message: "..." }`.
- **Frontend**: The `services/api.js` layer intercepts failing requests and surfaces them to the UI via toast notifications or inline error states, preventing silent failures.

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **KHQR / Bakong webhook integration** | 🟡 Medium | Phase 5 must replace the current placeholder webhook with Bakong's official development API environment. Register for dev credentials, validate real gateway payloads, and avoid treating mock/browser events as payment truth. |
| 2 | **WebSocket routing — accidental broadcast to wrong cashier** | 🔴 High | Isolated per-cashier notification is a confirmed core feature. Risk is implementing it incorrectly. `websocket.service.js` must maintain a strict `Map<cashier_id, socket>` and emit only to the mapped socket. Never use `io.emit()` or room broadcasts. Validate `cashier_id` on every emit. |
| 3 | **Telegram Bot async failures** | 🟡 Medium | Telegram failure must never block or rollback the order. Strategy: (1) Always log the error. (2) Store Telegram dispatch state in `telegram_tickets.status` (`pending` / `sent` / `failed` / `done`) instead of mutating payment state on `orders`. (3) Show a management dashboard badge for failed tickets so an Owner/Manager can manually relay. Auto-retry queue is out of scope (Future). |
| 4 | **KHR exchange rate — hardcoded vs. live** | 🟡 Medium | Decision required before building the product form. Recommend: hardcode the rate as a `.env` constant (`KHR_RATE=4100`) for now. Add a note in the admin panel showing the current rate. Live rate API is out of scope. |
| 5 | **Stall data isolation — cross-stall data leak** | 🔴 High | Every query that returns cashier-facing products, orders, or staff must scope by the authenticated user and their backend stall assignment. Never trust a client-supplied stall ID for cashier access. |
| 6 | **Legacy localStorage fallback regression** | 🟡 Medium | Products, categories, stalls, users, and orders are now backend-owned. Future UI work must not reintroduce localStorage as the source of truth for persisted POS data; localStorage should remain limited to auth/session/device-style browser state. |
| 7 | **Webhook duplicate events** | 🔴 High | Bakong/ABA may retry the same webhook multiple times (network timeouts). Processing it twice marks an order paid twice or creates duplicate records. Mitigation: at the start of the webhook handler, check `if order.status === 'paid' → return 200 immediately` (idempotency guard) before any DB write. |
| 8 | **QR amount mismatch** | 🔴 High | A webhook may arrive for the wrong amount or wrong merchant. Never auto-confirm just because a payment event arrived. Webhook handler must assert `webhook.amount === order.total_usd` and `webhook.merchant_id === env.MERCHANT_ID` before marking the order paid. Reject mismatches with a `400` and log them. |
| 9 | **JWT expiry mid-shift** | 🟡 Medium | Cashier's 8h token can expire while they are mid-order. The next API call returns `401`, the cart is lost, and the cashier is confused. Mitigation: frontend must intercept all `401` responses, store the current cart in `sessionStorage`, redirect to PIN re-entry, and restore the cart after re-authentication. |
| 10 | **Device token revocation** | 🟡 Medium | No current mechanism to remotely deregister a terminal (e.g., stolen tablet). The device token in `stalls.device_token` remains valid indefinitely. Mitigation: management portal must include an Owner-controlled "Revoke Terminal" action that clears `stalls.device_token = NULL`, immediately invalidating that device's access. |
| 11 | **Future platform admin data access** | 🔴 High | If TouB POS becomes a multi-customer SaaS product, the developer/operator `platform_admin` role must be separated from customer roles. Add tenant isolation, support-session auditing, and least-privilege access before enabling any cross-customer administration. |

