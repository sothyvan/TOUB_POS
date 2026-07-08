# Phase 5.5 Handoff: RBAC Hierarchy Cleanup and Security Audit Fixes

## 1. What Was Implemented

Phase 5.5 cleaned up the TouB POS role hierarchy and fixed the remaining security audit issues before the team continues with Phase 6.

The final active role hierarchy is:

```text
TouB POS Team
  platform_admin

Customer Business
  owner
  manager
  cashier
```

`platform_admin` is a temporary API-only bootstrap role. It exists so the TouB POS team can create customer business owner accounts before a full platform admin system exists.

The old standalone `admin` role was removed from active app logic. The system should now use only:

- `platform_admin`
- `owner`
- `manager`
- `cashier`

## 2. Final RBAC Policy

| Role | Purpose | Main Permissions |
|------|---------|------------------|
| `platform_admin` | TouB POS team bootstrap role | Create `owner` accounts only |
| `owner` | Customer business owner | Manage managers, cashiers, stalls, menu, orders, reports |
| `manager` | Operational supervisor | Manage cashiers and operational business data |
| `cashier` | Frontline POS staff | Use assigned-stall POS workspace only |

Important rules:

- One customer business should have one `owner`.
- Extra supervisors should be created as `manager`, not extra owners.
- `platform_admin` has no frontend portal yet.
- `platform_admin` should not manage products, stalls, orders, or cashier workspaces.
- Backend authorization remains the source of truth.

## 3. Key Fixes Made

### Old `admin` role removed

- Removed the unsafe `/api/users/admin` creation route.
- Deleted the old `admin.controller.js`.
- Removed active compatibility logic that temporarily added `admin` to Sequelize/MySQL role enums.
- Updated Sequelize and raw SQL role definitions to use only the approved roles.

### Platform admin bootstrap added

- Fresh development databases now seed:

```text
username: platform_admin
password: platform123
```

- This happens only when the `users` table is empty.
- Existing databases will not receive this account automatically.

### User management rules tightened

- `platform_admin` can create `owner` accounts only.
- `owner` can create/manage `manager` and `cashier` accounts only.
- `manager` can create/manage `cashier` accounts only.
- `cashier` cannot access management APIs.

### Single-order access scoped by business

Owner/Manager access to individual orders is now scoped to the same business owner.

This affects:

- `GET /api/orders/:id`
- `POST /api/orders/:id/confirm-cash`
- `POST /api/orders/:id/check-khqr-status`

Cashiers can still access only their own orders.

### Device registration scoped by business

Owner/Manager users can register a terminal device only for stalls that belong to their own business.

This affects:

- `POST /api/stalls/:id/register-device`

### KHQR config hardened

- Removed the old `demo@bakong` fallback.
- `BAKONG_ACCOUNT_ID` is now required for KHQR generation.
- `BAKONG_ACCOUNT_ID` is also required during KHQR paid-status validation.
- Missing Bakong account config returns a clean `503` error instead of silently generating an unsafe placeholder QR.

## 4. Files Changed

### Backend code

- `backend/src/models/user.model.js`
  - Updated role enum to `platform_admin`, `owner`, `manager`, `cashier`.

- `backend/src/controllers/admin.controller.js`
  - Deleted because the old privileged admin creation path is no longer allowed.

- `backend/src/routes/user.routes.js`
  - Removed `/api/users/admin`.
  - Allowed user-management entry through the normal `/api/users` route for `platform_admin`, `owner`, and `manager`.

- `backend/src/controllers/user.controller.js`
  - Added `platform_admin -> owner only`.
  - Updated owner and manager role creation rules.
  - Blocked platform admin from update/delete in this temporary bootstrap implementation.

- `backend/src/repositories/user.repository.js`
  - Added owner-account listing for platform admin.

- `backend/src/server.js`
  - Seeds `platform_admin/platform123` only when the dev database is empty.
  - Removed old `admin` enum compatibility logic.

- `backend/src/services/development-migration.service.js`
  - Removed old `admin` role compatibility migration.

- `backend/src/services/order.service.js`
  - Added same-business owner scoping for single-order reads, cash confirmation, and KHQR status checks.
  - Required `BAKONG_ACCOUNT_ID` during KHQR paid validation.

- `backend/src/controllers/stall.controller.js`
  - Added owner-scope validation for terminal device registration.

- `backend/src/services/khqr-provider.service.js`
  - Removed `demo@bakong` fallback.
  - Added clear `BAKONG_ACCOUNT_ID` required error.

- `backend/tests/credential-model.live.test.js`
  - Updated credential/RBAC expectations for platform admin and one-owner-per-business rules.

### Frontend code

