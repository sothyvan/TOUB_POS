# Phase 4 Implementation Worksheet: Backend-Owned Orders

## 1. Mission Briefing

Welcome to Phase 4. The mission is to make orders real.

In earlier phases, TouB POS built the secure login flow and moved products, categories, stalls, and staff assignments into the backend/database. Now the checkout flow must become backend-owned too.

That means:

- The cashier can still build a cart in the frontend.
- But the frontend must not be trusted to decide prices, totals, stall ID, or cashier ID.
- The backend must create the order from trusted database data.
- MySQL must store the order and order item snapshots.
- Order history must load from the backend, not from fake or temporary local data.

Think of Phase 4 like this:

> The frontend says, "The cashier wants 2 of product #7 and 1 of product #9, paid by cash."
>
> The backend says, "I will check who this cashier is, what stall they belong to, whether those products belong to that stall, what the real prices are, and what the final totals should be."

Success looks like:

- Cashier creates an order through `POST /api/orders`.
- Backend calculates subtotal and total.
- Backend snapshots product name and price into `order_items`.
- Cashier order history loads from `/api/orders/mine`.
- Owner/Manager can view backend order history.
- No KHQR webhook, Telegram kitchen, or reports are implemented yet.

## 2. Important Role Note

The current active RBAC model is:

- `owner`
- `manager`
- `cashier`

Some older project notes may still say `admin`. For Phase 4, treat "admin/owner" as the management side, but follow the current code model: `owner` and `manager` are management users, while `cashier` creates orders.

Cook is not a web-app user. Cook belongs to Telegram integration later.

## 3. Concept Lesson

### Frontend State vs Trusted Server State

The cart is frontend state. It is okay for the browser to remember:

- selected product IDs
- quantities
- temporary notes/modifiers

But the frontend must not be trusted for:

- price
- subtotal
- total
- cashier ID
- stall ID
- product visibility
- whether a product belongs to this stall

Why? Because browser data can be changed by anyone using dev tools. A cashier could accidentally or intentionally send a fake price like `$0.01`. The backend protects the business by recalculating everything.

### Backend-Owned Order Creation

The safe order flow is:

1. Cashier clicks checkout.
2. Frontend sends product IDs, quantities, optional notes, and payment method.
3. Backend reads cashier ID from JWT.
4. Backend finds the cashier's assigned stall.
5. Backend loads products from MySQL.
6. Backend validates each product belongs to that stall and is visible.
7. Backend calculates totals.
8. Backend creates `orders`.
9. Backend creates `order_items` snapshots.
10. Backend returns the created order or a receipt-ready response.

### Why Snapshot Order Items?

Products can change later.

Example:

- Today, "Iced Latte" costs `$2.50`.
- Tomorrow, Owner changes it to `$3.00`.

Old receipts must still show the original `$2.50`.

That is why `order_items` stores snapshots:

- product name at sale time
- product price at sale time
- quantity
- line total
- notes/modifiers

### Order Statuses

Phase 4 should use simple order statuses that describe payment state clearly.

Recommended statuses:

- `pending_payment`: order created, but payment is not confirmed yet
- `paid`: payment confirmed
- `cancelled`: order was cancelled

For cash in Phase 4:

- Cashier must explicitly confirm cash was received.
- After confirmation, backend may create the order directly as `paid`.

For KHQR in Phase 4:

- Do not implement webhook yet.
- Either disable KHQR checkout temporarily or create a `pending_payment` order without auto-confirming it.
- Do not fake webhook success.

Important database note:

Current Sequelize/SQL order status may still use `pending`, `completed`, and `cancelled`. If your team changes statuses to `pending_payment`, `paid`, and `cancelled`, update both:

- Sequelize model: `backend/src/models/order.model.js`
- Raw SQL docs: `docs/database/schema.sql` and `docs/database/queries.sql`

Keep Sequelize and SQL synchronized.

## 4. Current System Map

### Frontend Files Involved

Open these files first:

- `frontend/src/pages/CashierPage.jsx`
  - Owns cashier page flow.
  - Opens cash/KHQR modals.
  - Calls checkout handler after confirmation.

