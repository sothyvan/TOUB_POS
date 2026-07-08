# TouB POS Full Project Status Audit

## 1. Executive Summary

TouB POS is in a strong “advanced final project” state: backend auth, backend-owned product data, backend-owned orders, cash confirmation, audit logs, PIN hashing, rate limiting, Helmet, and real Bakong KHQR status checking are all present.

However, I would **not call the project fully ready to push/demo as clean** yet. There are a few important issues:

- Active backend code still allows the old `admin` role in some places.
- A legacy `/api/users/admin` route can bypass the newer owner/manager/cashier credential rules.
- Some owner/manager order and stall operations are not fully owner-scoped.
- Frontend lint currently fails.
- KHQR is real, but missing `BAKONG_ACCOUNT_ID` can silently fall back to `demo@bakong`.

Overall confidence: **Medium**  
The core features are there, but the RBAC/security cleanup should happen before the next big phase.

## 2. Implemented Features

Confirmed implemented:

- JWT authentication with access token stored in `localStorage`.
- Owner/manager username-password login.
- Cashier PIN login.
- Cashier PIN hashing with bcrypt.
- Login and PIN rate limiting.
- Helmet security headers.
- Backend-owned products, categories, stalls, and staff assignment.
- Backend-owned order creation.
- Backend-calculated order totals.
- Backend order item snapshots.
- Cash order confirmation endpoint.
- Audit logs for order creation and payment confirmation.
- Real Bakong KHQR generation/status check flow.
- Frontend checkout uses backend order APIs.
- Frontend build succeeds.

## 3. Phase Completion Table

| Phase | Status | Notes |
|---|---:|---|
| Phase 1 Auth/Security | Mostly complete | Core auth hardening exists, but old `admin` role still appears in active backend logic. |
| Phase 2 Frontend Auth | Mostly complete | JWT session flow exists, but frontend lint has login-related errors. |
| Phase 3 Backend-Owned Products/Stalls/Staff | Mostly complete | Main data is backend-backed; device registration needs owner-scope protection. |
| Phase 4 Backend-Owned Orders | Mostly complete | Order creation/cash confirmation work, but single-order access needs owner-scope checks. |
| Phase 4.5 Security Hardening | Mostly complete | PIN hashing/rate limit/Helmet exist; stale admin route weakens the model. |
| Phase 5 KHQR | Mostly complete | Real Bakong check exists; config fallback should be hardened. |
| Phase 6 Telegram/KDS | Partial | Cash-paid orders dispatch; KHQR-paid order dispatch still appears pending. |
| Reports/Dashboard | Partial | Some backend report logic exists, but frontend dashboard still has static/demo metrics. |

## 4. Critical Issues

1. **Old `admin` role and unsafe admin creation route still exist**

   Files:
   - `backend/src/models/user.model.js:26`
   - `backend/src/routes/user.routes.js:4`
   - `backend/src/routes/user.routes.js:9`
   - `backend/src/routes/user.routes.js:13`
   - `backend/src/routes/user.routes.js:22`
   - `backend/src/controllers/admin.controller.js:4`

   Problem: the official role model is now `owner`, `manager`, `cashier`, but Sequelize and routes still allow/use `admin`. The route `POST /api/users/admin` uses a separate controller path and can bypass the newer credential rules.

   Why it matters: this can break RBAC consistency and allow users to be created outside the correct owner/manager/cashier rules.

2. **Owner/manager access to individual orders is not owner-scoped**

   File:
   - `backend/src/services/order.service.js`

   Problem: owner/manager can access or confirm some order operations by role alone. The logic does not consistently verify that the order belongs to the same owner/stall scope.

   Why it matters: in a multi-owner POS system, one owner or manager should not access another owner’s orders.

3. **Stall device registration is not owner-scoped**

   File:
   - `backend/src/controllers/stall.controller.js:168`

   Problem: `registerDevice` loads a stall by ID and updates its device token, but does not verify that the authenticated owner/manager belongs to that stall’s owner scope.

   Why it matters: someone with management access could register a device against another owner’s stall if they know the ID.

4. **KHQR can fall back to demo Bakong account**

   File:
   - `backend/src/services/khqr-provider.service.js:5`
   - `backend/src/services/khqr-provider.service.js:37`

   Problem: `BAKONG_ACCOUNT_ID` falls back to `demo@bakong`.

   Why it matters: after real production testing, missing payment config should fail clearly. Silent fallback is risky for real payment demos.

5. **Frontend lint fails**

   Files:
   - `frontend/src/components/LoginScreen.jsx:12`
   - `frontend/src/pages/LoginPage.jsx:28`
   - `frontend/src/pages/LoginPage.jsx:56`

   Problem: unused prop and React hook lint issues.

   Why it matters: build passes, but repo quality checks are not clean.

## 5. High Priority Issues

