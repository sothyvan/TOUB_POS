# Phase 4.5 Security Hardening Plan

## 1. Goal

Phase 4.5 is a focused security hardening phase for TouB POS.

The goal is not to redesign authentication. The project will keep the current JWT access token in `localStorage` because it is simple, already integrated, and acceptable for a Year 2 final project when the risks are clearly understood and documented.

The goal is to make the current system more professional by hardening the risky parts around login, cashier PINs, security headers, CORS, sensitive data exposure, and destructive owner actions.

Phase 4.5 should improve security without changing the main user experience:

- Owner and Manager still use username/password login.
- Cashier PIN login still remains.
- Cashier sessions still last 8 hours.
- RBAC still uses `owner`, `manager`, and `cashier`.
- Orders remain backend-owned.
- No HttpOnly refresh-token cookie migration happens in this phase.

Success looks like:

- Cashier PINs are hashed, not stored as plain text.
- Login endpoints are rate-limited.
- Express uses Helmet security headers.
- CORS remains restricted to trusted frontend origins.
- Passwords, PINs, hashes, and tokens are not logged or returned.
- Dangerous owner actions require stronger confirmation.
- The team can explain why localStorage JWT is acceptable for this project, and what the production upgrade path would be.

## 2. Current Security Model

### Authentication

TouB POS currently uses JWT authentication.

The frontend stores:

- JWT token in `localStorage` key `toub-auth-token`
- current public user object in `localStorage` key `toub-current-user`

The frontend API client reads the token and attaches it to protected requests:

```http
Authorization: Bearer <token>
```

The backend verifies the token in the auth middleware and attaches the decoded user to `req.user`.

Current JWT payload is minimal:

- `id`
- `username`
- `role`

JWT expiry is 8 hours, matching a cashier shift.

### Roles

TouB POS has three official web-app roles:

| Role | Meaning |
|------|---------|
| `owner` | Full system owner |
| `manager` | Operational supervisor |
| `cashier` | Frontline POS staff |

Important RBAC rules:

- Owner can manage Owner, Manager, and Cashier users.
- Manager can manage Cashier users only.
- Cashier cannot access management APIs.
- Cashier order creation is stall-scoped.
- Cash payment confirmation is allowed for the creating Cashier, Owner, or Manager.

### Cashier PIN Login

Cashier PIN login now exists through:

```http
POST /api/auth/pin
```

Current issue:

- PINs are still stored as plain text in `users.pin`.
- The `users.pin` database field is currently too short for bcrypt hashes.

Phase 4.5 should fix this by hashing PINs with bcrypt.

### localStorage JWT Decision

For this final project, localStorage JWT is accepted because:

- It keeps the implementation understandable for the team.
- It avoids refresh-token cookie complexity.
- It works well with the current Vite frontend and Express API.
- Sessions are limited to 8 hours.
- Backend RBAC is still the real security boundary.

However, the team should be honest about the tradeoff:

- localStorage tokens can be stolen if the app has an XSS bug.
- A stolen Owner token is high impact.
- A stolen Cashier token can create or confirm allowed cashier actions during the token lifetime.

Production upgrade path:

- short-lived access token
- HttpOnly refresh token cookie
- refresh token rotation
- CSRF strategy
- stronger audit logging
- device/session revocation

## 3. Risks Being Addressed

### 1. Plain-Text Cashier PINs

Current risk:

- If the database is leaked, cashier PINs are immediately visible.
- Staff may reuse simple PINs.
- Plain PINs look unprofessional in a final defense.

Phase 4.5 fix:

- Hash PINs using bcrypt.
- Compare PINs with `bcrypt.compare()`.
- Never return PINs or PIN hashes in API responses.

Important database note:

- `users.pin` must become large enough for bcrypt hashes.
- Use `VARCHAR(255)` in SQL and Sequelize, similar to password hashes.

### 2. Brute Force Against Username/Password Login

Current risk:

- Attackers can repeatedly guess Owner or Manager passwords.

Phase 4.5 fix:

- Add rate limiting to `POST /api/auth/login`.
- Return a clean `429 Too Many Requests` message after too many attempts.

Suggested limit:

- 5 attempts per 15 minutes per IP for username/password login.

### 3. Brute Force Against Cashier PIN Login

Current risk:

- A 4-digit PIN has only 10,000 possible combinations.
- Without rate limiting, guessing is too easy.

Phase 4.5 fix:

- Add stricter rate limiting to `POST /api/auth/pin`.
- Consider limiting by IP and by `userId`.

Suggested limit:

- 5 attempts per 5 minutes per IP/user combination.

For this project, an in-memory limiter is acceptable. In production, use Redis or a database-backed limiter so limits survive server restarts and work across multiple backend instances.

### 4. Missing Security Headers

Current risk:

- Express does not currently use Helmet.
- Some browser protections are not explicitly configured.

Phase 4.5 fix:

- Install and apply `helmet`.
- Keep it compatible with local Vite development and Swagger docs.

Helmet helps with headers such as:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- basic cross-origin protections

### 5. CORS Misconfiguration

Current state:

- Backend uses `FRONTEND_ORIGIN`.
- Development default is `http://localhost:5173`.
- Production requires `FRONTEND_ORIGIN`.

Phase 4.5 task:

- Review and keep this behavior.
- Confirm no wildcard `*` origin is used.
- Confirm only expected origins can call the API from browsers.

### 6. Sensitive Data Leakage

Current good behavior:

- User listing excludes `password` and `pin`.
- Auth responses return token and public user data only.
- Logger masks top-level `password`, `pin`, `token`, `device_token`, and `password_hash`.

Remaining risks:

- Nested objects may still contain sensitive keys.
- Error logs in development can print full error objects.
- Future code may accidentally return PIN hashes.

Phase 4.5 fix:

- Review all auth/user responses.
- Improve request logger sanitization to be recursive if needed.
- Make sure password hashes, PIN hashes, and tokens never appear in successful API responses.
- Avoid logging raw request bodies for auth endpoints if a simpler route/status log is enough.

### 7. Weak Destructive Confirmations

Current risk:

- Owner destructive actions like deleting users/products may only require a normal modal click.
- A misclick can damage data.

Phase 4.5 fix:

- For high-impact Owner actions, require a stronger confirmation.
- Example: type the resource name or type `DELETE`.

Recommended actions to protect:

- delete user
- deactivate Owner/Manager
- delete product
- delete category
- delete stall
- revoke terminal/device token when implemented

Keep Manager restrictions intact:

- Manager must not gain Owner-only permissions.
- Manager can still manage allowed operational resources if the current RBAC policy allows it.

## 4. Implementation Steps

### Step 1: Add Security Dependencies

Goal:

Install backend security middleware.

Likely packages:

- `helmet`
- `express-rate-limit`

Why it matters:

- `helmet` adds useful browser security headers.
- `express-rate-limit` slows brute-force login attacks.

Checkpoint:

- `backend/package.json` and `backend/package-lock.json` include the new dependencies.
- Backend starts successfully.

### Step 2: Hash Cashier PINs

Goal:

Store cashier PINs as bcrypt hashes instead of plain text.

Files to update:

- `backend/src/models/user.model.js`
- `backend/src/controllers/user.controller.js`
- `backend/src/services/auth.service.js`
- `backend/src/repositories/user.repository.js`
- `docs/database/schema.sql`
- `docs/database/queries.sql`

What to change:

- Increase `User.pin` field length from `STRING(10)` to `STRING(255)`.
- Update SQL `users.pin` from `VARCHAR(10)` to `VARCHAR(255)`.
- Hash new PINs in user creation.
- Hash changed PINs in user update.
- Use `bcrypt.compare(pin, user.pin)` during PIN login.
- Keep PIN fields blank in the frontend edit form unless a new PIN is typed.

Migration concern:

- Existing development rows may contain plain-text PINs.
- Add a development-only compatibility migration, or document a reset step.
- Recommended simple development path: reset/reseed local DB after this change.
- If preserving data, detect non-bcrypt PINs and hash them once during startup or a manual SQL/script step.

How to recognize bcrypt hash:

- Usually starts with `$2a$`, `$2b$`, or `$2y$`.

Checkpoint:

- MySQL no longer shows plain `1111` style PINs.
- PIN login still works.
- Wrong PIN returns `401`.

### Step 3: Rate Limit Username/Password Login

Goal:

Slow down brute-force attacks against Owner/Manager accounts.

Files to update:

- `backend/src/routes/auth.routes.js`
- optionally create `backend/src/middleware/rate-limit.middleware.js`

Recommended rule:

- Apply limiter only to `POST /api/auth/login`.
- Limit to around 5 failed/total attempts per 15 minutes per IP.
- Return a clear `429` message.

Example behavior:

```json
{
  "success": false,
  "message": "Too many login attempts. Please try again later."
}
```

Checkpoint:

- After repeated bad password attempts, endpoint returns `429`.
- Other API endpoints still work.

### Step 4: Rate Limit Cashier PIN Login

Goal:

Protect the 4-digit cashier PIN flow.

Files to update:

- `backend/src/routes/auth.routes.js`
- optionally `backend/src/middleware/rate-limit.middleware.js`

Recommended rule:

- Apply a stricter limiter to `POST /api/auth/pin`.
- Limit by IP and target cashier user ID if possible.
- For this project, 5 attempts per 5 minutes is reasonable.

Why it matters:

- PINs are short by design because cashiers need fast login.
- Rate limiting is the protection that makes short PINs safer.

Checkpoint:

- Repeated wrong PIN attempts eventually return `429`.
- Correct PIN works again after limiter window resets.

### Step 5: Add Helmet Security Headers

Goal:

Add professional default security headers to the Express API.

Files to update:

- `backend/src/app.js`

What to change:

- Import `helmet`.
- Register `app.use(helmet(...))` before routes.
- Keep CORS and Swagger compatibility in mind.

Suggested approach:

- Start with default Helmet.
- If Swagger docs or local development breaks, adjust only the specific policy needed.

Checkpoint:

- `GET /api/health` still works.
- `GET /api/docs` still opens in development.
- Response headers include Helmet-managed headers.

### Step 6: Review CORS Config

Goal:

Confirm only trusted frontend origins can call the API from browsers.

Files to review:

- `backend/src/config/env.js`
- `backend/src/app.js`
- `backend/.env`
- `backend/.env.example`

Current expected behavior:

- Development fallback: `http://localhost:5173`
- Production: must set `FRONTEND_ORIGIN`
- No wildcard origin

What to check:

- `FRONTEND_ORIGIN` is documented in `.env.example`.
- Production startup fails clearly if `FRONTEND_ORIGIN` is missing.
- CORS error messages do not expose sensitive details.

Checkpoint:

- Frontend dev server can call backend.
- A random origin is rejected.

### Step 7: Review Sensitive Data Logging and Responses

Goal:

Make sure secrets do not leak through logs or API responses.

Files to review:

- `backend/src/middleware/logger.middleware.js`
- `backend/src/middleware/error.middleware.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/controllers/user.controller.js`
- `backend/src/repositories/user.repository.js`
- `frontend/src/services/apiClient.js`

What to check:

- Auth responses do not return password, PIN, password hash, or PIN hash.
- User list responses exclude password and PIN.
- Request logs mask sensitive fields.
- Logger handles nested sensitive fields if needed.
- Tokens are not printed in frontend console.
- Production error responses do not expose stack traces.

Checkpoint:

- Login response contains only token plus public user.
- User list does not contain `password` or `pin`.
- Backend logs do not show submitted passwords/PINs.

### Step 8: Add Stronger Owner Destructive Confirmations

Goal:

Reduce accidental destructive actions in the management UI.

Files likely to review:

- `frontend/src/components/AdminWorkspace.jsx`
- `frontend/src/components/ProductOwner.jsx` or current product management component
- `frontend/src/components/CategoryOwner.jsx`
- `frontend/src/components/StallOwner.jsx`
- `frontend/src/components/UserOwner.jsx`
- `frontend/src/components/staff/StaffList.jsx`
- shared confirmation components in `frontend/src/components/ui/`

What to change:

- For dangerous Owner actions, require stronger confirmation.
- Example: user must type `DELETE` or the resource name.
- Keep normal confirmation for lower-risk operational actions if needed.

Backend reminder:

- UI confirmation improves safety, but backend RBAC remains the real security boundary.
- Do not rely on frontend confirmation for authorization.

Checkpoint:

- Owner cannot delete a user/product/stall by one accidental click.
- Manager still cannot perform Owner-only actions.

### Step 9: Document localStorage JWT Decision

Goal:

Show security awareness in final documentation.

Files likely to update:

- `docs/api/auth-flow.md`
- `context/architecture.md`
- `context/progress-tracker.md`
- possibly `docs/ToubPOS-Implementation-Plan.md`

What to document:

- Current token storage: localStorage.
- Why this is accepted for the final project.
- Risks of XSS.
- Mitigations added in Phase 4.5.
- Production recommendation: HttpOnly refresh token architecture.

Suggested explanation:

TouB POS keeps localStorage JWT for the final project because it is simple, understandable, and already integrated. The backend still enforces authorization. The main risk is XSS token theft, so the project avoids logging tokens, keeps token lifetime to 8 hours, adds security headers, and documents HttpOnly refresh cookies as the production upgrade path.

Checkpoint:

- Team can explain this clearly during the final defense.

### Step 10: Run Verification

After implementation, run:

```bash
cd backend
npm run lint
```

```bash
cd frontend
npm run lint
```

```bash
cd frontend
npm run build
```

Optional manual checks:

- Start backend.
- Start frontend.
- Test login, PIN login, rate limiting, and protected routes.

## 5. Files Likely To Change

### Backend

`backend/package.json`

- Add `helmet`.
- Add `express-rate-limit`.

`backend/package-lock.json`

- Updates after installing backend dependencies.

`backend/src/app.js`

- Register Helmet middleware.
- Keep CORS and JSON middleware order sensible.

`backend/src/routes/auth.routes.js`

- Apply rate limiter to `/login`.
- Apply separate rate limiter to `/pin`.

`backend/src/middleware/rate-limit.middleware.js`

- Suggested new file for login and PIN limiter configuration.
- Keeps route file clean.

`backend/src/models/user.model.js`

- Change `pin` storage from short plain-text field to hash-sized field.

`backend/src/controllers/user.controller.js`

- Hash PIN on create/update.
- Validate PIN shape before hashing.
- Do not return PIN or PIN hash.

`backend/src/services/auth.service.js`

- Replace plain string PIN comparison with `bcrypt.compare()`.
- Keep JWT payload minimal.

`backend/src/repositories/user.repository.js`

- Ensure auth can fetch PIN hash for comparison.
- Ensure normal user reads exclude sensitive fields.

`backend/src/middleware/logger.middleware.js`

- Improve sensitive field masking if needed.
- Consider recursive masking.

`backend/src/middleware/error.middleware.js`

- Confirm production responses do not expose stack traces.

`backend/.env.example`

- Confirm `FRONTEND_ORIGIN`, `JWT_SECRET`, and relevant security settings are documented.

### Database Docs

`docs/database/schema.sql`

- Update `users.pin` to `VARCHAR(255)`.
- Document that PIN stores a bcrypt hash.

`docs/database/queries.sql`

- Add/update reference SQL for PIN hash migration if needed.

### Frontend

`frontend/src/components/ui/ConfirmDialog.jsx`

- May need an optional typed-confirmation mode.

`frontend/src/components/AdminWorkspace.jsx`

- Existing delete confirmation may need stronger typed confirmation for destructive actions.

`frontend/src/components/staff/StaffList.jsx`

- User delete/deactivate and PIN edit flows may need clearer confirmation behavior.