- `frontend/src/hooks/useCart.js`
  - Stores cart items.
  - Calculates display totals.
  - Frontend totals are okay for preview, but not trusted by backend.

- `frontend/src/hooks/useOrders.js`
  - Loads order history.
  - Handles checkout.
  - Currently still builds a local receipt from cart/financials after backend creation.

- `frontend/src/services/api.js`
  - Central API wrapper.
  - `api.orders.create()` currently sends `paymentMethod` and items.
  - Must send only safe fields: product ID, quantity, notes, payment method.

- `frontend/src/components/OrderPanel.jsx`
  - Checkout buttons live here.
  - Calls `handleCheckout('CASH')` or `handleCheckout('KHQR')`.

- `frontend/src/components/CashConfirmationModal.jsx`
  - Cash confirmation guardrail.
  - Important for "cash payment requires explicit confirmation".

- `frontend/src/components/KhqrPaymentModal.jsx`
  - Existing KHQR UI.
  - Phase 4 should not implement real KHQR webhook yet.

- `frontend/src/components/CashierScreen.jsx`
  - Shows Quick Sale and My Orders.
  - My Orders should use backend order history.

- `frontend/src/components/ReceiptModal.jsx`
  - Shows receipt after checkout.
  - Should use backend-created order data, not frontend-calculated trusted totals.

### Backend Files Involved

Open these files:

- `backend/src/routes/order.routes.js`
  - Defines:
    - `POST /api/orders`
    - `GET /api/orders/mine`
    - `GET /api/orders`

- `backend/src/controllers/order.controller.js`
  - Validates basic request shape.
  - Calls order service.

- `backend/src/services/order.service.js`
  - Current main order logic.
  - Should enforce stall assignment, product visibility, product-stall match, quantity validation, totals, and snapshots.

- `backend/src/repositories/order.repository.js`
  - Currently mostly a TODO.
  - Phase 4 may either build repository helpers here or keep order DB work in service temporarily, but the project standard prefers controller-service-repository.

- `backend/src/models/order.model.js`
  - Order schema.
  - Contains payment method, status, totals, stall, cashier.

- `backend/src/models/order-item.model.js`
  - Order item snapshot schema.
  - Contains product ID, name, prices, quantity, notes.

- `backend/src/models/product.model.js`
  - Product data used for trusted price/visibility/stall validation.

- `backend/src/models/stall-staff.model.js`
  - Cashier-to-stall assignment.

- `docs/database/schema.sql`
  - Raw SQL schema must match Sequelize.

- `docs/database/queries.sql`
  - Raw SQL reference queries must match backend behavior.

## 5. Phase 4 Implementation Steps

### Step 1: Audit Current Checkout Flow

Goal:

Understand exactly what happens when a cashier checks out.

