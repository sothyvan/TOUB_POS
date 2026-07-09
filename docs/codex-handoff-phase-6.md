# Phase 6 Handoff: KDS, Telegram Kitchen, Live Payment, And UI Refresh Stabilization

## 1. What Phase 6 Implemented

Phase 6 made TouB POS behave like a real live POS instead of a static order recorder.

The main work completed:

- Paid cash orders are sent to the Telegram kitchen chat.
- Paid KHQR orders are sent to the Telegram kitchen chat after Bakong payment verification.
- Cashier KHQR payment confirmation can arrive through WebSocket.
- Owner/Manager order history refreshes when same-business orders are created or paid.
- Cashier and Owner/Manager screens refresh when Telegram ticket status changes.
- Telegram "Mark as Done" updates the database and the application UI.
- Failed or missing Telegram tickets can be retried safely.
- Owner/Manager users have an Operations Watch panel for payment/kitchen issues.
- Cashier users can close and resume pending KHQR QR screens.
- KHQR checkout now has a confirmation step before creating the backend order.
- Backend-backed UI screens now have an auto-refresh fallback on focus, tab visibility, and quiet intervals.

This phase connects payment, kitchen, and UI status into one working operational flow.

## 2. Final Role And Permission Policy

TouB POS currently uses these active roles:

| Role | Meaning |
|------|---------|
| `platform_admin` | Temporary TouB POS team bootstrap role for creating customer Owner accounts. API-only for now. |
| `owner` | Customer business owner with full business control. |
| `manager` | Operational supervisor who can manage day-to-day POS data and cashier users. |
| `cashier` | Frontline POS staff assigned to one stall. |

Important permissions:

- Owner and Manager can access the management portal.
- Cashier can access only the cashier workspace.
- Cashier data remains stall-scoped.
- KHQR payment confirmation is sent only to the cashier who created that order.
- Owner/Manager order events are scoped to the same business owner.
- Platform Admin is not part of live POS/KDS operations.

## 3. Backend Flow

### Order To Kitchen Flow

1. Cashier creates an order.
2. Cash payment is explicitly confirmed, or KHQR payment is verified by Bakong.
3. Backend marks the order as `paid`.
4. Backend writes audit/payment state.
5. Backend emits live UI events.
6. Backend dispatches the paid order to Telegram.
7. Telegram ticket status is stored in `telegram_tickets`.
8. Cook taps "Mark as Done" in Telegram.
9. Backend updates the ticket to `done`.
10. Cashier and Owner/Manager UIs refresh.

### WebSocket Events

`backend/src/services/websocket.service.js` initializes Socket.IO beside the Express HTTP server.

It emits:

| Event | Receiver | Purpose |
|-------|----------|---------|
| `payment_confirmed` | Creating cashier only | Notify cashier that KHQR payment was verified. |
| `order_updated` | Same-business Owner/Manager | Refresh management order history. |
| `kitchen_ticket_updated` | Creating cashier and same-business Owner/Manager | Refresh Telegram ticket status. |

### KHQR Status Checking

KHQR status can update from:

- Frontend QR modal polling.
- Backend background checker.
- Manual status-check endpoint.

When Bakong confirms payment, the backend validates:

- Amount.
- Currency.
- Destination account.
- Order status/idempotency.

Then it marks the order as paid, emits live events, and sends the kitchen ticket.

### Telegram Ticket Status

Telegram ticket state is separate from order payment state:

| Status | Meaning |
|--------|---------|
| `pending` | Dispatch is in progress. Do not retry yet. |
| `sent` | Telegram accepted the ticket. |
| `failed` | Dispatch failed and can be retried. |
| `done` | Cook marked the ticket done in Telegram. |

This separation matters because a paid order must stay paid even if Telegram temporarily fails.

## 4. Frontend Flow

### Cashier Flow

