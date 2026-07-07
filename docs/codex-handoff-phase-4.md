# Phase 4 Handoff: Backend-Owned Orders and Cash Confirmation

## 1. What Phase 4 Implemented

Phase 4 made TouB POS orders backend-owned.

Before this phase, the cashier UI could behave like it was creating a receipt from frontend cart data. That is useful for prototyping, but it is not safe enough for a real POS. Browser data can be changed, so the frontend must not be trusted to decide prices, totals, cashier ID, stall ID, or payment status.

Phase 4 changed the flow so:

- Cashiers still build a cart in the frontend.
- Checkout now calls the backend `POST /api/orders`.
- The frontend sends only product IDs, quantities, optional notes, and payment method.
- The backend calculates trusted prices and totals from MySQL.
- The backend derives the cashier from the JWT.
- The backend derives the stall from the cashier's staff assignment.
- Order items snapshot product names and prices at the time of sale.
- Order history loads from the backend.
- Cash payment confirmation is performed by the backend.
- Audit logs are stored in MySQL for order creation and cash confirmation.

In short: the frontend asks for an order, but the backend decides what the order really is.

## 2. Final RBAC Policy

TouB POS now officially uses three web-app roles:

| Role | Meaning | Main Permission |
|------|---------|-----------------|
| `owner` | Full system owner | Full management access |
| `manager` | Operational supervisor | Manage daily operations and cashiers |
| `cashier` | Frontline POS staff | Sell products from assigned stall |

Cash payment confirmation is allowed for:

- the cashier who created the order
- `owner`
- `manager`

Important rule:

- A cashier cannot confirm another cashier's order.
- A manager can confirm cash payment, but still cannot bypass unrelated owner-only actions such as creating Owner or Manager accounts.

## 3. Backend Order Flow

The main backend order route is:

```http
POST /api/orders
```

Only `cashier` users can create orders.

The frontend request should contain only safe fields:

```json
{
  "paymentMethod": "cash",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "notes": "No sugar"
    }
  ]
}
```

The backend rejects trusted fields if the frontend tries to send them, such as:

- `total`
- `subtotal`
- `stall_id`
- `cashier_id`
- `status`
- `paid`
- item prices
- line totals

Backend order creation does this:

1. Reads cashier ID from `req.user.id`.
2. Finds the cashier's assigned stall in `stall_staff`.
3. Loads each product from MySQL.
4. Checks that each product exists.
5. Checks that each product belongs to the cashier's assigned stall.
6. Checks that each product is visible.
7. Checks that quantity is a positive integer.
8. Calculates line totals, subtotal, and total.
9. Creates an `orders` row with status `pending_payment`.
10. Creates `order_items` rows with snapshot name and price data.
11. Writes an `order_created` audit log.
12. Returns the saved order with its items.

The important files are:

- `backend/src/routes/order.routes.js`
- `backend/src/controllers/order.controller.js`
- `backend/src/services/order.service.js`
- `backend/src/models/order.model.js`
- `backend/src/models/order-item.model.js`
- `backend/src/models/audit-log.model.js`

## 4. Frontend Checkout Flow

The cashier cart can still live temporarily in frontend state while the cashier is choosing products. That is okay because the cart is not the final saved order.

The checkout flow is now:

1. Cashier adds products to cart.
2. Cashier clicks a payment method.
3. For cash, the cash confirmation modal opens first.
4. After confirmation, frontend calls `api.orders.create()`.
5. For cash orders, frontend then calls `api.orders.confirmCash()`.
6. The receipt modal uses the backend response.
7. The cart clears only after successful backend checkout.
8. My Orders reloads from the backend.

The important frontend files are:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/hooks/useOrders.js`
- `frontend/src/services/api.js`
- `frontend/src/components/CashConfirmationModal.jsx`
- `frontend/src/components/ReceiptModal.jsx`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/components/OrderHistory.jsx`

The frontend still calculates display totals while the cashier is building a cart, but those totals are only previews. The backend total is the trusted total.

## 5. Cash Confirmation Flow

Cash confirmation is now backend-owned.

The endpoint is:

```http
POST /api/orders/:id/confirm-cash
```

Allowed users:

- `owner`
- `manager`
- the `cashier` who created the order

Backend checks:

- Order exists.
- Actor is allowed to confirm this order.
- Order payment method is `cash`.
- Order is not already `paid`.
- Order is not `cancelled`.
- Order status is currently `pending_payment`.

If all checks pass:

- order status becomes `paid`
- `completed_at` is set
- a `cash_payment_confirmed` audit log is created

Expected status flow for cash:

```text
pending_payment -> paid
```

The same order cannot be confirmed twice.