Files to open:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/hooks/useOrders.js`
- `frontend/src/services/api.js`
- `frontend/src/components/OrderPanel.jsx`
- `frontend/src/components/CashConfirmationModal.jsx`

What to change:

- Do not change yet. First trace the flow.

Why it matters:

Before editing checkout, you need to know which function calls which. Otherwise it is easy to patch the wrong layer.

Syntax/function explanation:

- `handleCheckout('CASH')` is a callback passed through components.
- `useOrders()` is a custom hook that groups order-related state and functions.
- `api.orders.create()` is the API layer function that talks to the backend.

Checkpoint test:

- Add a temporary `console.log` while learning if needed, then remove it.
- Click Cash checkout and identify the exact function sequence.

Reflection question:

- Which layer opens the modal?
- Which layer sends the API request?
- Which layer clears the cart?

### Step 2: Define the Safe Frontend Order Payload

Goal:

Make sure frontend sends only safe checkout data.

Files to open:

- `frontend/src/hooks/useOrders.js`
- `frontend/src/services/api.js`

What to change:

Payload should look like this conceptually:

```js
{
  paymentMethod: 'cash',
  items: [
    { product_id: 7, quantity: 2, notes: 'no ice' }
  ]
}
```

Do not send:

- product name
- price
- subtotal
- total
- stall ID
- cashier ID

Why it matters:

All trusted values must come from the backend/database/JWT.

Syntax/function explanation:

- `.map()` transforms frontend cart items into API payload items.
- Example: `cart.map(item => ({ product_id: item.id, quantity: item.quantity }))`
- The backend reads `req.user.id` from JWT, not from the frontend body.

Checkpoint test:

- Open browser dev tools Network tab.
- Checkout with Cash.
- Confirm the request body does not include price, total, cashier ID, or stall ID.

### Step 3: Strengthen Backend Request Validation

Goal:

Reject bad order requests before business logic runs.

Files to open:

- `backend/src/controllers/order.controller.js`

What to change:

Validate:

- `items` exists and is a non-empty array
- each item has a valid `product_id`
- each item has a positive integer `quantity`
- `notes`, if present, is a string and within max length
- `paymentMethod` is allowed

Recommended Phase 4 payment methods:

- `cash`

Optional:

- allow `khqr` only as `pending_payment`, but do not complete it
- or reject `khqr` with a clear message until Phase 5

Why it matters:

Controllers protect the service layer from messy inputs.

Syntax/function explanation:

- `Array.isArray(items)` checks that `items` is really an array.
- `Number.isInteger(quantity)` checks whole numbers.
- `return res.status(400).json(...)` stops the request with a clean client error.

Checkpoint test:

Send invalid API requests:

- no items
- empty items array
- quantity `0`
- quantity `"abc"`
- invalid payment method

Expected:

- clean `400`
- no order created

### Step 4: Resolve Cashier's Assigned Stall in Backend

Goal:

Backend must determine the stall from the cashier's assignment.

Files to open:

- `backend/src/services/order.service.js`
- `backend/src/models/stall-staff.model.js`
- optionally `backend/src/repositories/user.repository.js`

What to change:

Use the authenticated cashier ID:

- find row in `stall_staff`
- if none exists, reject checkout
- use that `stall_id` for the order

Why it matters:

Cashiers should not be able to submit `stall_id` manually.

Syntax/function explanation:

- `await StallStaff.findOne({ where: { user_id: cashierId } })`
- `await` pauses until the database query finishes.
- If result is `null`, there is no assignment.

Checkpoint test:

- Create a cashier with no stall assignment.
- Log in as that cashier.
- Try checkout.

Expected:

- backend rejects checkout with a clear error.

### Step 5: Validate Products Belong to the Cashier's Stall

Goal:

Cashier cannot order products from another stall.

Files to open:

- `backend/src/services/order.service.js`
- `backend/src/models/product.model.js`

What to change:

For each item:

- load product by ID
- product must exist
- product `stall_id` must equal cashier's assigned stall ID
- product must be visible

Why it matters:

The frontend already filters products, but backend must enforce security.

Syntax/function explanation:

- `Product.findByPk(id)` loads one product by primary key.
- Compare IDs carefully because database values may be numbers or strings.
- Example: `Number(product.stall_id) !== Number(stallId)`

Checkpoint test:

- Assign cashier to Stall A.
- Try sending product ID from Stall B directly through Postman/curl.

Expected:

- backend rejects the order.

### Step 6: Validate Quantities

Goal:

Only valid quantities are accepted.

Files to open:

- `backend/src/controllers/order.controller.js`
- `backend/src/services/order.service.js`

What to change:

Quantity rules:

- must be an integer
- must be greater than `0`
- optional max, such as `99`, to prevent silly or abusive orders

Why it matters:

Bad quantities can create impossible totals or database noise.

Syntax/function explanation:

- `Number(item.quantity)` converts input to a number.
- `Number.isInteger(quantity)` confirms whole number.
- `quantity > 0` rejects zero and negatives.

Checkpoint test:

- Try quantity `0`
- Try quantity `-1`
- Try quantity `1.5`
- Try quantity `abc`

Expected:

- all rejected with `400`

### Step 7: Calculate Totals in Backend

Goal:

Backend calculates subtotal and total from database prices.

Files to open:

- `backend/src/services/order.service.js`

What to change:

For each product:

- `line_total_usd = product.price_usd * quantity`
- `line_total_khr = product.price_khr * quantity`
- add line totals into order subtotal
- for Phase 4, total can equal subtotal unless your team has already approved service fee/tax rules

Why it matters:

The frontend total is only for display. The database total must be trusted.

Syntax/function explanation:

- Use `Number(product.price_usd)` before arithmetic because Sequelize decimal values can behave like strings.
- Use `.toFixed(2)` carefully. It returns a string, so convert back with `Number(...)` if needed.

Checkpoint test:

- Change product price in database/admin panel.
- Checkout from frontend.
- Confirm backend uses the latest database price, not any old cart price.

### Step 8: Snapshot Order Items

Goal:

Store the exact item details at sale time.

Files to open:

- `backend/src/services/order.service.js`
- `backend/src/models/order-item.model.js`

What to change:

Each `order_items` row should save:

- `order_id`
- `product_id`
- `name`
- `price_usd`
- `price_khr`
- `line_total_usd`
- `line_total_khr`
- `quantity`
- `notes`

Why it matters:

Receipts and history must remain correct even if product data changes later.

Syntax/function explanation:

- `OrderItem.create({...}, { transaction })` inserts a row inside the transaction.
- A transaction means either all order rows are created, or none are.

Checkpoint test:

- Create an order.
- Rename the product.
- Fetch the order history.
- Confirm old order item still shows the old snapshot name.

### Step 9: Decide Cash Order Status

Goal:

Cash checkout should be clear and safe.

Files to open:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/CashConfirmationModal.jsx`
- `backend/src/services/order.service.js`
- `backend/src/models/order.model.js`
- `docs/database/schema.sql`

