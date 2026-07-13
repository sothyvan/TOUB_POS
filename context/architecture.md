# Architecture Context

## Stack

| Layer        | Technology              | Role                                              |
| ------------ | ----------------------- | ------------------------------------------------- |
| Frontend     | ReactJS + Vite          | UI rendering and state management                 |
| API Client   | Axios                   | Centralized HTTP requests, auth/device headers, and error normalization |
| Charts       | Recharts                | Owner/Manager dashboard and reporting visualizations |
| Backend      | Node.js + Express.js    | REST API, WebSocket server, webhook handler       |
| Database     | MySQL                   | Relational data storage                           |
| Auth         | JWT                     | Secure authentication and session management      |
| Real-Time    | WebSocket (ws / socket.io) | Cashier-specific payment confirmation push     |
| Kitchen Bot  | Telegram Bot API        | Order relay and cook acknowledgement system       |
| Product Media | ImageKit              | Browser-direct product photo uploads and delivery |

## System Boundaries

- `frontend/src/app/` — Application routing and route-protection composition.
- `frontend/src/features/` — Feature-owned UI grouped by business capability: authentication, cashier sales, catalog, management shell, payments, reports, staff, and stalls.
- `frontend/src/shared/layout/` — Cross-feature page shells and top-level layout components.
- `frontend/src/shared/theme/` — Persistent light/dark theme state and the shared theme toggle.
- `frontend/src/components/ui/` — Reusable, domain-neutral UI primitives such as buttons, forms, dialogs, badges, pagination, and loading states.
- `frontend/src/pages/` — Remaining route-level Cashier and Owner/Manager orchestration pages. The login route is owned by `features/auth/pages/`.
- `frontend/src/hooks/`, `services/`, and `utils/` — Shared state/data hooks, Axios/Socket.IO clients, and domain-neutral helpers used across features.
- `backend/src/routes/` — API route definitions and endpoint mapping.
- `backend/src/controllers/` — Request handling and response formatting.
- `backend/src/services/` — Core business logic, WebSocket session management, Telegram bot logic, and external provider coordination.
- `backend/src/repositories/` — Database queries and data access logic.
- `backend/src/services/telegram.service.js` — Telegram Bot API integration (order relay, cook callback).
- `backend/src/services/websocket.service.js` — WebSocket server; maps `cashier_id → socket` for isolated push.

### Frontend Dependency Direction

- Route entry points in `app/` compose pages and providers; they do not contain business logic.
- Feature components may import shared UI, hooks, services, utilities, and components from another feature only when the workflow genuinely crosses feature boundaries, such as reports opening the shared payment receipt.
- Shared layout and theme modules must remain domain-neutral and must not import cashier, catalog, staff, stall, or report business components.
- Feature files should not be moved back into the flat `components/` directory. New feature-specific UI belongs under the corresponding `features/<feature>/components/` folder.

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
- **Global/Server State**: Abstracted into custom hooks (e.g., `useProducts`, `useOrders`) which interface with the central Axios-backed API service.
- **Cart Management**: Cart state is managed globally or passed down from a parent POS container to ensure synchronization between the product grid and the order panel.
- **Authentication State**: Owned by `features/auth/`, including context, storage keys, login UI, and the login route page.
- **Theme State**: Owned by `shared/theme/`; the selected light/dark mode is persisted in browser storage and consumed through `useTheme`.

## Reporting Flow

- Owner/Manager sales reports use `GET /api/reports/sales` instead of frontend-only calculations.
- The backend applies same-business owner scope, date range filters, optional stall/cashier filters, and returns summary totals, payment mix, stall/cashier breakdowns, hourly revenue, and ledger rows.
- Preset and custom calendar ranges use the same backend report contract; custom ranges send validated `start_date` and `end_date` values.
- Dashboard hourly revenue and exported PDF totals/rows come from the backend report response. The frontend may still use loaded order details for receipt viewing or as a temporary display fallback while the report request loads.