- `docs/database/schema.sql` uses only `owner`, `manager`, `cashier`, but Sequelize still allows `admin`.
- `backend/src/services/development-migration.service.js` still contains broad dev logic that drops product category foreign keys.
- KHQR-paid orders do not appear to dispatch to Telegram/KDS, while cash-paid orders do.
- Telegram webhook secret validation is optional when the secret is missing.
- Stall update accepts `telegram_chat_id`, but docs say frontend should not submit it.
- `backend/src/services/payment.service.js` appears to be old/dead webhook-style payment logic and may confuse the team.

## 6. Medium / Low Priority Issues

- Frontend route is now `/owner-portal`, but some docs still mention `/admin-portal`.
- Dashboard metrics are still partly static/demo.
- QR rendering uses an external QR image service from the frontend.
- Some old localStorage helpers remain as unused dead code.
- Some historical docs still describe older phases and role models.
- Backend lint has many warnings, mostly `no-console` and `require-await`.

## 7. KHQR Status

KHQR is **real backend-supported**, not just mock UI.

Confirmed:

- KHQR payload generation uses `bakong-khqr`.
- Backend stores `qr_payload`, `qr_md5`, payment reference, and expiry.
- Frontend polls backend status.
- Backend checks Bakong using `/v1/check_transaction_by_md5`.
- Mock check mode appears removed from active code.

Main KHQR risks:

- Missing `BAKONG_ACCOUNT_ID` falls back to demo account.
- No KHQR webhook is implemented yet.
- KHQR-paid order Telegram dispatch still appears unfinished.
- Frontend QR image rendering sends QR payload to a third-party QR image service.

## 8. Remaining Features

Likely remaining product work:

- Fix RBAC cleanup and tenant/owner scoping.
- Finish Telegram/KDS dispatch for KHQR-paid orders.
- Add live kitchen order state flow if required.
- Replace static dashboard metrics with backend reports.
- Improve audit log viewing/admin visibility.
- Add stronger production payment configuration validation.
- Optional future auth upgrade: HttpOnly refresh token architecture.

## 9. Documentation Gaps

Docs that appear stale or inconsistent:

- `context/progress-tracker.md`: phase numbering/status is inconsistent around Phase 5 and Phase 6.
- `context/project-overview.md`: still has older wording around admin portal/payment flow.
- `context/architecture.md`: some route/auth wording is stale.
- `docs/api/endpoints.md`: some Telegram/stall/payment wording does not fully match code.
- `docs/database/schema.sql`: role enum is correct, but Sequelize does not match it.
- Historical handoff/worksheet docs: expected to be historical, but may confuse teammates if used as current truth.

## 10. Verification Results

Commands run:

```bash
cd backend
npm run lint
```

Result: **passed with warnings**  
Warnings: 59 warnings, mostly `no-console`, `prefer-const`, and `require-await`.

```bash
cd frontend
npm run lint
```

Result: **failed**

Errors:
- `LoginScreen.jsx`: `deviceRegistered` is defined but never used.
- `LoginPage.jsx`: React hook lint error from synchronous state update inside `useEffect`.

Warning:
- `LoginPage.jsx`: missing hook dependencies.

```bash
cd frontend
npm run build
```

Result: **passed**

```bash
npm ls --depth=0
```

Result:
- Backend dependencies are installed.
- Frontend dependencies are installed, but some extraneous packages are listed.

Git status after checks: clean.

## 11. Manual Test Plan

Before pushing/demoing, I would manually test:

- Owner login with username/password.
- Manager login with username/password.
- Cashier PIN login.
- Confirm owner/manager cannot use PIN login.
- Confirm cashier cannot use username/password login.
- Create product/category/stall as owner.
- Create cashier and assign to stall.
- Cashier creates cash order.
- Backend calculates total correctly.
- Confirm cash payment.
- Confirm same cash order cannot be confirmed twice.
- Create KHQR order.
- Pay KHQR.
- Poll/check status until order becomes `paid`.
- Confirm fake total/status/stall_id/cashier_id from frontend/API is rejected or ignored.
- Confirm cashier cannot access another stall’s products/orders.
- Confirm owner/manager cannot access another owner’s orders.
- Check audit log rows for order creation and payment confirmation.

## 12. Recommended Next 3 Steps

1. **Fix the critical RBAC/security issues first**
   Remove active `admin` role logic, delete or protect `/api/users/admin`, add owner-scope checks to single-order operations and stall device registration, and require real Bakong account config.

2. **Fix frontend lint**
   Clean up `LoginScreen.jsx` and `LoginPage.jsx` so `npm run lint` passes before pushing.

3. **Do one full demo smoke test**
   Test owner, manager, cashier, cash order, KHQR order, audit logs, and database persistence from a fresh database. After that, update `context/progress-tracker.md` so the team has one current source of truth.