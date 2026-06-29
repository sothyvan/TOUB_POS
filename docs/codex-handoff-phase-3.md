# Phase 3 Handoff: Backend-Owned Products, Categories, Stalls, and Staff

## 1. What Phase 3 Implemented

Phase 3 moved the main management data away from frontend-only `localStorage` and into the backend/database flow.

The goal was:

- Products come from the backend and are stored in MySQL.
- Categories come from the backend and are stored in MySQL.
- Stalls come from the backend and are stored in MySQL.
- Staff-to-stall assignments come from the backend and are stored in MySQL.
- Cashiers only see products for their assigned stall.
- Owners and Managers can manage operational data.
- Cashiers cannot access management APIs.

In simple terms: the backend/database is now the source of truth for Phase 3 data.

## 2. What Phase 3 Verification Found

The verification pass found that Phase 3 was mostly connected, but not fully safe yet.

Main findings:

- Product validation was too weak. Invalid prices and fake stall/category IDs could cause database errors.
- Cashier product scoping existed, but hidden products could still be returned by the backend.
- Cashier category listing was not stall-scoped.
- Stall APIs accepted privileged fields like `owner_id`, `device_token`, and `telegram_chat_id` directly from the frontend.
- Staff assignment did not verify that the target user was really a cashier.
- Some active frontend screens still read stall data from old `localStorage` helpers.
- Backend users did not expose real PINs, which is correct, but the frontend invented fake/default PINs and could send them back during edits.
- Product/category creation silently defaulted missing stall IDs to stall `1`.
- Frontend lint was failing.

## 3. What Fixes Were Made

Backend fixes:

- Product prices must now be numeric and greater than `0`.
- Product `stall_id` must exist before create/update.
- Product `category_id` must exist before create/update.
- Invalid product input returns clean `400` or `404` responses instead of `500`.
- Cashier product listing now returns only assigned-stall visible products.
- Cashier category listing now returns only assigned-stall/global categories.
- Category `stall_id` is validated when provided.
- Stall create/update only accepts normal editable fields: `name` and `location`.
- Stall APIs no longer trust frontend-submitted `owner_id`, `device_token`, or `telegram_chat_id`.
- Staff assignment now checks:
  - stall exists
  - user exists
  - user role is `cashier`

Frontend fixes:

- Removed active Phase 3 UI reads from old stall `localStorage` helpers.
- Product management now loads stalls from the backend.
- Category management can select backend stall scope.
- Staff directory assignment display now uses backend stall assignment data.
- Shift allocation matrix was replaced with a clear temporary placeholder because there is no backend shift-scheduling table yet.
- Fake/default PIN mapping was removed.
- User edit forms keep PIN/password blank unless the manager/owner types a new one.
- Product creation now requires an explicit stall.
- The frontend lint errors were fixed.

## 4. Files Changed and Why

### Backend

`backend/src/controllers/product.controller.js`

- Added price parsing and validation.
- Added stall/category existence checks.
- Added cashier scoping for visible assigned-stall products.
- Prevents invalid input from reaching Sequelize as a database error.

`backend/src/controllers/category.controller.js`

- Added optional stall validation.
- Scoped cashier category reads to assigned-stall/global categories.
- Prevents cashiers from seeing other stalls' category data.

`backend/src/controllers/stall.controller.js`

- Restricted stall create/update to `name` and `location`.
- Removed trust in privileged request-body fields.
- Added validation before assigning staff to a stall.
- Prevents assigning Owner/Manager users to stalls.

`backend/src/repositories/category.repository.js`

- Added optional `where` filtering.
- Supports cashier category scoping from the controller.

### Frontend

`frontend/src/services/api.js`

- Removed automatic `stallId = 1`.
- Stopped sending password/PIN unless a new PIN is typed.
- Keeps frontend API payloads safer and more honest.

`frontend/src/hooks/useProducts.js`

- Requires explicit stall selection when saving a product.

`frontend/src/hooks/useUsers.js`

- Removed fake/default PIN mapping from backend users.
- Keeps PIN blank on user edit unless changed intentionally.

`frontend/src/utils/permissions.js`

- Removed default PIN helper functions.
- Permissions now only handle role/permission logic.

`frontend/src/components/MenuCatalog.jsx`

- Loads stalls from backend.
- Replaced old local stall visibility matrix with a real assigned-stall selector.

`frontend/src/components/CategoryOwner.jsx`

- Added backend stall-scope selector for categories.

`frontend/src/components/UserOwner.jsx`

- Loads backend stalls so staff screens can display real assignment data.

`frontend/src/components/staff/StaffList.jsx`

- Shows assigned stall based on backend stall staff data.

`frontend/src/components/staff/StaffAllocation.jsx`

- Removed localStorage-backed shift matrix.
- Shows a temporary message because shift scheduling is not database-backed yet.