## Current Payment Flow (Phase 4)

- Cashier checkout calls `POST /api/orders` with product IDs, quantities, optional notes, and payment method only.
- The backend derives `cashier_id` from the JWT and `stall_id` from the cashier's staff assignment.
- The backend loads product prices from MySQL, calculates trusted subtotal/total values, snapshots item names/prices, and creates the order as `pending_payment`.
- Cash confirmation uses `POST /api/orders/:id/confirm-cash`.
- Cash confirmation is allowed for the creating Cashier, or an Owner/Manager within the same business owner scope.
- Successful cash confirmation requires `cash_received_usd`, rejects underpayment, stores backend-calculated `change_due_usd`, changes `orders.status` to `paid`, sets `completed_at`, and writes a `cash_payment_confirmed` audit log.
- The frontend must not create paid orders locally or submit trusted fields such as totals, status, `cashier_id`, or `stall_id`.

## KHQR Individual Payment Flow (Phase 5)

- TouB POS uses Generate KHQR (Individual)
- Backend KHQR generation uses the `bakong-khqr` SDK.
- Cashier checkout calls `POST /api/orders` with safe item data and `paymentMethod = "khqr"`.
- The backend calculates trusted totals from MySQL and creates the order as `pending_payment`.
- The backend stores `qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at`.
- The frontend displays the backend QR payload and polls `POST /api/orders/:id/check-khqr-status` while the modal is open as a fallback.
- `BAKONG_ACCOUNT_ID` is required; KHQR generation must fail clearly instead of falling back to a placeholder account.
- The backend calls Bakong Open API `POST /v1/check_transaction_by_md5` with the stored `qr_md5`.
- `BAKONG_OPEN_API_TOKEN` is backend-only and must never be sent to the frontend.
- If Bakong reports payment success, the backend validates amount, currency, and configured destination account before marking the order `paid`.
- Already-paid status checks are idempotent and do not duplicate audit logs.
- A backend background checker scans unexpired `pending_payment` KHQR orders and uses the same Bakong validation path as the status-check endpoint.
- When either the status-check endpoint or background checker marks a KHQR order as `paid`, the backend emits a cashier-scoped `payment_confirmed` WebSocket event to the cashier who created that order and dispatches the paid order to the stall's Telegram kitchen channel.

## Real-Time & Kitchen Flow