Important files:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/components/KhqrPaymentModal.jsx`
- `frontend/src/services/socketClient.js`
- `frontend/src/hooks/useOrders.js`

Cashier behavior:

- Cashier connects to Socket.IO after login.
- Cashier receives KHQR `payment_confirmed` only for their own order.
- Cashier receives `kitchen_ticket_updated` for their own orders.
- The exact changed order is refreshed from the backend.
- Kitchen retry appears only for recoverable states such as failed or missing tickets.
- Pending Telegram tickets are treated as in-progress, not retryable.
- KHQR checkout now asks for confirmation before creating the backend order.
- Closing a KHQR modal keeps the backend order as `pending_payment`.
- Resume QR reloads the latest order before reopening the QR.

### Owner / Manager Flow

Important files:

- `frontend/src/pages/OwnerPortalPage.jsx`
- `frontend/src/components/OrderHistory.jsx`
- `frontend/src/services/socketClient.js`

Owner/Manager behavior:

- Owner/Manager connects to management Socket.IO after login.
- Order history refreshes when same-business orders are created or paid.
- Telegram ticket status refreshes when dispatch finishes or cook marks done.
- Operations Watch highlights:
  - KHQR waiting orders.
  - Kitchen waiting/in-progress tickets.
  - Failed or missing Telegram tickets.
- Owner/Manager can retry failed/missing Telegram tickets for same-business paid orders.

### Auto-Refresh Fallback

Important new file:

- `frontend/src/hooks/useAutoRefresh.js`

This hook refreshes backend-owned data when:

- The browser tab regains focus.
- The tab becomes visible again.
- A quiet interval passes.

It is wired into:

- Products/categories.
- Orders.
- Staff users.
- Stall lists.
- Stall assignments.
- Cashier assigned-stall lookup.
- Cashier login roster.

This is a fallback, not a replacement for WebSocket. WebSocket is still the fast live path for orders, payment, and kitchen tickets.

## 5. Files Changed

### Backend

| File | Purpose |
|------|---------|
| `backend/package.json` / `backend/package-lock.json` | Socket.IO and related dependencies. |
| `backend/src/server.js` | Starts HTTP server, initializes Socket.IO, starts background KHQR checking. |
| `backend/src/config/env.js` | Environment validation for Bakong, Telegram, tunnel, and startup settings. |
| `backend/src/services/websocket.service.js` | Authenticated live event routing for cashier and management users. |
| `backend/src/services/khqr-background-checker.service.js` | Background checking for pending KHQR orders. |
| `backend/src/services/order.service.js` | Paid-order transitions, Telegram dispatch, retry, live events, KHQR status flow. |
| `backend/src/services/telegram.service.js` | Telegram ticket send/edit/status handling and idempotency. |
| `backend/src/controllers/telegram.controller.js` | Telegram callback handling for "Mark as Done". |
| `backend/src/controllers/order.controller.js` | Order status, retry, and KHQR response behavior. |
| `backend/src/routes/order.routes.js` | Protected order status/retry endpoints. |
| `backend/src/config/swagger.js` | API documentation updates. |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/package.json` / `frontend/package-lock.json` | Socket.IO client dependency. |
| `frontend/src/services/socketClient.js` | Shared cashier/management Socket.IO client. |
| `frontend/src/services/api.js` | Maps Telegram ticket fields and exposes order retry/status APIs. |
| `frontend/src/pages/CashierPage.jsx` | Cashier live payment/ticket handling, QR resume, KHQR confirmation, assigned-stall refresh. |
| `frontend/src/pages/OwnerPortalPage.jsx` | Management socket connection and live order refresh. |
| `frontend/src/components/CashierScreen.jsx` | Cashier order status, kitchen retry, Resume QR behavior. |
| `frontend/src/components/KhqrPaymentModal.jsx` | Safe "Close QR" wording and pending-payment behavior. |
| `frontend/src/components/OrderHistory.jsx` | Operations Watch, exact alert filters, Telegram status/retry display. |
| `frontend/src/components/MenuCatalog.jsx` | Backend-backed stall list refresh for menu assignment filters. |
| `frontend/src/components/StallOwner.jsx` | Backend-backed stall/staff assignment refresh. |
| `frontend/src/components/UserOwner.jsx` | Backend-backed stall assignment refresh for staff screens. |
| `frontend/src/hooks/useAutoRefresh.js` | Shared focus/visibility/interval refresh fallback. |
| `frontend/src/hooks/useOrders.js` | Order auto-refresh fallback. |
| `frontend/src/hooks/useProducts.js` | Product/category auto-refresh fallback. |
| `frontend/src/hooks/useUsers.js` | Staff auto-refresh fallback. |
| `frontend/src/pages/LoginPage.jsx` | Cashier roster refresh for registered terminals. |

### Docs / Context