What to change:

Recommended cash flow:

1. Cashier clicks Cash.
2. Frontend opens confirmation modal.
3. Cashier confirms cash received.
4. Frontend sends `POST /api/orders` with `paymentMethod: 'cash'`.
5. Backend creates order with status `paid`.

Why it matters:

The confirmation modal prevents accidental cash orders.

Syntax/function explanation:

- In React, modal state often uses `useState`, such as `pendingPaymentMethod`.
- Backend status should be controlled by backend logic, not frontend body.

Checkpoint test:

- Click Cash.
- Cancel modal.
- Confirm no order is created.
- Click Cash again.
- Confirm modal.
- Confirm order is created as paid.

### Step 10: Keep KHQR Out of Phase 4

Goal:

Avoid fake payment behavior.

Files to open:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/KhqrPaymentModal.jsx`
- `backend/src/services/order.service.js`
- `backend/src/services/payment.service.js`

What to change:

Choose one safe temporary behavior:

- disable KHQR button with "Coming in Phase 5"
- or let backend create `pending_payment` order but do not mark it paid

Do not:

- auto-complete KHQR after a timer
- create fake QR success
- call Telegram kitchen
- implement webhook handling

Why it matters:

Fake payment success is dangerous. Payment confirmation must come from real webhook validation in a later phase.

Syntax/function explanation:

- A disabled button uses `disabled={true}`.
- Backend can reject unsupported methods with `400`.

Checkpoint test:

- Click KHQR.
- Confirm app does not create a fake paid order.

### Step 11: Return Backend-Created Receipt Data

Goal:

Frontend receipt should show backend-created data.

Files to open:

- `backend/src/services/order.service.js`
- `backend/src/controllers/order.controller.js`
- `frontend/src/hooks/useOrders.js`
- `frontend/src/components/ReceiptModal.jsx`

What to change:

Backend response should include enough data for receipt:

- order ID
- order number or ID
- created timestamp
- cashier ID/name if available
- stall ID/name if available
- payment method
- status
- subtotal
- total
- order items with snapshots

Why it matters:

After checkout, the receipt should represent what was actually saved.

Syntax/function explanation:

- Backend can refetch the order with included `OrderItem` rows after creation.
- Frontend maps response through `mapOrderToFrontend()`.

Checkpoint test:

- Create order.
- Receipt appears.
- Refresh page.
- My Orders shows the same order.

### Step 12: Load Order History from Backend

Goal:

Cashier and management order history should come from database.

Files to open:

- `frontend/src/hooks/useOrders.js`
- `frontend/src/services/api.js`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/components/OrderHistory.jsx`
- `backend/src/services/order.service.js`

What to change:

Cashier:

- `GET /api/orders/mine`
- returns only that cashier's orders

Owner/Manager:

- `GET /api/orders`
- returns management-visible orders

Why it matters:

Refreshing or clearing localStorage should not erase order history.