- `websocket.service.js` initializes a Socket.IO server on the same HTTP server as Express.
- Cashier, Owner, and Manager sockets authenticate with the existing JWT. Platform Admin sockets are rejected because the temporary bootstrap role has no live POS UI.
- The service maintains strict socket maps by `cashier_id` and management `owner_id`. It emits `payment_confirmed` only to the cashier who created the paid order. No payment broadcast.
- Owner/Manager sockets receive `order_updated` for same-business order creation and payment status changes, then refresh order history from the backend.
- `khqr-background-checker.service.js` periodically checks unexpired pending KHQR orders through Bakong, using system audit metadata instead of pretending a cashier clicked the status-check button.
- KHQR-paid orders reuse the same `dispatchToTelegram` kitchen ticket flow as confirmed cash orders.
- Owner/Manager order history surfaces `telegram_tickets.status` and can retry missing or failed Telegram dispatches for paid orders in their business. Cashiers can retry only their own paid orders. Pending tickets are treated as in-progress and are not retryable; sent/done tickets are not resent.
- When Telegram dispatch finishes as `sent` or `failed`, the backend emits `kitchen_ticket_updated` so the UI does not stay stuck on the temporary `pending` state.
- When a cook taps "Done" in Telegram, the callback updates the ticket to `done` and emits `kitchen_ticket_updated` to the creating cashier and same-business Owner/Manager sockets so order-history UI can refresh without a page reload.
- The Telegram bot should post a structured ticket with inline "Done" button after paid order confirmation.
- Cook taps "Done" → Telegram sends a callback query → backend edits the message, persists the ticket as done, emits `kitchen_ticket_updated`, and must later validate cook authorization through a Telegram-only cook identity model before production.

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
- **Product**: Shared catalog item metadata with name, owner-scoped category, image, and default USD/KHR prices. A product may remain in the management catalog with zero stall assignments; its default price is retained for later reassignment while it stays unavailable to cashiers.
- **StallProduct**: Junction that maps a `Product` to a `Stall` and stores that stall's `price_usd`, `price_khr`, and visibility.
- **Order**: A transaction. Belongs to a `User` (cashier) and a `Stall`. Has payment method, status, totals, KHQR metadata when relevant, and cash received/change fields when cash is confirmed.
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
| 2 | **WebSocket routing — accidental broadcast to wrong cashier** | 🔴 High | `websocket.service.js` authenticates cashier sockets with JWT, keeps a strict `Map<cashier_id, socketIds>`, and emits only to the mapped cashier sockets. Continue to avoid broad `io.emit()` payment broadcasts. |
| 3 | **Telegram Bot async failures** | 🟡 Medium | Telegram failure must never block or rollback the order. Strategy: (1) Always log the error. (2) Store Telegram dispatch state in `telegram_tickets.status` (`pending` / `sent` / `failed` / `done`) instead of mutating payment state on `orders`. (3) Emit live ticket updates when dispatch finishes. (4) Show status in the management ledger, allow Owner/Manager retry for business orders, and allow Cashier retry for their own missing/failed tickets. Pending tickets are in-progress and are not retryable. Auto-retry queue is out of scope (Future). |
| 4 | **KHR exchange rate — hardcoded vs. live** | 🟡 Medium | Decision required before building the product form. Recommend: hardcode the rate as a `.env` constant (`KHR_RATE=4100`) for now. Add a note in the admin panel showing the current rate. Live rate API is out of scope. |
| 5 | **Stall data isolation — cross-stall data leak** | 🔴 High | Every query that returns cashier-facing products, orders, or staff must scope by the authenticated user and their backend stall assignment. Never trust a client-supplied stall ID for cashier access. |
| 6 | **Legacy localStorage fallback regression** | 🟡 Medium | Products, categories, stalls, users, and orders are now backend-owned. Future UI work must not reintroduce localStorage as the source of truth for persisted POS data; localStorage should remain limited to auth/session/device-style browser state. |
| 7 | **Webhook duplicate events** | 🔴 High | Bakong/ABA may retry the same webhook multiple times (network timeouts). Processing it twice marks an order paid twice or creates duplicate records. Mitigation: at the start of the webhook handler, check `if order.status === 'paid' → return 200 immediately` (idempotency guard) before any DB write. |
| 8 | **QR amount mismatch** | 🔴 High | A webhook may arrive for the wrong amount or wrong merchant. Never auto-confirm just because a payment event arrived. Webhook handler must assert `webhook.amount === order.total_usd` and `webhook.merchant_id === env.MERCHANT_ID` before marking the order paid. Reject mismatches with a `400` and log them. |
| 9 | **JWT expiry mid-shift** | 🟡 Medium | Cashier's 8h token can expire while they are mid-order. The next API call returns `401`, the cart is lost, and the cashier is confused. Mitigation: frontend must intercept all `401` responses, store the current cart in `sessionStorage`, redirect to PIN re-entry, and restore the cart after re-authentication. |
| 10 | **Device token revocation** | 🟡 Medium | No current mechanism to remotely deregister a terminal (e.g., stolen tablet). The device token in `stalls.device_token` remains valid indefinitely. Mitigation: management portal must include an Owner-controlled "Revoke Terminal" action that clears `stalls.device_token = NULL`, immediately invalidating that device's access. |
| 11 | **Future platform admin data access** | 🔴 High | The current `platform_admin` role is limited to owner bootstrap only. If TouB POS becomes a multi-customer SaaS product, expand it with tenant isolation, support-session auditing, and least-privilege access before enabling any broader cross-customer administration. |

