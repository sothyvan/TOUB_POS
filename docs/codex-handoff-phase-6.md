# Phase 6 Handoff: KDS, Telegram Kitchen, And Live Payment WebSocket Integration

## 1. What Phase 6 Implemented

Phase 6 connected the real paid-order flow to live kitchen and UI updates.

The main result is:

- Cash and KHQR paid orders can dispatch Telegram kitchen tickets.
- Cashier KHQR payment confirmation can arrive through WebSocket instead of relying only on polling.
- Owner/Manager order history refreshes when new orders or paid orders happen.
- Cashier and Owner/Manager screens refresh when Telegram ticket status changes.
- Telegram "Mark as Done" updates the database and refreshes the app UI without a manual browser refresh.
- Missing or failed Telegram tickets can be retried safely.

This means the paid-order flow now behaves like a real POS kitchen handoff instead of a static receipt screen.

## 2. Final Phase 6 Behavior

The happy path is:

1. Cashier creates an order.
2. Cashier pays by cash, or KHQR payment is verified by Bakong status checking.
3. Backend marks the order as `paid`.
4. Backend emits live UI events.
5. Backend dispatches the paid order to the stall's Telegram kitchen chat.
6. Telegram ticket is stored in `telegram_tickets`.
7. Cook taps "Mark as Done" in Telegram.
8. Backend updates the ticket to `done`.
9. Cashier and Owner/Manager order screens refresh automatically.

Important rule:

- Telegram failures must never roll back or break a paid order.
- Ticket status is tracked separately from payment status.

## 3. Backend Flow

### WebSocket Server

`backend/src/services/websocket.service.js` initializes Socket.IO beside the Express HTTP server.

It authenticates sockets using the existing JWT and maps users safely:

- Cashier sockets are mapped by `cashier_id`.
- Owner/Manager sockets are mapped by business `owner_id`.
- `platform_admin` is rejected because it has no live POS UI.

The backend emits:

| Event | Receiver | Purpose |
|-------|----------|---------|
| `payment_confirmed` | Creating cashier only | Notify cashier that KHQR payment was verified |
| `order_updated` | Same-business Owner/Manager | Refresh management order history |
| `kitchen_ticket_updated` | Creating cashier and same-business Owner/Manager | Refresh Telegram ticket status |

### KHQR Status Checking

`backend/src/services/order.service.js` handles Bakong KHQR status checks.

When Bakong confirms payment:

- Backend validates amount, currency, and destination account.
- Order status becomes `paid`.
- Audit log is written.
- `payment_confirmed` is emitted to the creating cashier.
- Paid order is dispatched to Telegram.

`backend/src/services/khqr-background-checker.service.js` also scans unexpired `pending_payment` KHQR orders so payment detection does not depend only on the frontend modal staying open.

### Telegram Dispatch

`backend/src/services/telegram.service.js` sends the paid order to Telegram.

It creates a `telegram_tickets` row and tracks:

- `pending` while sending
- `sent` after Telegram accepts the message
- `failed` if sending fails
- `done` after cook taps "Mark as Done"

Dispatch is idempotent:

- Existing `sent` or `done` tickets are not resent.
- Existing `pending` tickets are treated as in-progress.
- Failed or missing tickets can be retried.

### Telegram Done Callback

`backend/src/controllers/telegram.controller.js` handles Telegram callback queries.

When cook taps "Mark as Done":

- Backend finds the matching ticket.
- Backend edits the Telegram message.
- Backend removes the inline button.
- Ticket status changes to `done`.
- `kitchen_ticket_updated` is emitted to live app screens.

## 4. Frontend Flow

### Cashier