Syntax/function explanation:

- `useEffect()` loads data when the component/hook starts.
- API layer maps backend response into frontend-friendly order objects.

Checkpoint test:

- Create cash order.
- Refresh browser.
- Confirm order remains in My Orders.
- Clear localStorage.
- Log in again.
- Confirm order remains.

### Step 13: Add Error and Loading States

Goal:

Checkout should feel clear even when something fails.

Files to open:

- `frontend/src/hooks/useOrders.js`
- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/OrderPanel.jsx`
- `frontend/src/components/CashierScreen.jsx`

What to change:

Add or verify:

- checkout loading state
- disable checkout while request is in progress
- show backend error message
- do not clear cart if order creation fails

Why it matters:

Cashiers need confidence during checkout.

Syntax/function explanation:

- `const [checkoutLoading, setCheckoutLoading] = useState(false)`
- `try/catch/finally` lets you start loading, catch errors, and always stop loading.

Checkpoint test:

- Stop backend.
- Try checkout.
- Confirm the cart is not cleared.
- Confirm a clear error is shown.

## 6. Guided Code Exercises

### Your Turn 1: Safe Payload

Instruction:

Update the frontend order payload so it sends only product ID, quantity, notes, and payment method.

Hint:

Look inside `frontend/src/services/api.js`.

Expected result:

Network request body should not include prices or totals.

Check yourself:

Can a user fake a lower price from the browser request body?

### Your Turn 2: Quantity Validation

Instruction:

Add backend validation for quantity.

Hint:

Validate in the controller first, then trust less in the service too.

Expected result:

Quantity `0`, negative, decimal, and text values are rejected.

Check yourself:

Does invalid quantity return `400` instead of `500`?

### Your Turn 3: Stall Scoping

Instruction:

Reject any product that does not belong to the cashier's assigned stall.

Hint:

Compare `product.stall_id` with the stall ID resolved from `stall_staff`.

Expected result:

Cashier cannot order another stall's product through API tools.

Check yourself:

Would this still be blocked if the frontend UI accidentally showed the wrong product?

### Your Turn 4: Receipt From Backend

Instruction:

Make checkout return receipt data based on the saved backend order.

Hint:

Use the existing frontend mapper in `api.js` or create a specific mapper for created orders.

Expected result:

Receipt total matches database total.

Check yourself:

If product price changes after checkout, does the old receipt still show the snapshot price?

## 7. Manual API Tests

Use these after starting the backend.

### Login as cashier

```bash
curl -X POST http://localhost:3000/api/auth/pin \
  -H "Content-Type: application/json" \
  -d "{\"userId\": 2, \"pin\": \"1111\"}"
```

Copy the token.

### Create cash order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CASHIER_TOKEN_HERE" \
  -d "{\"paymentMethod\":\"cash\",\"items\":[{\"product_id\":1,\"quantity\":2,\"notes\":\"no ice\"}]}"
```

Expected:

- `201`
- backend-created order ID
- trusted totals
- saved item snapshots