`frontend/src/components/OrderHistory.jsx`

- Removed localStorage-derived stall status.
- Shows that live stall/device status belongs to Phase 4.

`frontend/src/components/CashierScreen.jsx`

- Removed unused prop to satisfy lint.

`frontend/src/components/ui/TotalsBreakdown.jsx`

- Removed unused props to satisfy lint.

`frontend/src/pages/LoginPage.jsx`

- Removed unused import/state to satisfy lint.

`frontend/src/pages/CashierPage.jsx`

- Adjusted loading-state effect to satisfy React lint rules.

`context/progress-tracker.md`

- Updated project progress to record the Phase 3 verification fixes.

## 5. How to Manually Test Phase 3

### Start the apps

From `backend/`:

```bash
npm start
```

From `frontend/`:

```bash
npm run dev
```

### Management login

1. Open the frontend login page.
2. Log in as the development Owner account:
   - username: `owner`
   - password: `owner123`
3. Confirm the management portal opens.

### Product/category/stall flow

1. Create a stall in Stall Management.
2. Create a category and assign it to that stall, or keep it global.
3. Create a product.
4. Select an explicit stall.
5. Select a category.
6. Enter a positive price.
7. Save.
8. Refresh the browser.
9. Confirm the product/category/stall still exist.
10. Clear browser `localStorage`.
11. Refresh again.
12. Confirm products/categories/stalls/assignments still exist because they are stored in MySQL.

### Validation checks

Try these invalid cases:

- Product price `0`
- Product price negative
- Product with fake `stall_id`
- Product with fake `category_id`
- Category with fake `stall_id`

Expected result:

- API returns `400` for invalid input format.
- API returns `404` for missing referenced records.
- API should not return `500`.

### Staff/stall assignment

1. Create a cashier user.
2. Assign the cashier to a stall in Stall Management.
3. Confirm the Staff List shows the cashier assigned to that stall.
4. Try assigning an Owner or Manager to a stall through the API.

Expected result:

- Cashier assignment succeeds.
- Owner/Manager assignment is rejected.

### Cashier scoping

1. Assign a cashier to Stall A.
2. Create one visible product for Stall A.
3. Create one hidden product for Stall A.
4. Create one visible product for Stall B.
5. Log in as that cashier.

Expected result:

- Cashier sees only the visible product from Stall A.
- Cashier does not see hidden products.
- Cashier does not see Stall B products.

## 6. Verification Command Results

Backend lint:

```bash
cd backend
npm run lint
```

Result:

- Passed.
- `0` errors.
- `28` existing warnings remain, mostly `console` and `require-await`.

Frontend lint:

```bash
cd frontend
npm run lint
```

Result:

- Passed.
- `0` errors.

Frontend build:

```bash
cd frontend
npm run build
```

Result:

- Passed.
- Vite production build completed successfully.

API verification probes:

- Invalid product price returned `400`.
- Fake stall/category IDs returned `404`.
- Assigning Owner to stall returned `400`.
- Assigning Cashier to stall returned `200`.
- Cashier product list included assigned visible product.
- Cashier product list hid hidden product.
- Cashier product list hid other-stall product.
- Cashier category list included assigned category.
- Cashier category list hid other-stall category.

## 7. Remaining Non-Blocking Risks

- Backend lint still has existing warnings for `console` and `require-await`.
- `frontend/src/utils/stallUtils.js` still exists, but active Phase 3 UI no longer imports it.
- Shift scheduling is not database-backed yet. It is currently shown as a temporary placeholder.
- Reports/analytics still contain mock-style data in places. Full reporting should be handled in a later phase.
- No automated tests were added for the Phase 3 validation/scoping rules yet.
- `docs/database/schema.sql` has a placeholder seed owner password hash; this is already tracked as tech debt before production.

## 8. Can the Team Move to Phase 4?

Yes. Phase 3 is ready enough to move to Phase 4.

The important Phase 3 requirements are now covered:

- Backend owns products/categories/stalls/staff assignments.
- Cashier product/category data is backend-scoped.
- Invalid product/category/stall references are handled cleanly.
- Staff assignment is protected from assigning non-cashiers.
- Frontend lint and build pass.

## 9. What Phase 4 Should Focus On Next

Phase 4 should focus on live order/payment/kitchen behavior, not more Phase 3 CRUD work.

Recommended Phase 4 priorities:

- WebSocket setup for cashier-specific payment confirmation.
- KHQR/payment webhook flow.
- Ensure payment notifications only go to the cashier who created the order.
- Kitchen Display System or Telegram kitchen ticket flow.
- Idempotent webhook handling so duplicate payment events do not double-complete orders.
- Payment amount/merchant validation before marking orders complete.
- Clear UI states for waiting, paid, failed, and timeout payment cases.

Phase 4 should not reintroduce frontend-only fake data as the source of truth for backend-owned resources.