Important files:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/services/socketClient.js`
- `frontend/src/services/api.js`

Cashier behavior:

- Connects to Socket.IO after cashier login.
- Receives `payment_confirmed` for their own KHQR orders only.
- Receives `kitchen_ticket_updated` for their own orders.
- Refreshes the exact changed order, not only the list.
- Shows kitchen issue/retry only for recoverable ticket states: `failed` or `not_sent`.
- Does not allow retry for `pending`, because that means the first dispatch is still running.

### Owner / Manager

Important files:

- `frontend/src/pages/OwnerPortalPage.jsx`
- `frontend/src/components/OrderHistory.jsx`
- `frontend/src/services/socketClient.js`

Owner/Manager behavior:

- Connects to management socket.
- Receives `order_updated` when same-business orders are created or paid.
- Receives `kitchen_ticket_updated` when Telegram ticket status changes.
- Can retry failed or missing Telegram tickets for same-business paid orders.
- Does not see or retry unrelated customer-business orders.

## 5. Files Changed

### Backend

| File | Why it changed |
|------|----------------|
| `backend/package.json` / `backend/package-lock.json` | Added Socket.IO and supporting dependencies used by live events. |
| `backend/src/server.js` | Starts Express through an HTTP server, initializes Socket.IO, and starts the KHQR background checker. |
| `backend/src/config/env.js` | Centralizes environment validation and Phase 6 environment expectations. |
| `backend/src/services/websocket.service.js` | New live event service for cashier-specific and management-scoped Socket.IO events. |
| `backend/src/services/khqr-background-checker.service.js` | New background checker for unexpired pending KHQR orders. |
| `backend/src/services/order.service.js` | Emits live events, dispatches paid orders to Telegram, supports KHQR status flow, and retries Telegram dispatch safely. |
| `backend/src/services/telegram.service.js` | Sends Telegram tickets, tracks status, handles idempotency, and emits ticket updates. |
| `backend/src/controllers/telegram.controller.js` | Handles Telegram "Done" callbacks and emits live ticket updates. |
| `backend/src/controllers/order.controller.js` | Exposes retry and status-check behavior through clean controller responses. |
| `backend/src/routes/order.routes.js` | Adds protected KHQR status and Telegram retry routes. |
| `backend/src/config/swagger.js` | Documents Phase 6 API behavior. |

### Frontend

| File | Why it changed |
|------|----------------|
| `frontend/package.json` / `frontend/package-lock.json` | Added Socket.IO client dependency. |
| `frontend/src/services/socketClient.js` | New shared Socket.IO client for cashier and management live events. |
| `frontend/src/services/api.js` | Maps Telegram ticket status and exposes retry/status endpoints. |
| `frontend/src/pages/CashierPage.jsx` | Connects cashier socket, handles KHQR live confirmation, refreshes ticket state, and supports retry. |
| `frontend/src/pages/OwnerPortalPage.jsx` | Connects management socket and refreshes order history from live events. |
| `frontend/src/components/CashierScreen.jsx` | Shows cashier-side kitchen ticket issue state and retry action. |
| `frontend/src/components/OrderHistory.jsx` | Shows management-side Telegram ticket status and retry action. |
| `frontend/src/components/OwnerWorkspace.jsx` | Passes retry behavior into the management order view. |
| `frontend/src/components/MenuCatalog.jsx` | Minor readiness cleanup so frontend lint/build stays green. |

### Docs / Config

| File | Why it changed |
|------|----------------|
| `backend/.env.example` | Documents Phase 6 environment variables for Bakong, Telegram, Socket.IO, and development seed behavior. |
| `backend/README.md` | Explains backend startup and Phase 6 operational setup. |
| `docs/api/endpoints.md` | Documents KHQR status, Telegram retry, and WebSocket events. |
| `docs/design/payment-flow.md` | Updates payment/kitchen flow behavior. |
| `docs/phase-5-khqr-payment-flow.md` | Keeps KHQR flow aligned with Phase 6 status checking and Telegram dispatch. |
| `docs/setup/getting-started.md` | Documents local setup expectations. |
| `context/architecture.md` | Updates real-time and kitchen architecture. |
| `context/progress-tracker.md` | Tracks Phase 6 completion and next work. |

## 6. Verification Results

Commands run:

```bash
cd backend
npm run lint
```

Result:

- Passed with `0` errors.
- Existing warnings remain: `67` warnings from `no-console` and `require-await`.

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
- Vite built successfully.

Manual verification reported during implementation:

- Paid cash order can dispatch to Telegram.
- Paid KHQR order can dispatch to Telegram.
- Telegram "Mark as Done" updates app UI without manual refresh.
- Owner/Manager order history shows new orders without manual refresh.
- Cashier order history updates ticket status without manual refresh.
- Retry is no longer shown for `pending` tickets.
- Retry is available for missing or failed tickets.

## 7. Manual Test Checklist

Use this checklist before pushing or demoing Phase 6:

- Start backend with valid `.env`.
- Start frontend.
- Confirm backend logs show WebSocket server and KHQR background checker startup.
- Login as cashier.
- Create a cash order.
- Confirm cash payment.
- Confirm Telegram kitchen chat receives a ticket.
- Confirm cashier "My Orders" updates without refresh.
- Tap "Mark as Done" in Telegram.
- Confirm cashier UI updates to done without refresh.
- Login as Owner or Manager.
- Create another order as cashier.
- Confirm Owner/Manager order history updates without refresh.
- Try retrying a failed/missing kitchen ticket.
- Confirm `pending` tickets cannot be retried.
- Confirm sent/done tickets are not duplicated.
- Confirm KHQR payment receives cashier-specific live confirmation.
- Confirm another cashier does not receive that KHQR confirmation.

## 8. Remaining Risks

These are not blockers for the current final-project flow, but they matter before production:

- Telegram cook authorization is still not a full identity model. Cook remains Telegram-only, but the system should later verify allowed cook accounts or groups more strictly.
- KHQR background checker is process-local. In production with multiple backend instances, move it to a single worker or queue to avoid duplicate provider calls.
- Telegram dispatch has manual retry but no automatic retry queue.
- Console logging is still used in operational backend paths; lint allows the build to pass but warns about it.
- Cashier JWT expiry mid-shift can still interrupt work if the token expires during an active cart.
- Device token revocation is documented as future work.

## 9. Recommendation For Next Phase

The team can treat Phase 6 as complete.

Recommended next work:

1. Add operational monitoring for failed Bakong or Telegram operations.
2. Strengthen Telegram cook identity/authorization.
3. Add a clearer Owner/Manager alert center for failed kitchen tickets or payment-check failures.
4. Decide whether to add an automatic Telegram retry worker.
5. Prepare a clean commit and push after teammates review the changed file list.

Team chat summary:

> Phase 6 is complete. TouB POS now has live cashier WebSocket payment confirmation, backend KHQR status checking, Telegram kitchen ticket dispatch, Telegram "Done" callbacks, ticket retry for failed/missing tickets, and automatic UI refresh for Cashier and Owner/Manager order history. Lint/build checks pass; backend lint has warnings only. Next recommended work is payment/kitchen monitoring and Telegram cook authorization hardening.