## 6. Audit Log Behavior

Phase 4 added a simple database-backed audit log feature.

Audit logs are stored in:

```text
audit_logs
```

The Sequelize model is:

```text
backend/src/models/audit-log.model.js
```

Logged actions:

- `order_created`
- `cash_payment_confirmed`
- `order_cancelled` is defined for future cancellation support

Audit log fields:

- `actor_user_id`
- `action`
- `order_id`
- `details`
- `created_at`

Examples:

- When a cashier creates an order, the backend logs `order_created`.
- When cash is confirmed, the backend logs `cash_payment_confirmed`.
- The details JSON stores useful context such as payment method, stall ID, total, and confirmer role.

This is useful for security and debugging because the team can later answer questions like:

- Who created this order?
- Who confirmed this cash payment?
- What stall was involved?
- What was the order total at the time?

## 7. Files Changed

### Backend

`backend/src/routes/order.routes.js`

- Added protected order routes.
- `POST /api/orders` is cashier-only.
- `POST /api/orders/:id/confirm-cash` allows owner, manager, and cashier, with final permission checks in the service.
- `GET /api/orders/mine` is cashier-only.
- `GET /api/orders` is owner/manager-only.

`backend/src/controllers/order.controller.js`

- Rejects trusted fields from order creation requests.
- Reads cashier ID from authenticated JWT user.
- Calls the order service for creation, cash confirmation, and history.

`backend/src/services/order.service.js`

- Owns the core Phase 4 business rules.
- Resolves cashier stall assignment.
- Validates product visibility and stall ownership.
- Calculates totals from database product prices.
- Snapshots order item names/prices.
- Creates audit logs.
- Confirms cash payments safely.

`backend/src/models/order.model.js`

- Defines backend order fields.
- Uses statuses `pending_payment`, `paid`, and `cancelled`.
- Stores payment method, cashier, stall, totals, QR payload, and completed timestamp.

`backend/src/models/order-item.model.js`

- Stores order item snapshots.
- Keeps product name, price, quantity, line total, and notes at sale time.

`backend/src/models/audit-log.model.js`

- Adds audit log storage for important order/payment actions.

`backend/src/models/index.js`

- Registers the new audit log model and order associations.

`backend/src/controllers/webhook.controller.js`

- KHQR payment verification is handled by the backend-owned Bakong status-check flow in Phase 5.

`backend/src/services/payment.service.js`

- Payment behavior was kept out of fake success mode for Phase 4.

`backend/src/controllers/report.controller.js`

- Updated to work with the new order status vocabulary.

`backend/src/server.js`

- Includes development compatibility handling for old order status values.

### Frontend

`frontend/src/services/api.js`

- Added order API functions for create, confirm cash, and history.
- Maps backend order responses into frontend receipt/history objects.
- Removed stale unused localStorage order storage key.

`frontend/src/hooks/useOrders.js`

- Loads order history from the backend.
- Creates orders through the backend.
- Confirms cash orders through the backend.
- Tracks checkout loading and error state.

`frontend/src/pages/CashierPage.jsx`

- Connects cashier checkout UI to backend order creation.
- Opens cash confirmation before creating/confirming cash orders.
- Shows receipt data from backend response.

`frontend/src/components/CashConfirmationModal.jsx`

- Wording now clearly says the backend will mark the order as paid.

`frontend/src/components/ReceiptModal.jsx`

- Displays paid vs pending payment state from backend order status.

`frontend/src/components/CashierScreen.jsx`

- Shows backend order history in My Orders.

`frontend/src/components/OrderHistory.jsx`

- Uses backend-owned orders for management order history.

`frontend/src/components/KhqrPaymentModal.jsx`

- Displays pending KHQR order information without implementing real webhook success.

`frontend/src/components/OrderPanel.jsx`

- Checkout actions connect to backend-backed order flow.

`frontend/src/pages/OwnerPortalPage.jsx`

- Management order history uses backend order data.

### Documentation and Database References

`docs/database/schema.sql`

- Added/updated order, order item, audit log, and status definitions.

`docs/database/queries.sql`

- Added raw SQL equivalents for Phase 4 order and audit log behavior.

`docs/api/endpoints.md`

- Documents order creation, cash confirmation, and order history endpoints.

`docs/api/auth-flow.md`

- Documents the current owner/manager/cashier role model.

`docs/ToubPOS-Implementation-Plan.md`

- Updated Phase 4 plan and final RBAC wording.

`context/project-overview.md`

- Updated project behavior around paid orders and management roles.

`context/architecture.md`

- Updated backend-owned order and audit log architecture notes.

`context/progress-tracker.md`