`frontend/src/services/api.js`

- Confirm PIN/password are only sent when intentionally changed.

### Documentation

`docs/api/auth-flow.md`

- Document localStorage JWT acceptance and production upgrade path.

`context/architecture.md`

- Add Phase 4.5 security hardening notes if architecture-level assumptions change.

`context/progress-tracker.md`

- Update after Phase 4.5 implementation is complete.

## 6. Manual Test Plan

### A. PIN Hashing

1. Create a Cashier with PIN `1111`.
2. Check MySQL `users` table.
3. Confirm `pin` is not `1111`.
4. Confirm it looks like a bcrypt hash, such as `$2b$...`.
5. Log in with PIN `1111`.
6. Expected: login succeeds.
7. Log in with PIN `9999`.
8. Expected: login fails with `401`.
9. Call user list API.
10. Expected: response does not include `pin`.

### B. Username/Password Rate Limiting

1. Send repeated bad login requests to `POST /api/auth/login`.
2. After the configured limit, expect `429`.
3. Confirm the response is clean and does not reveal whether the username exists.
4. Confirm unrelated endpoints still work.

### C. Cashier PIN Rate Limiting

1. Choose one cashier profile.
2. Submit repeated wrong PINs to `POST /api/auth/pin`.
3. After the configured limit, expect `429`.
4. Wait for the window to expire.
5. Submit the correct PIN.
6. Expected: login succeeds.

### D. Helmet Headers

1. Start backend.
2. Request:

```bash
curl -i http://localhost:3000/api/health
```

3. Confirm security headers exist.
4. Open Swagger docs in development.
5. Expected: docs still work.

### E. CORS

1. Start backend with development frontend origin.
2. Start Vite frontend.
3. Confirm frontend API calls work.
4. Try a request from a different browser origin or API tool with a fake `Origin` header.
5. Expected: browser-style CORS request is rejected.

### F. Sensitive Data Exposure

1. Log in with username/password.
2. Confirm response includes token and public user only.
3. Log in with cashier PIN.
4. Confirm response includes token and public user only.
5. Fetch users as Owner.
6. Confirm no `password`, `password_hash`, `pin`, or PIN hash appears.
7. Check backend logs.
8. Confirm submitted password/PIN/token values are masked or absent.

### G. Destructive Confirmation

1. Log in as Owner.
2. Try deleting a user/product/stall.
3. Expected: stronger confirmation is required.
4. Try cancelling confirmation.
5. Expected: no deletion happens.
6. Complete the required confirmation.
7. Expected: deletion proceeds only if backend RBAC allows it.
8. Log in as Manager.
9. Try Owner-only user management action.
10. Expected: backend rejects it even if frontend is bypassed.

### H. Regression Tests

1. Owner login still works.
2. Manager login still works.
3. Cashier PIN login still works.
4. Cashier assigned-stall product list still works.
5. Cashier cash order creation and confirmation still works.
6. Owner/Manager order history still works.
7. Frontend refresh persistence still works.
8. Logout still clears session.

## 7. Definition Of Done

Phase 4.5 is complete when:

- Cashier PINs are stored as bcrypt hashes.
- Existing development PIN data has a clear migration/reset path.
- `POST /api/auth/login` is rate-limited.
- `POST /api/auth/pin` is rate-limited.
- Helmet is installed and active.
- CORS remains restricted to the configured frontend origin.
- API responses never return passwords, password hashes, PINs, PIN hashes, or tokens except the intentional login token.
- Backend logs do not expose raw passwords, PINs, or tokens.
- Owner destructive actions have stronger confirmation where appropriate.
- Manager cannot bypass Owner-only user-management actions.
- Documentation explains why localStorage JWT is accepted for this final project.
- Documentation explains the production upgrade path to HttpOnly refresh-token cookies.
- Backend lint passes.
- Frontend lint passes.
- Frontend build passes.
- Manual tests for login, PIN login, rate limiting, security headers, CORS, and sensitive data exposure have been completed.