### Invalid: no items

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CASHIER_TOKEN_HERE" \
  -d "{\"paymentMethod\":\"cash\",\"items\":[]}"
```

Expected:

- `400`

### Invalid: bad quantity

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CASHIER_TOKEN_HERE" \
  -d "{\"paymentMethod\":\"cash\",\"items\":[{\"product_id\":1,\"quantity\":0}]}"
```

Expected:

- `400`

### Invalid: product from another stall

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CASHIER_TOKEN_HERE" \
  -d "{\"paymentMethod\":\"cash\",\"items\":[{\"product_id\":999,\"quantity\":1}]}"
```

Expected:

- `400` or `403`
- no order created

### Fetch cashier order history

```bash
curl http://localhost:3000/api/orders/mine \
  -H "Authorization: Bearer CASHIER_TOKEN_HERE"
```

Expected:

- only the cashier's orders
- includes order items

## 8. Frontend Manual Tests

### Cash checkout success

1. Start backend.
2. Start frontend.
3. Log in as cashier.
4. Add visible assigned-stall products to cart.
5. Click Cash.
6. Confirm the cash modal.
7. Confirm receipt appears.
8. Confirm cart clears.
9. Refresh page.
10. Confirm order appears in My Orders.

### Cash checkout cancel

1. Add items to cart.
2. Click Cash.
3. Cancel the modal.

Expected:

- no order created
- cart remains

### Backend error

1. Add item to cart.
2. Stop backend.
3. Try checkout.

Expected:

- error shown
- cart remains

### localStorage clearing

1. Create order.
2. Clear browser localStorage.
3. Log in again.
4. Open My Orders.

Expected:

- order still exists because it is in MySQL

## 9. Debugging Guide

### 401 Unauthorized

Meaning:

JWT token is missing or invalid.

Where to check:

- browser localStorage auth token
- `frontend/src/services/apiClient.js`
- backend `authenticate` middleware

Fix:

- log in again
- check `Authorization: Bearer <token>` header

### 403 Forbidden

Meaning:

User is authenticated but role is not allowed.

Where to check:

- `backend/src/routes/order.routes.js`
- role in JWT

Fix:

- cashier should create orders
- owner/manager should view management orders

### 400 Bad Request

Meaning:

Request body is invalid.

Where to check:

- frontend payload
- controller validation

Fix:

- ensure items array is not empty
- ensure quantity is positive integer
- ensure payment method is valid

### Cashier Is Not Assigned to Stall

Meaning:

Cashier has no `stall_staff` row.

Where to check:

- Stall Management UI
- `stall_staff` table
- `backend/src/services/order.service.js`

Fix:

- assign cashier to a stall before checkout

### Product Does Not Belong to Stall

Meaning:

Cashier tried to order a product outside their assigned stall.

Where to check:

- product `stall_id`
- cashier assigned stall
- frontend product list scoping

Fix:

- use correct product
- fix stall assignment
- fix product's stall assignment

### Receipt Total Does Not Match Database

Meaning:

Frontend may still be displaying local totals.

Where to check:

- `frontend/src/hooks/useOrders.js`
- `frontend/src/services/api.js`
- backend response shape

Fix:

- use backend-created order response for receipt

### Order Created But My Orders Empty

Meaning:

Order creation works, but history fetch/mapping may be wrong.

Where to check:

- `GET /api/orders/mine`
- `mapOrderToFrontend()`
- `CashierScreen.jsx`

Fix:

- verify API response includes `Items`
- verify frontend mapper reads those items correctly

## 10. Definition of Done

Phase 4 is complete when:

- `POST /api/orders` creates real MySQL orders.
- Frontend sends only product ID, quantity, notes, and payment method.
- Backend calculates prices, subtotal, total, stall ID, and cashier ID.
- Backend snapshots order item names and prices.
- Backend rejects unassigned cashiers.
- Backend rejects products outside cashier's stall.
- Backend rejects hidden products.
- Backend rejects invalid quantities.
- Cash payment requires explicit confirmation.
- Cash orders are saved with a clear paid/completed status.
- Order history loads from backend after refresh.
- Clearing localStorage does not erase order history.
- KHQR webhook is not implemented yet.
- Telegram kitchen is not implemented yet.
- Reports are not implemented yet.
- Backend lint passes.
- Frontend lint passes.
- Frontend build passes.
- Sequelize model changes, if any, are synchronized with SQL docs.

## 11. Team Activity

Try this as a 3-person lab:

- API Captain: owns `order.routes.js`, `order.controller.js`, and API tests.
- Database Detective: owns `order.service.js`, models, SQL docs, and snapshot validation.
- UI Pilot: owns `useOrders.js`, `api.js`, cashier checkout, and receipt/history behavior.

Checkpoint rotation:

- After Step 3, API Captain explains validation to the team.
- After Step 8, Database Detective shows one saved order and its item snapshots in MySQL.
- After Step 12, UI Pilot demonstrates refresh persistence.

Reflection questions:

- What data is safe for the frontend to send?
- What data must the backend calculate?
- What could go wrong if frontend totals were trusted?
- How do snapshots protect old receipts?

## 12. Phase 4 Boundary Reminder

Do not build these yet:

- KHQR webhook validation
- WebSocket payment confirmation
- Telegram kitchen tickets
- full sales reports
- inventory
- offline sync

Those are future work. Phase 4 should make orders real first.
