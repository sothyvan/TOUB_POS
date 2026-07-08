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
| Product Media | ImageKit              | Browser-direct product photo uploads and delivery |

## System Boundaries

- `frontend/src/components/` — Reusable UI elements.
- `frontend/src/pages/` — Route-level page components (`/`, `/owner-portal`).
- `backend/routes/` — API route definitions and endpoint mapping.
- `backend/controllers/` — Request handling and response formatting.
- `backend/services/` — Core business logic, WebSocket session management, Telegram bot logic.
- `backend/repositories/` — Database queries and data access logic.
- `backend/services/telegram.service.js` — Telegram Bot API integration (order relay, cook callback).
- `backend/services/websocket.service.js` — WebSocket server; maps `cashier_id → socket` for isolated push.

## Storage Model

- **MySQL Database**: Stores all relational data including Users, Stalls, Staff assignments, Orders, Order Items (with modifiers), and Payment Confirmations.
- **ImageKit**: Stores product photo binary assets. The backend issues short-lived browser-upload authentication parameters to Owner/Manager users only, while MySQL stores only the delivered asset URL in `products.image_url`.
- **localStorage (Frontend)**: Device registration token (`toub-device-registered`), auth JWT, active user session. Cleared on logout. This is accepted for the final project; production should move to short-lived access tokens plus HttpOnly refresh-token cookies.

## Auth and Access Model

- Every web user signs in through a JWT-secured auth endpoint.
- Owner/Manager username-password login and Cashier PIN login are separate, rate-limited flows.
- The system uses Role-Based Access Control (RBAC).
- The active roles are `platform_admin`, `owner`, `manager`, and `cashier`.
- `platform_admin` is a temporary TouB POS team bootstrap role that can create business Owner accounts only. It is API-only for now and does not access the owner/manager portal.
- Owners have full control over one customer business and may create Manager and Cashier users only.
- Managers handle day-to-day operations and may create/manage Cashier users only.
- Cashiers can only view and mutate transactions linked to their active session.
- Owners and Managers have access to the management portal, transactions, reports, and operational tools according to their permission level.
- Platform Admin, Owner, and Manager accounts store a bcrypt password hash and must have `pin = NULL`.
- Cashier accounts store a bcrypt PIN hash and must have `password = NULL`.
- Password hashes, raw PINs, and PIN hashes are never returned by normal API responses.
- Express applies Helmet security headers while keeping local Swagger documentation compatible.
- Future SaaS/multi-customer versions should expand `platform_admin` into a full audited platform console with tenant isolation, subscription/license management, owner recovery, and support-only access rules.

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
- Cash confirmation is allowed for the creating Cashier, or an Owner/Manager within the same business owner scope.
- Successful cash confirmation changes `orders.status` to `paid`, sets `completed_at`, and writes a `cash_payment_confirmed` audit log.
- The frontend must not create paid orders locally or submit trusted fields such as totals, status, `cashier_id`, or `stall_id`.

## KHQR Individual Payment Flow (Phase 5)

- TouB POS uses Generate KHQR (Individual)
- Backend KHQR generation uses the `bakong-khqr` SDK.
- Cashier checkout calls `POST /api/orders` with safe item data and `paymentMethod = "khqr"`.
- The backend calculates trusted totals from MySQL and creates the order as `pending_payment`.
- The backend stores `qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at`.
- The frontend displays the backend QR payload and polls `POST /api/orders/:id/check-khqr-status` while the modal is open.
- `BAKONG_ACCOUNT_ID` is required; KHQR generation must fail clearly instead of falling back to a placeholder account.
- The backend calls Bakong Open API `POST /v1/check_transaction_by_md5` with the stored `qr_md5`.
- `BAKONG_OPEN_API_TOKEN` is backend-only and must never be sent to the frontend.
- If Bakong reports payment success, the backend validates amount, currency, and configured destination account before marking the order `paid`.
- Already-paid status checks are idempotent and do not duplicate audit logs.

## Planned Real-Time & Kitchen Flow (Future)

- WebSocket payment notifications are not implemented in Phase 5; current frontend uses polling.
- A future WebSocket service should maintain a strict `Map<cashier_id, socket>` and emit only to the cashier who created the paid order.
- Telegram kitchen dispatch remains a later phase.
- The Telegram bot should post a structured ticket with inline "Done" button after paid order confirmation.
- Cook taps "Done" → Telegram sends a callback query → backend validates cook authorization through a future Telegram-only cook identity model → edits the message to mark it complete.

## Telegram Kitchen Bot Architecture

