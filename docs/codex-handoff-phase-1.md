# Codex Handoff - Phase 1 Backend Auth/Security Hardening

## 1. Implemented Task

Phase 1 focused on backend security and authorization hardening before frontend auth integration.

Implemented scope:

- Fixed backend role authorization behavior.
- Standardized TouB POS web-app roles to only `admin` and `cashier`.
- Removed `manager` from the active backend role model and SQL schema.
- Added startup environment validation.
- Hardened login behavior.
- Restricted CORS.
- Made default admin seeding development-only.
- Prevented password hashes and PINs from being returned by user APIs.
- Updated current backend/API/database/context documentation to match the two-role model.

Not implemented in this phase:

- Frontend auth integration.
- Cashier PIN login endpoint.
- Payment/KHQR changes.
- Telegram kitchen integration.
- New major product features.

## 2. Files Changed

Backend runtime files:

- `backend/src/config/env.js`
- `backend/src/app.js`
- `backend/src/server.js`
- `backend/src/middleware/auth.middleware.js`
- `backend/src/services/auth.service.js`
- `backend/src/controllers/user.controller.js`
- `backend/src/repositories/user.repository.js`
- `backend/src/models/user.model.js`
- `backend/src/routes/product.routes.js`
- `backend/src/routes/category.routes.js`
- `backend/src/routes/report.routes.js`
- `backend/src/routes/stall.routes.js`
- `backend/src/routes/user.routes.js`
- `backend/src/routes/order.routes.js`
- `backend/src/controllers/order.controller.js`
- `backend/src/config/swagger.js`

Documentation/schema files:

- `docs/database/schema.sql`
- `backend/README.md`
- `docs/api/auth-flow.md`
- `docs/api/endpoints.md`
- `docs/setup/getting-started.md`
- `context/project-overview.md`
- `context/architecture.md`
- `context/ui-context.md`
- `context/progress-tracker.md`

## 3. Why Each Change Was Made

### `backend/src/config/env.js`

Added a centralized environment configuration helper.

Why:

- Backend must not start without required secrets and database config.
- `JWT_SECRET` is required for secure token signing.
- DB settings are required for startup.
- `FRONTEND_ORIGIN` is required outside development.
- `DB_PASSWORD` is optional unless `DB_PASSWORD_REQUIRED=true`.

Fixes:

- Prevents silent startup with missing secrets.
- Gives clearer startup error messages.
- Provides one place for CORS origin logic.

### `backend/src/app.js`

Changed open CORS from `cors()` to restricted CORS config from `getCorsOptions()`.

Why:

- Open CORS allows any browser origin to call the API.
- TouB POS should only allow the configured frontend origin.

Fixes:

- Restricts browser access to `FRONTEND_ORIGIN`.
- Defaults to `http://localhost:5173` only in development.

### `backend/src/server.js`

Added environment validation before loading app/database modules. Also made default admin seeding development-only.

Why:

- Env validation should fail early with clear messages.
- Production must not create or log demo credentials.

Fixes:

- Missing `JWT_SECRET` or DB env values now stop startup.
- `admin/admin123` is only seeded when `NODE_ENV !== 'production'`.

### `backend/src/middleware/auth.middleware.js`

Updated `authorize()` to support both:

```js
authorize('admin')
authorize(['admin', 'cashier'])
```

Why:

- Existing usage mixed string and array styles.
- The old middleware only worked reliably with rest arguments.

Fixes:

- Prevents authorization bugs caused by passing arrays.
- Keeps route declarations simple and consistent.

### `backend/src/services/auth.service.js`

Added inactive user rejection during login.

Why:

- Disabled staff should not be able to sign in.

Fixes:

- Login now returns `403` for inactive users.
- JWT payload remains minimal: `id`, `username`, `role`.

### `backend/src/controllers/user.controller.js`

Added role validation and stopped returning PINs after user creation.

Why:

- TouB POS has only two web-app roles: `admin` and `cashier`.
- PINs are credentials and should not be exposed in API responses.

Fixes:

- Rejects unsupported roles such as `manager`.
- New user response includes only safe user data.

### `backend/src/repositories/user.repository.js`

Excluded `password` and `pin` from user fetch responses.

Why:

- Password hashes and PINs are sensitive credential data.

Fixes:

- `GET /api/users` no longer exposes PINs or password hashes.
- `findUserById()` also hides sensitive fields.

### `backend/src/models/user.model.js`

Changed role enum from:

```js
DataTypes.ENUM('admin', 'manager', 'cashier')
```

to:

```js
DataTypes.ENUM('admin', 'cashier')
```

Why:

- There is no legacy database compatibility requirement.
- `manager` is not a TouB POS web-app user.

Fixes:

- The database model now matches the real product role model.

### Route Files

Updated admin-only routes to use:

```js
authorize('admin')
```

Affected route files:

- `product.routes.js`
- `category.routes.js`
- `report.routes.js`
- `stall.routes.js`
- `user.routes.js`
- `order.routes.js`

Why:

- Admin/Owner is the only web role that should manage products, categories, users, stalls, reports, and all-order views.

