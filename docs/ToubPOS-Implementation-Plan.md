# TouB POS Implementation Plan

## Recommended Next Step

The best option is to prioritize backend integration and security before adding more features. The current frontend is a strong UI prototype, but it still relies heavily on localStorage for authentication, users, stalls, products, and paid orders. For the final project, the system should prove that the frontend, backend, database, JWT authentication, authorization, and payment flow work together.

Primary goal:

> Convert TouB POS from a local frontend prototype into an integrated full-stack POS system with backend-owned authentication, stall isolation, order creation, and payment verification.

## User Model

TouB POS has three main web application roles under the newly implemented Role-Based Access Control (RBAC):

1. Owner
   - Has full business and system control.
   - Manages stalls, products, categories, staff, reports, and system settings.
   - Can create and manage all users (Owner, Manager, and Cashier).

2. Manager
   - Handles day-to-day operations and store management.
   - Can create and manage Cashier users only.

3. Cashier
   - Uses the frontline POS terminal.
   - Selects products, creates orders, confirms cash payment, and generates KHQR payment sessions.
   - Operations and product visibility are strictly scoped to their assigned stall.

Cook is not a main POS web-app user.

- Cooks use Telegram through either their personal Telegram account or a dedicated kitchen account provided by the owner.
- Cook authorization belongs to the Telegram integration, not the main web login system.
- In the database, cooks can be represented as authorized Telegram users/sessions linked to a stall, for example through `telegram_sessions`.

---

## Phase 1 - Stabilize Backend Security And Auth

Timeline: 2-3 days

### Tasks

1. Fix role authorization middleware usage.
   - Change `authorize(['admin', 'manager'])` to the correct style, then simplify protected admin routes to `authorize('admin')` if the manager role is removed.
   - Optionally update middleware to support both array and rest-argument styles.

2. Add environment validation at server startup.
   - Require `JWT_SECRET`.
   - Require database environment variables.
   - Require webhook secret before payment webhook is enabled.

3. Remove unsafe default production behavior.
   - Keep default `admin/admin123` only in development.
   - Do not log default credentials in non-development environments.

4. Block inactive users during login.
   - If `is_active === false`, return `403 Forbidden`.

5. Hash staff PINs.
   - Add `pin_hash` or replace plain `pin`.
   - Never return PINs from API responses.

6. Restrict CORS.
   - Allow only the frontend origin, for example `http://localhost:5173`.

### Acceptance Criteria

- Admin and manager routes are actually accessible to both roles.
- Admin/Owner routes are accessible only to the admin role.
- Disabled users cannot log in.
- JWT cannot run without `JWT_SECRET`.
- API responses never expose password hashes or PINs.
- Backend lint still passes.

---

## Phase 2 - Connect Frontend Authentication To Backend

Timeline: 2-3 days

### Tasks

1. Replace localStorage login with `/api/auth/login`.
   - Admin/Owner login should use username and password.
   - Cashier quick login can still use avatar plus PIN, but verification must happen through the backend.

2. Add a frontend API client.
   - Use `VITE_API_BASE_URL`.
   - Attach `Authorization: Bearer <token>` automatically.
   - Handle `401` by logging out.

3. Add an auth/session provider.
   - Store token.
   - Store current user.
   - Restore session on page refresh.

4. Replace `location.state` route guards.
   - Use `ProtectedRoute`.
   - Restrict `/admin-portal` to Admin/Owner.
   - Restrict `/cashier` to cashier.

5. Hide demo credentials outside demo mode.

### Acceptance Criteria

- Refreshing `/admin-portal` does not lose authentication.
- Direct navigation to protected pages redirects unauthenticated users.
- Cashiers cannot enter the admin portal.
- Admin/Owner cannot accidentally enter cashier mode unless explicitly supported.

---

## Phase 3 - Backend-Owned Products, Categories, Stalls, And Staff

Timeline: 3-4 days

### Tasks

1. **Audit & API Layer Extraction**
   - Audit all components using `api.js` (localStorage), `stallUtils.js`, and `useProducts.js`.
   - Extend `apiClient.js` or create a centralized frontend API service to handle `/api/products`, `/api/categories`, `/api/stalls`, and `/api/users` with automatic JWT inclusion.