- `frontend/src/utils/permissions.js`
  - Recognizes `platform_admin`, but keeps it outside the management portal.

- `frontend/src/components/ProtectedRoute.jsx`
  - Unknown or non-portal roles redirect safely to login.

- `frontend/src/components/LoginScreen.jsx`
  - Updated dev credential copy.

- `frontend/src/pages/LoginPage.jsx`
  - Cleaned login effect dependencies and removed unused prop flow.

- `frontend/src/services/api.js`
  - Removed duplicate password assignment when saving users.

- `frontend/src/data/seedData.js`
  - Removed Owner from normal staff creation role options.

### Documentation

Updated active docs to match the new role model and security rules:

- `README.md`
- `backend/README.md`
- `frontend/README.md`
- `docs/api/auth-flow.md`
- `docs/api/endpoints.md`
- `docs/database/schema.sql`
- `docs/database/queries.sql`
- `docs/database/erd.md`
- `docs/design/payment-flow.md`
- `context/project-overview.md`
- `context/architecture.md`
- `context/ui-context.md`
- `context/progress-tracker.md`
- `backend/src/config/swagger.js`

## 5. How To Test

### A. Test platform admin login

In Swagger:

1. Open `POST /api/auth/login`.
2. Use:

```json
{
  "username": "platform_admin",
  "password": "platform123"
}
```

3. Copy `data.token` from the response.
4. Click Swagger **Authorize**.
5. Paste the token.

Important: `platform_admin/platform123` exists only if the database was empty when the backend started. If the database already had users, this account will not be auto-created.

Check in MySQL:

```sql
SELECT id, username, role, is_active
FROM users
WHERE username = 'platform_admin';
```

### B. Test platform admin permissions

With a platform admin token:

- `POST /api/users` with role `owner` should succeed.
- `POST /api/users` with role `manager` should return `403`.
- `POST /api/users` with role `cashier` should return `403`.
- Updating or deleting users as platform admin should return `403`.

Example owner creation:

```json
{
  "username": "owner_demo",
  "password": "owner123",
  "role": "owner"
}
```

### C. Test owner permissions

With an owner token:

- Creating `manager` should succeed.
- Creating `cashier` should succeed.
- Creating another `owner` should return `403`.

### D. Test manager permissions

With a manager token:

- Creating `cashier` should succeed.
- Creating `owner` should return `403`.
- Creating `manager` should return `403`.

### E. Test order scoping

Using two different owners:

- Owner A should not fetch Owner B's order by ID.
- Owner A should not confirm cash payment for Owner B's order.
- Owner A should not check KHQR status for Owner B's order.
- Manager A should also be blocked from Owner B's orders.

Expected result: `403`.

### F. Test device registration scoping

Using two different owners:

- Owner A should not register a device for Owner B's stall.
- Manager A should not register a device for Owner B's stall.

Expected result: `403`.

### G. Test KHQR config

Remove or blank `BAKONG_ACCOUNT_ID` in backend `.env`, restart backend, then create a KHQR order.

Expected result:

- KHQR order creation should fail clearly with `503`.
- It should not generate a QR using a placeholder account.

## 6. Verification Results

Commands run:

```bash
cd backend
npm run lint
```

Result:

- Passed with `0` errors.
- Existing warnings remain, mostly `no-console` and `require-await`.

Earlier Phase 5.5 checks also passed:

```bash
cd frontend
npm run lint
npm run build
```

## 7. Known Limitations

- `platform_admin` has no frontend UI yet.
- There is still no full `businesses` or `tenants` table. The current owner account acts as the business scope.
- If a teammate has old local DB data, they may need to reset or manually fix rows before testing.
- Stalls with `owner_id = NULL` may now be rejected by secure owner-scoped operations.
- Historical worksheet/handoff docs may still mention older phase decisions, but active docs and code now reflect the current role model.

## 8. Recommendation For Next Phase

Before Phase 6, the team should manually test the RBAC and owner-scoping checklist above.

After that, continue with Phase 6:

- WebSocket live KHQR payment notification.
- KHQR-paid order dispatch to Telegram kitchen.
- Kitchen ticket flow polish.

## 9. Team Chat Summary

Phase 5.5 cleaned up TouB POS RBAC. The old `admin` role is gone. The active roles are `platform_admin`, `owner`, `manager`, and `cashier`. `platform_admin` is API-only and creates Owner accounts only. Owner manages Managers/Cashiers. Manager manages Cashiers. Cashier only uses POS. We also fixed order/stall scoping so Owner/Manager users cannot access another owner's orders or register another owner's stall device. KHQR no longer falls back to `demo@bakong`; `BAKONG_ACCOUNT_ID` is required.