Fixes:

- Removes `manager` access from backend routes.
- Makes protected route intent clearer.

### `backend/src/controllers/order.controller.js`

Updated stale comments from admin/manager wording to admin-only wording.

Why:

- Comments should match actual route authorization.

Fixes:

- Reduces confusion for teammates reading the order controller.

### `backend/src/config/swagger.js`

Updated Swagger summary for all-order listing to Admin-only.

Why:

- API docs should match implemented RBAC.

Fixes:

- Prevents teammates from thinking `manager` is still valid.

### `docs/database/schema.sql`

Updated raw SQL user role enum to:

```sql
ENUM('admin', 'cashier')
```

Why:

- Project rule requires Sequelize model and SQL schema parity.

Fixes:

- Course SQL deliverable now matches the backend model.

### Backend/API/Context Docs

Updated role wording in:

- `backend/README.md`
- `docs/api/auth-flow.md`
- `docs/api/endpoints.md`
- `docs/setup/getting-started.md`
- `context/project-overview.md`
- `context/architecture.md`
- `context/ui-context.md`
- `context/progress-tracker.md`

Why:

- Current project docs should describe `admin` and `cashier` only.

Fixes:

- Removes active `manager` role guidance from current docs.
- Keeps teammates aligned on Phase 2 expectations.

## 4. Commands Run And Results

Command:

```bash
cd backend
npm run lint
```

Result:

- ESLint completed with exit code `0`.
- No lint errors.
- There were 25 warnings.

Warning categories:

- Existing `no-console` warnings in backend logging/startup files.
- Existing `require-await` warnings in some repository/service functions.

No tests were added or run beyond lint.

## 5. How Teammates Can Test It

### A. Lint Check

Run:

```bash
cd backend
npm run lint
```

Expected:

- Command exits successfully.
- `0 errors`.
- Existing warnings may still appear.

### B. Startup Environment Validation

Try starting the backend without `JWT_SECRET`.

Expected:

- Server should fail startup.
- Error should mention missing required env variables.

Try setting `NODE_ENV=production` without `FRONTEND_ORIGIN`.

Expected:

- Server should fail startup.
- Error should mention `FRONTEND_ORIGIN`.

Development expected behavior:

- If `NODE_ENV` is `development`, CORS may fall back to `http://localhost:5173`.

### C. Login Behavior

Route:

```http
POST /api/auth/login
```

Expected:

- Valid active user returns a token and safe user object.
- Invalid credentials return `401`.
- Inactive user returns `403`.
- JWT payload should only include `id`, `username`, and `role`.

### D. Role Authorization

Test with an admin token:

- `GET /api/users` should work.
- `POST /api/products` should work if request body is valid.
- `GET /api/reports/daily` should work.
- `GET /api/orders` should work.

Test with a cashier token:

- `GET /api/products` should work.
- `GET /api/orders/mine` should work.
- `GET /api/users` should return `403`.
- `POST /api/products` should return `403`.
- `GET /api/reports/daily` should return `403`.
- `GET /api/orders` should return `403`.

### E. User API Sensitive Fields

Route:

```http
GET /api/users
```

Expected:

- Response users should not include `password`.
- Response users should not include `password_hash`.
- Response users should not include `pin`.

### F. Role Validation

Route:

```http
POST /api/users
```

Test body with invalid role:

```json
{
  "username": "badrole",
  "password": "secret123",
  "role": "manager"
}
```

Expected:

- API returns `400`.
- Message should say role must be either admin or cashier.

Valid roles:

- `admin`
- `cashier`

## 6. Remaining Risks Or TODOs

- PINs are still stored in the current `users.pin` column. They are hidden from API responses, but not hashed yet.
- No backend cashier PIN endpoint exists yet.
- Frontend still uses localStorage/mock auth for login behavior.
- Auth endpoint has no rate limiting.
- Existing database instances may need schema reset or enum alteration if they were created before `manager` was removed.
- Default SQL seed still contains a placeholder bcrypt hash in `docs/database/schema.sql`; replace before any real deployment.
- WebSocket payment confirmation routing is still not implemented.
- KHQR/payment webhook hardening is not complete.
- Telegram kitchen authorization is not implemented yet.
- Order modifier input sanitization is still listed as tech debt.

## 7. Phase 2 Next Steps

Phase 2 should connect frontend authentication to this hardened backend.

Recommended next work:

- Replace frontend localStorage login with `POST /api/auth/login`.
- Add frontend API client using `VITE_API_BASE_URL`.
- Store JWT and current user after login.
- Attach `Authorization: Bearer <token>` to protected API requests.
- Add frontend session restore after page refresh.
- Add protected route guards for `/admin-portal` and cashier routes.
- Redirect unauthenticated users to login.
- Redirect users away from routes their role cannot access.
- Handle `401` globally by clearing session and returning to login.
- Move cashier PIN verification to a backend endpoint.
- Keep frontend roles limited to `admin` and `cashier`.
- Do not add KHQR, Telegram, or payment features in Phase 2 unless the implementation plan is updated.