| File | Purpose |
|------|---------|
| `context/architecture.md` | Documents live payment, Telegram, KHQR, and data ownership architecture. |
| `context/progress-tracker.md` | Tracks Phase 6 and post-Phase 6 stabilization completion. |
| `docs/api/endpoints.md` | API and endpoint behavior for KHQR/status/retry where updated. |
| `docs/design/payment-flow.md` | Payment and kitchen flow behavior where updated. |
| `docs/phase-5-khqr-payment-flow.md` | KHQR flow notes that remain relevant to Phase 6. |

## 6. Verification Results

Latest command checks:

```bash
cd backend
npm run lint
```

Result:

- Passed with `0` errors.
- Existing warnings remain, mostly `no-console` and `require-await`.

```bash
cd frontend
npm run lint
```

Result:

- Passed with `0` errors.

```bash
cd frontend
npm run build
```

Result:

- Passed.
- Vite production build completed successfully.

Manual testing completed by the team/user:

- Cash order can be paid.
- Cash order sends a Telegram kitchen ticket.
- KHQR order can be created after confirmation.
- KHQR payment can be verified.
- Paid KHQR order sends a Telegram kitchen ticket.
- Telegram "Mark as Done" updates the app UI.
- Owner/Manager screens show new/updated order state without manual page refresh.
- Cashier screen shows updated order/ticket state without manual page refresh.
- KHQR waiting filter only shows pending KHQR orders.
- Kitchen waiting count reflects payment/kitchen state.
- Closing QR does not cancel the backend order.
- Resume QR works for pending KHQR orders.
- Accidental KHQR checkout is prevented by a confirmation dialog.

## 7. Manual Test Checklist For Teammates

Use this checklist before pushing, presenting, or merging:

- Start backend with valid `.env`.
- Start frontend.
- Confirm backend logs show Socket.IO server startup.
- Confirm Telegram webhook/tunnel setup is active if testing kitchen callbacks.
- Login as Owner or Manager.
- Register a cashier terminal to a stall if needed.
- Login as Cashier with PIN.
- Create a cash order.
- Enter cash received and confirm payment.
- Confirm change is calculated correctly.
- Confirm Telegram kitchen chat receives the ticket.
- Tap "Mark as Done" in Telegram.
- Confirm Cashier UI updates to done.
- Confirm Owner/Manager UI updates to done.
- Create a KHQR order.
- Confirm the pre-checkout dialog appears before QR creation.
- Create the QR.
- Close the QR.
- Resume the QR from My Orders.
- Pay the KHQR before expiry.
- Confirm the order becomes paid.
- Confirm Telegram receives the KHQR order ticket.
- Confirm Operations Watch shows only true waiting/problem orders.
- Try retrying a failed/missing Telegram ticket.
- Confirm sent/done tickets are not duplicated.
- Confirm another cashier does not receive this cashier's KHQR confirmation.

## 8. Remaining Risks / TODOs

These are not blockers for the current demo flow:

- Telegram cook authorization still needs a stronger Telegram-only identity model before production.
- KHQR background checker is process-local. A production deployment with multiple backend instances should move this to one worker/queue.
- Telegram has manual retry but no automatic retry queue.
- Backend lint still reports existing warning-level console/require-await issues.
- Cashier JWT expiry mid-shift can still interrupt active work.
- Device token revocation is still a future Owner/Manager safety feature.
- Auto-refresh fallback is interval/focus based. For instant updates on products, stalls, and users, add Socket.IO CRUD events later.

## 9. Recommendation For Next Phase

Phase 6 and the post-Phase 6 stabilization work are ready to hand off.

Recommended next phase:

1. Final demo polish and documentation cleanup.
2. Reporting/dashboard hardening for Owner/Manager.
3. Telegram cook authorization model.
4. Optional automatic retry worker for Telegram failures.
5. Optional terminal/device revocation.

Team chat summary:

> Phase 6 is complete and tested. TouB POS now supports backend-owned paid orders flowing to Telegram kitchen tickets, KHQR payment verification, cashier-specific WebSocket payment confirmation, Owner/Manager live order refresh, Telegram "Done" UI refresh, Operations Watch, safe KHQR close/resume, KHQR pre-checkout confirmation, and backend-backed UI auto-refresh fallback. Lint/build checks pass; backend lint has warnings only. Next recommended work is demo polish, reports, and Telegram cook authorization hardening.