2. **Backend-Owned Products & Categories**
   - Refactor `useProducts.js` to fetch from backend APIs.
   - Update Product and Category CRUD actions (create, update, delete) to send requests to the backend instead of local storage.
   - Implement loading, error, and empty states in `MenuCatalog` and `CategoryAdmin`.
   - Map backend fields (e.g., `price_usd`, `category_id`) to frontend component requirements gracefully.

3. **Backend-Owned Stalls & Staff Assignment**
   - Connect `StallAdmin.jsx` to `GET /api/stalls` and `POST /api/stalls`.
   - Implement stall-staff assignments using the backend `stall_staff` join table.
   - Ensure the new RBAC rules are enforced: only Owners and Managers can assign staff, and typically only Cashiers are assigned to specific stalls.

4. **Stall Scoping & Security Enforcement**
   - Implement a backend endpoint for cashiers to fetch their assigned stall (`GET /api/users/me/stall`).
   - Secure the products API so cashiers only receive products belonging to their assigned stall.
   - Add strong backend validation: product prices must be positive, `stall_id` and `category_id` must exist, and roles must be correctly applied.

### Acceptance Criteria

- Products, categories, stalls, and staff assignments persist in MySQL and survive a browser cache clear.
- Frontend displays clear loading spinners or messages while fetching data.
- Cashier's product catalog is strictly limited to their backend-assigned stall.
- Owner and Manager users can successfully perform CRUD operations via the UI that reflect in the database.
- Backend rejects invalid relationships (e.g., assigning a user to a non-existent stall).

---

## Phase 4 - Real Order Creation And Cash Payment Flow

Timeline: 3-4 days

### Tasks

1. Replace localStorage order creation with `POST /api/orders`.
   - Send only product ID, quantity, notes, and payment method.
   - Do not send cashier ID, stall ID, prices, totals, or paid status from the frontend.

2. Move total calculation fully to backend.
   - Backend fetches products from database.
   - Backend snapshots item name and price.
   - Backend calculates subtotal and total.

3. Validate order items.
   - Quantity must be integer.
   - Product must exist.
   - Product must be visible.
   - Product must belong to the cashier's stall.

4. Add cash confirmation endpoint.
   - Example: `POST /api/orders/:id/confirm-cash`.
   - Only the cashier who created the order or the Admin/Owner can confirm it.

5. Update order statuses.
   - Use clear states such as `pending_payment`, `paid`, `cancelled`, `completed`.

### Acceptance Criteria

- Frontend cannot mark an order as paid by editing localStorage.
- Backend rejects products outside the cashier's assigned stall.
- Cash order requires explicit confirmation.
- Order history is loaded from backend.

---

## Phase 5 - Secure KHQR Payment Flow

Timeline: 4-5 days

### Tasks

1. Generate QR payload on backend.
   - Frontend should display `qrPayload` from the backend.
   - Do not build QR data from the amount in React.

2. Add payment reference.
   - Store a unique payment reference per KHQR order.
   - Webhook should use payment reference, not raw order ID.

3. Secure webhook endpoint.
   - Verify webhook signature or shared secret.
   - Reject unsigned requests.

4. Make webhook idempotent.
   - If order is already paid, return success without duplicating side effects.

5. Add real-time payment notification.
   - Use WebSocket or polling.
   - Notification must go only to the cashier/session that created the order.

6. Remove simulated payment success.
   - Remove auto-confirm timer.
   - Remove click-to-confirm QR behavior.

### Acceptance Criteria

- KHQR order stays pending until backend confirmation.
- Fake webhook requests without signature are rejected.
- Duplicate webhook calls do not create duplicate kitchen tickets.
- Only the correct cashier screen receives payment success.

---

## Phase 6 - Telegram Kitchen Flow

Timeline: 3-4 days

### Tasks

1. Send kitchen ticket only after order is paid.

2. Add Telegram bot service.
   - Format order ticket.
   - Escape user-controlled text.
   - Include item quantities, notes, cashier, stall, and timestamp.

3. Store Telegram message ID.
   - Save `telegram_msg_id` on order.