- Marked Phase 4 as complete and Phase 5 as next.

## 8. Verification Results

Backend lint:

```bash
cd backend
npm run lint
```

Result:

- Passed.
- Existing warnings remain, mostly `no-console` and `require-await`.

Frontend lint:

```bash
cd frontend
npm run lint
```

Result:

- Passed.

Frontend build:

```bash
cd frontend
npm run build
```

Result:

- Passed.
- Vite production build completed successfully.

Targeted cleanup checks also confirmed:

- Active backend cash confirmation logic allows owner, manager, and the creating cashier.
- Stale localStorage order constants were removed from active frontend API code.
- Active API/context docs now use the official owner/manager/cashier policy.

## 9. Manual Test Checklist

Use this checklist before moving into the next phase.

### Setup

- [ ] Start MySQL.
- [ ] Start backend from `backend/`.
- [ ] Start frontend from `frontend/`.
- [ ] Make sure there is an Owner account.
- [ ] Create at least one Manager.
- [ ] Create at least one Cashier.
- [ ] Create a stall.
- [ ] Assign the Cashier to that stall.
- [ ] Create visible products for that stall.

### Cashier Order Creation

- [ ] Log in as Cashier.
- [ ] Add assigned-stall visible products to cart.
- [ ] Click Cash.
- [ ] Confirm the cash modal.
- [ ] Confirm a receipt appears.
- [ ] Confirm receipt status is `paid`.
- [ ] Confirm cart clears after success.
- [ ] Refresh the page.
- [ ] Confirm the order still appears in My Orders.

### Backend Calculation

- [ ] Try sending a fake `total` in the order request body.
- [ ] Expected: backend rejects the request.
- [ ] Try sending a fake `cashier_id` or `stall_id`.
- [ ] Expected: backend rejects the request.
- [ ] Change product price in database/admin UI.
- [ ] Create a new order.
- [ ] Expected: backend uses the latest database price.

### Validation

- [ ] Try quantity `0`.
- [ ] Expected: `400`.
- [ ] Try quantity `-1`.
- [ ] Expected: `400`.
- [ ] Try product ID from another stall.
- [ ] Expected: `403`.
- [ ] Try hidden product.
- [ ] Expected: `400`.
- [ ] Try checkout as a cashier with no stall assignment.
- [ ] Expected: `403`.

### Cash Confirmation

- [ ] Create a cash order as Cashier.
- [ ] Confirm it once.
- [ ] Expected: status becomes `paid`.
- [ ] Confirm the same order again.
- [ ] Expected: rejected with conflict/error.
- [ ] Try confirming another cashier's order as Cashier.
- [ ] Expected: rejected.
- [ ] Try confirming as Manager.
- [ ] Expected: allowed.
- [ ] Try confirming as Owner.
- [ ] Expected: allowed.

### Order History

- [ ] Cashier opens My Orders.
- [ ] Expected: only that cashier's orders appear.
- [ ] Owner opens management order history.
- [ ] Expected: all orders appear.
- [ ] Manager opens management order history.
- [ ] Expected: all orders appear.
- [ ] Clear browser localStorage.
- [ ] Log in again.
- [ ] Expected: order history still exists because it is stored in MySQL.

### Audit Logs

- [ ] After order creation, check `audit_logs`.
- [ ] Expected: `order_created` row exists.
- [ ] After cash confirmation, check `audit_logs`.
- [ ] Expected: `cash_payment_confirmed` row exists.
- [ ] Confirm audit rows include actor user ID, action, order ID, details, and timestamp.

## 10. Remaining Risks

These are not blockers for Phase 4, but the team should know about them.

- Backend lint still has existing warnings.
- There are no automated tests yet for the Phase 4 order/payment/audit rules.
- KHQR still does not have a real gateway webhook.
- Telegram kitchen dispatch is not implemented yet.
- Reports may need deeper verification after more real order data exists.
- Cashier order item notes have basic length validation, but richer sanitization can be added later.
- Auth login and PIN login rate limiting were added in Phase 4.5.
- There is no advanced audit log viewer in the frontend yet.
- Historical handoff/worksheet docs may still mention older role wording because they describe previous phases.

## 11. Recommendation For Next Phase

The team can move to Phase 5.

Recommended Phase 5 focus:

- Real KHQR payment confirmation.
- WebSocket/live payment updates.
- Kitchen Display System or Telegram kitchen ticket flow.
- Payment webhook validation and idempotency.
- Prevent duplicate payment events from marking the same order twice.
- Add more audit logging around payment gateway events.

The next big idea is:

> Phase 4 made orders real. Phase 5 should make payment and kitchen updates live.