- **Outbound**: `telegram.service.js` uses the Bot API `sendMessage` with inline keyboard buttons after each confirmed order.
- **Inbound**: A webhook endpoint (`POST /api/webhook/telegram`) receives callback queries from cook button taps.
- **Security**: Telegram ticket state is stored in `TelegramTicket`; cook authorization rules still need a replacement model before production.
- **State update**: Uses `editMessageText` + `editMessageReplyMarkup` to mutate the ticket in-place (no new messages).
- **Format**: Ticket includes stall label, order ID, item list with modifiers, totals, and timestamp.

## Core Data Entities

- **User / Staff**: Unique username, role (`platform_admin` / `owner` / `manager` / `cashier`), and exactly one role-appropriate credential: Platform Admin/Owner/Manager use a bcrypt password hash; Cashier uses a bcrypt hash of the 4-digit PIN.
- **Stall**: A physical booth location. Has a name, assigned menu profile, and registered device token.
- **StallStaff**: Junction — maps `User` to `Stall` (a cashier can belong to one stall).
- **Category**: Global menu group shared across stalls.
- **Product**: Shared catalog item metadata with name, category, and image.
- **StallProduct**: Junction that maps a `Product` to a `Stall` and stores that stall's `price_usd`, `price_khr`, and visibility.
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
| 1 | **KHQR / Bakong integration** | 🟡 Medium | Phase 5 now uses SDK-generated Individual KHQR payloads plus backend-only Bakong Open API checking by md5/hash. Production Bakong testing has passed; keep monitoring response contracts, destination account fields, and operational failure handling. |
| 2 | **WebSocket routing — accidental broadcast to wrong cashier** | 🔴 High | Isolated per-cashier notification is a confirmed core feature. Risk is implementing it incorrectly. `websocket.service.js` must maintain a strict `Map<cashier_id, socket>` and emit only to the mapped socket. Never use `io.emit()` or room broadcasts. Validate `cashier_id` on every emit. |
| 3 | **Telegram Bot async failures** | 🟡 Medium | Telegram failure must never block or rollback the order. Strategy: (1) Always log the error. (2) Store Telegram dispatch state in `telegram_tickets.status` (`pending` / `sent` / `failed` / `done`) instead of mutating payment state on `orders`. (3) Show a management dashboard badge for failed tickets so an Owner/Manager can manually relay. Auto-retry queue is out of scope (Future). |
| 4 | **KHR exchange rate — hardcoded vs. live** | 🟡 Medium | Decision required before building the product form. Recommend: hardcode the rate as a `.env` constant (`KHR_RATE=4100`) for now. Add a note in the admin panel showing the current rate. Live rate API is out of scope. |
| 5 | **Stall data isolation — cross-stall data leak** | 🔴 High | Every query that returns cashier-facing products, orders, or staff must scope by the authenticated user and their backend stall assignment. Never trust a client-supplied stall ID for cashier access. |
| 6 | **Legacy localStorage fallback regression** | 🟡 Medium | Products, categories, stalls, users, and orders are now backend-owned. Future UI work must not reintroduce localStorage as the source of truth for persisted POS data; localStorage should remain limited to auth/session/device-style browser state. |
| 7 | **Webhook duplicate events** | 🔴 High | Bakong/ABA may retry the same webhook multiple times (network timeouts). Processing it twice marks an order paid twice or creates duplicate records. Mitigation: at the start of the webhook handler, check `if order.status === 'paid' → return 200 immediately` (idempotency guard) before any DB write. |
| 8 | **QR amount mismatch** | 🔴 High | A webhook may arrive for the wrong amount or wrong merchant. Never auto-confirm just because a payment event arrived. Webhook handler must assert `webhook.amount === order.total_usd` and `webhook.merchant_id === env.MERCHANT_ID` before marking the order paid. Reject mismatches with a `400` and log them. |
| 9 | **JWT expiry mid-shift** | 🟡 Medium | Cashier's 8h token can expire while they are mid-order. The next API call returns `401`, the cart is lost, and the cashier is confused. Mitigation: frontend must intercept all `401` responses, store the current cart in `sessionStorage`, redirect to PIN re-entry, and restore the cart after re-authentication. |
| 10 | **Device token revocation** | 🟡 Medium | No current mechanism to remotely deregister a terminal (e.g., stolen tablet). The device token in `stalls.device_token` remains valid indefinitely. Mitigation: management portal must include an Owner-controlled "Revoke Terminal" action that clears `stalls.device_token = NULL`, immediately invalidating that device's access. |
| 11 | **Future platform admin data access** | 🔴 High | The current `platform_admin` role is limited to owner bootstrap only. If TouB POS becomes a multi-customer SaaS product, expand it with tenant isolation, support-session auditing, and least-privilege access before enabling any broader cross-customer administration. |