4. Implement cook "Done" callback.
   - Validate Telegram user ID against authorized Telegram kitchen users/sessions.
   - Update `kitchen_status`.
   - Edit Telegram message to remove action buttons.

### Acceptance Criteria

- Unpaid orders are not sent to kitchen.
- Unauthorized Telegram users cannot mark orders done.
- Kitchen status updates persist in database.

---

## Phase 7 - Reports, Database Quality, And Documentation

Timeline: 3-4 days

### Tasks

1. Move report queries into `report.service.js`.

2. Use database aggregation for reports.
   - Daily revenue.
   - Monthly revenue.
   - Top products.
   - Staff performance.

3. Add indexes.
   - `orders(stall_id, created_at)`.
   - `orders(status, created_at)`.
   - `order_items(order_id)`.
   - `products(stall_id, is_visible)`.
   - `stall_staff(user_id, stall_id)`.

4. Replace `sequelize.sync({ alter: true })` with migrations or documented SQL scripts.

5. Complete Swagger documentation.
   - Auth routes.
   - Product CRUD.
   - Category CRUD.
   - Stall/staff routes.
   - Order routes.
   - Payment webhook.
   - Report routes.

6. Prepare Postman, Swagger, or ApiDog test evidence for the final defense.

### Acceptance Criteria

- Reports are generated by backend/database, not frontend localStorage.
- SQL scripts match Sequelize models.
- Swagger requests are testable.
- Required database deliverables are ready.

---

## Phase 8 - Testing And Final Defense Preparation

Timeline: 2-3 days

### Tasks

1. Add backend API tests or documented manual test cases.
   - Login success/failure.
   - Protected route access.
   - Cashier product listing.
   - Order creation.
   - Cash confirmation.
   - KHQR webhook.
   - Admin CRUD.

2. Add frontend smoke tests or manual QA checklist.
   - Login.
   - Admin product edit.
   - Stall assignment.
   - Cashier checkout.
   - Payment pending/success.
   - Order history.

3. Prepare school deliverables.
   - REST API with separated routes/controllers/services/repositories.
   - JWT auth and protected routes.
   - Role/permission management.
   - Swagger documentation.
   - ERD and relational model.
   - SQL table creation, insertion, and query scripts.
   - HCI personas, user stories, flow, and mockups.
   - UML diagrams: use case, activity, class, sequence.

### Acceptance Criteria

- The team can demo an end-to-end flow without editing localStorage.
- Backend, frontend, and database are all visibly connected.
- Final defense materials match the implemented system.

---

## Suggested Sprint Order

| Sprint | Focus | Outcome |
|---|---|---|
| Sprint 1 | Backend auth/security plus frontend login integration | Real JWT login and protected routes |
| Sprint 2 | Products, categories, stalls, staff assignments | Admin portal uses database-backed data |
| Sprint 3 | Orders and cash checkout | Cashier creates real backend orders |
| Sprint 4 | KHQR webhook and payment notification | Backend-owned paid status |
| Sprint 5 | Telegram kitchen and reports | Fulfillment plus analytics |
| Sprint 6 | Testing, Swagger, SQL scripts, UML, final cleanup | Defense-ready project |

---

## Team Task Split

### Developer 1 - Backend/API

- Auth hardening.
- Role middleware.
- Order service.
- Payment webhook.
- Swagger docs.

### Developer 2 - Frontend/UI Integration

- API client.
- Auth provider.
- Protected routes.
- Replace localStorage modules.
- Loading/error states.

### Developer 3 - Database/Documentation

- ERD and relational model.
- SQL scripts.
- Indexes.
- Report queries.
- UML diagrams and testing evidence.

---

## Definition Of Done

TouB POS is ready for final defense when:

- A cashier logs in through backend authentication.
- The cashier sees only assigned-stall products.
- The cashier creates an order through the backend.
- Cash payment requires confirmation.
- KHQR payment remains pending until backend verification.
- Orders are saved in MySQL.
- Admin can manage products, users, stalls, and assignments from the UI.
- Reports are generated from database orders.
- Swagger/API docs are complete.
- SQL scripts, ERD, RM, UML, and HCI deliverables are prepared.
