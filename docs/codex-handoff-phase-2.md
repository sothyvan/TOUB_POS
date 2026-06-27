# Phase 2 Handoff: Frontend Authentication Integration

## 1. What Was Implemented

Phase 2 connected the React/Vite frontend to the backend JWT authentication flow.

The admin login is now backend-backed. The Admin/Owner enters credentials on `/login`, and the frontend sends them to the backend `POST /api/auth/login` endpoint. The frontend no longer checks the admin password or PIN against localStorage demo users.

Protected routes, session persistence, and logout were implemented:

- `/admin-portal` requires an authenticated `admin` user.
- `/cashier` requires an authenticated `cashier` user.
- JWT token and current user are stored in browser storage.
- The session is restored after page refresh.
- Logout clears the stored token and user.
- A `401` response from the API clears the session.

Cashier quick-login remains temporary. The avatar/PIN UI is still visible, but it does not create a fake localStorage authentication session anymore. It now shows a TODO message because the backend does not yet have a cashier PIN/avatar login endpoint.

## 2. Files Changed

### `frontend/src/services/apiClient.js`

What changed:

- Added a frontend API client for backend HTTP requests.
- Uses `VITE_API_BASE_URL`.
- Defaults to `http://localhost:3000/api`.
- Automatically attaches `Authorization: Bearer <token>` when a token exists.
- Converts failed responses into `ApiError`.
- Calls the unauthorized handler on `401`.

Why it changed:

- The frontend needs one shared place to call the backend API.
- JWT attachment should not be repeated manually in every component.

Auth flow effect:

- Login uses the backend API.
- Future protected API calls can reuse the same client.

### `frontend/src/auth/authStorage.js`

What changed:

- Added helpers for reading, writing, and clearing auth session storage.
- Stores:
  - `toub-auth-token`
  - `toub-current-user`

Why it changed:

- The app needs refresh persistence.
- Token and current user storage should be centralized.

Auth flow effect:

- Refreshing `/admin-portal` keeps the user logged in if the saved session exists.
- Logout removes the saved session.

### `frontend/src/auth/authContext.js`

What changed:

- Added the shared React auth context object.

Why it changed:

- The auth provider and `useAuth` hook need to share the same context.
- Keeping this separate avoids React Fast Refresh lint issues.

Auth flow effect:

- Auth state is available across pages and route guards.

### `frontend/src/auth/AuthContext.jsx`

What changed:

- Added `AuthProvider`.
- Restores stored session on app load.
- Provides `login`, `logout`, and `clearSession`.
- Normalizes backend user roles into frontend display roles.
- Registers a global `401` unauthorized handler.

Why it changed:

- The frontend needs a central session layer instead of passing users through `location.state`.

Auth flow effect:

- Login stores JWT/user.
- Logout clears JWT/user.
- Invalid token responses clear the session.

### `frontend/src/auth/useAuth.js`

What changed:

- Added `useAuth()` hook.

Why it changed:

- Components and pages need a simple way to access auth state and auth actions.

Auth flow effect:

- Login page, protected routes, admin page, and cashier page can all read the current session.

### `frontend/src/components/ProtectedRoute.jsx`

What changed:

- Added a reusable protected route wrapper.
- Redirects unauthenticated users to `/login`.
- Redirects authenticated users away from routes their role cannot access.

Why it changed:

- The old route guard depended on `location.state`, which disappears after refresh.

Auth flow effect:

- `/admin-portal` is protected by role `admin`.
- `/cashier` is protected by role `cashier`.
- Refresh persistence works because routes check the stored auth session.

### `frontend/src/App.jsx`

What changed:

- Wrapped the app in `AuthProvider`.
- Wrapped `/admin-portal` and `/cashier` in `ProtectedRoute`.

Why it changed:

- Route protection belongs at the routing layer.

Auth flow effect:

- Direct navigation to protected pages is now checked before rendering the page.

### `frontend/src/pages/LoginPage.jsx`

What changed:

- Replaced localStorage admin credential checking with backend login.
- Calls `login(username, password)`.
- Redirects authenticated admins to `/admin-portal`.
- Redirects authenticated cashiers to `/cashier`.
- Keeps cashier PIN flow visible but blocks fake local auth.
- Shows demo credentials only in development or when `VITE_SHOW_DEMO_CREDENTIALS=true`.

Why it changed:

- Admin authentication must be owned by the backend.
- The frontend should not validate real passwords or PINs.

Auth flow effect:

- Admin login now depends on `POST /api/auth/login`.
- Cashier PIN login is clearly marked as backend TODO instead of pretending to be secure.

### `frontend/src/components/LoginScreen.jsx`

What changed:

- Admin login submit handler became async.
- Login button shows `Logging in...` while waiting.
- Admin copy now says admin owner credentials.
- Password label no longer says PIN.
- Demo credentials are gated by a prop.
- Removed active Manager demo credential text.

Why it changed:

- The form now waits for a backend API request.
- Login UI should match the two-role model: `admin` and `cashier`.

Auth flow effect:

- The same visual login screen now supports real backend admin login.

### `frontend/src/pages/AdminPortalPage.jsx`

What changed:

- Removed `location.state` auth guard.
- Reads current user from `useAuth()`.
- Uses `logout()` from the auth provider.

Why it changed:

- `location.state` does not survive page refresh.
- Logout must clear the real JWT session.

Auth flow effect:

- Admin portal remains available after refresh.
- Logout clears auth storage.

### `frontend/src/pages/CashierPage.jsx`

What changed:

- Removed `location.state` auth guard.
- Reads current user from `useAuth()`.
- Uses `logout()` from the auth provider.

Why it changed:

- Cashier route protection should use the same session system as admin.

Auth flow effect:

- `/cashier` can only be rendered for authenticated cashier users.
- Logout clears auth storage and cart state.

### `frontend/src/components/AdminWorkspace.jsx`

What changed:

- Accepts `currentUser`.
- Displays the authenticated admin user in the sidebar instead of looking for an admin in localStorage mock users.

Why it changed:

- The logged-in backend user is now the real session user.

Auth flow effect:

- Admin workspace identity reflects the JWT-authenticated user.

### `frontend/src/utils/permissions.js`

What changed:

- Added role normalization helpers.
- Removed active Manager permission behavior.
- Admin can manage menu, users, and reports.
- Cashier is limited to cashier access.

Why it changed:

- Backend roles are lowercase (`admin`, `cashier`), while UI labels are title case (`Admin`, `Cashier`).
- TouB POS has only two main web-app roles.

Auth flow effect:

- Route guards and UI permissions work with backend user objects.

### `frontend/src/data/seedData.js`

What changed:

- Removed `Manager` from frontend role options.
- Removed the default Manager demo user.

Why it changed:

- The frontend should not reintroduce a role that the backend no longer supports.

Auth flow effect:

- Staff UI role options align with backend roles.

### `frontend/src/components/staff/StaffList.jsx`

What changed:

- Simplified role badge colors to support Admin and Cashier only.

Why it changed:

- Manager is no longer an active role.

Auth flow effect:

- Staff UI display matches the two-role auth model.

### `frontend/src/hooks/useOrders.js`

What changed:

- Updated a stale comment from admin/manager wording to admin-only wording.

Why it changed:

- Documentation inside code should match the current role model.

Auth flow effect:

- No runtime behavior change.

### `context/progress-tracker.md`

What changed:

- Recorded Phase 2 frontend JWT authentication integration.
- Marked Phase 2 as completed.
- Marked Phase 3 as the next phase.

Why it changed:

- Project workflow requires progress tracking after meaningful implementation changes.

Auth flow effect:

- Helps teammates understand the current project state.

## 3. New Auth Flow

1. User opens `/login`.
2. Admin/Owner enters username and password.
3. Frontend calls:

   ```http
   POST /api/auth/login
   ```

4. Backend validates credentials and returns JWT plus user data.
5. Frontend stores:

   - JWT token in `toub-auth-token`
   - current user in `toub-current-user`

6. Frontend redirects based on role:

   - `admin` goes to `/admin-portal`
   - `cashier` goes to `/cashier`

7. Protected routes check the stored session:

   - If no session exists, redirect to `/login`.
   - If the role is wrong, redirect to the correct role home.

8. Logout clears the stored JWT and current user.

## 4. How To Test

### Start Backend

From `backend/`:

```bash
npm run dev
```

Make sure backend `.env` includes required values such as:

- `JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_NAME`
- `FRONTEND_ORIGIN=http://localhost:5173`

### Start Frontend

From `frontend/`:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/login
```

### Login As Admin

Use a backend admin account.

For local development seed:

```text
username: admin
password: admin123
```

Expected:

- Login succeeds.
- Browser redirects to `/admin-portal`.
- `localStorage` contains `toub-auth-token` and `toub-current-user`.

### Refresh `/admin-portal`

Steps:

1. Stay on `/admin-portal`.
2. Refresh the browser.

Expected:

- User remains logged in.
- Admin portal renders again.
- No redirect back to login.

### Try Opening `/cashier` As Admin

Steps:

1. Log in as admin.
2. Navigate directly to `/cashier`.

Expected:

- App redirects away from `/cashier`.
- Admin should return to `/admin-portal`.

### Logout

Steps:

1. Click logout in the admin UI.

Expected:

- Token and current user are removed from storage.
- Protected routes no longer render for that user.

### Direct Navigation While Logged Out

Steps:

1. Log out.
2. Open `/admin-portal` directly.
3. Open `/cashier` directly.

Expected:

- Both redirect to `/login`.

### Invalid Credentials

Steps:

1. Open `/login`.
2. Enter the wrong username or password.

Expected:

- Login fails.
- Error message is shown.
- No token is stored.

## 5. Commands Run

From `frontend/`:

```bash
npm run lint
```

Result:

- Passed.
- No lint errors.

From `frontend/`:

```bash
npm run build
```

Result:

- Passed.
- Production build completed successfully.
- Vite transformed 1813 modules.

## 6. Known Limitations / TODOs

- Cashier avatar/PIN login still needs backend support.
- The frontend currently shows the cashier PIN UI, but it does not create a real auth session.
- Products, orders, stalls, categories, and staff assignment data may still use localStorage mocks until Phase 3 or Phase 4.
- Payment, KHQR, WebSocket payment confirmation, and Telegram kitchen flow are not part of Phase 2.
- Auth endpoint rate limiting is still a backend TODO.
- Cashier session restoration for an active cart is not fully handled yet.

## 7. Next Recommended Phase

Phase 3 should connect products, categories, stalls, and staff assignments to the backend/database.

Recommended Phase 3 work:

- Replace localStorage product/category data with backend API calls.
- Connect staff management to backend users.
- Connect stall management and staff assignments to backend/database.
- Enforce stall scoping from backend-owned data.
- Keep `admin` and `cashier` as the only web-app roles.
- Add backend cashier PIN/avatar login before enabling real cashier terminal login.
