# Phase 3 Implementation Worksheet: Backend-Owned Products, Categories, Stalls, and Staff

Welcome to Phase 3. This worksheet is for learning by building. It does not give you a finished implementation to copy. Instead, it guides you and your teammates through the thinking, files, tests, and checkpoints needed to connect TouB POS product, category, stall, and staff assignment data to the backend database.

Project stack reminder:

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + Sequelize + MySQL
- Web-app roles: `admin` and `cashier`
- Cook is not a web-app user. Cook belongs to Telegram integration later.

## 1. Mission Briefing

### The Quest

In Phase 1, the backend became safer: JWT secrets, role authorization, CORS, login hardening, and development-only admin seeding.

In Phase 2, the frontend login flow started using real backend JWT authentication.

In Phase 3, your mission is to move important business data out of browser `localStorage` and into the backend database.

You are changing:

- Products from local browser data to backend API data.
- Categories from local browser data to backend API data.
- Stalls from local browser data to backend API data.
- Staff-to-stall assignment from local browser data to database-backed assignment.
- Cashier product visibility so each cashier only sees products for their assigned stall.

### Why localStorage is not enough anymore

`localStorage` is useful for quick prototypes, but it is not a real shared database.

Problems with `localStorage`:

- Data exists only in one browser on one computer.
- Clearing browser storage deletes the data.
- Two users do not automatically share the same products or stalls.
- It is easy for users to edit localStorage manually.
- It cannot safely enforce role rules like "cashier only sees assigned stall products."

### What "backend as source of truth" means

"Source of truth" means the backend database owns the real data.

The frontend can display data, edit forms, and temporarily hold state, but the final truth lives in MySQL through the backend API.

Example:

- The admin creates a product in the UI.
- The frontend sends `POST /api/products`.
- The backend validates the request.
- Sequelize saves the product in MySQL.
- The frontend reloads or updates its product list from the backend response.
- If localStorage is cleared, the product still exists because MySQL owns it.

### What success looks like

Phase 3 is complete when:

- Admin can manage products, categories, stalls, and staff assignments using backend APIs.
- Cashier sees only products for their assigned stall.
- Product/category/stall/staff source of truth is no longer localStorage.
- Backend rejects invalid product/category/stall data.
- Refreshing the page keeps data because it comes from the database.
- Clearing browser localStorage does not delete products, categories, stalls, or assignments.
- `npm run lint` and `npm run build` pass for the frontend.
- Backend tests or manual API tests confirm validation and role protection.

## 2. Current System Map

This section documents what exists now so you know where to work. Treat it like your treasure map.

### Frontend files involved

Likely Phase 3 frontend files:

- `frontend/src/services/apiClient.js`
  - Real backend API helper added in Phase 2.
  - Attaches JWT with `Authorization: Bearer <token>`.
  - Currently focused on auth, but should be extended for product/category/stall/user API calls.

- `frontend/src/services/api.js`
  - Prototype localStorage API.
  - Contains localStorage-backed `products`, `categories`, `users`, and `orders` helpers.
  - Phase 3 should replace product/category/stall/staff usage with backend-backed functions.

- `frontend/src/hooks/useProducts.js`
  - Loads categories and products from the localStorage mock API.
  - Holds product/category form state and filtering logic.
  - This is one of the main files to refactor.

- `frontend/src/hooks/useUsers.js`
  - Loads staff/users from localStorage mock API.
  - Phase 3 may connect admin staff screens to backend users.

- `frontend/src/utils/stallUtils.js`
  - Uses localStorage keys such as `toub_stalls` and `toub_stall_assignments`.
  - Contains default stall and assignment data.
  - Phase 3 should replace this with backend/database-backed stall and assignment APIs.

- `frontend/src/components/MenuCatalog.jsx`
  - Admin product and category management UI.
  - Uses frontend product fields like `price`, `categoryId`, `image`, and `available`.
  - Has stall visibility UI that must be checked against the backend data model.

- `frontend/src/components/CategoryAdmin.jsx`
  - Category management UI used by the menu/catalog area.

- `frontend/src/components/StallAdmin.jsx`
  - Admin stall management and staff assignment UI.
  - Currently reads and writes stall and assignment data through localStorage utilities.

- `frontend/src/components/UserAdmin.jsx`
  - Admin user/staff management UI.

- `frontend/src/components/staff/StaffList.jsx`
  - Staff listing/admin UI.

- `frontend/src/components/staff/StaffAllocation.jsx`
  - Staff allocation UI.
  - Check whether this is shift scheduling or stall assignment before changing it.

- `frontend/src/pages/AdminPortalPage.jsx`
  - Wires admin hooks and admin screens together.

- `frontend/src/pages/CashierPage.jsx`
  - Currently uses local stall assignment lookup.
  - Must eventually load the cashier's assigned stall from the backend.

- `frontend/src/components/CashierScreen.jsx`
  - Cashier product catalog/order UI.
  - Should receive already-scoped products or request scoped products through a hook.

### Backend files involved

Likely Phase 3 backend files:

- `backend/src/routes/product.routes.js`
  - Existing authenticated product routes.
  - `GET /api/products`
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`

- `backend/src/controllers/product.controller.js`
  - Handles product request/response logic.
  - Currently has basic required-field checks.
  - Needs stronger validation and role-aware product listing.

- `backend/src/repositories/product.repository.js`
  - Talks to the Sequelize `Product` model.
  - Good place for database queries, not request validation.

- `backend/src/routes/category.routes.js`
  - Existing admin-only category routes.

- `backend/src/controllers/category.controller.js`
  - Handles category CRUD.
  - Should validate related stall IDs where needed.

- `backend/src/repositories/category.repository.js`
  - Talks to the Sequelize `Category` model.

- `backend/src/routes/stall.routes.js`
  - Existing admin-only stall routes.

- `backend/src/controllers/stall.controller.js`
  - Handles stall CRUD.

- `backend/src/repositories/stall.repository.js`
  - Talks to the Sequelize `Stall` model.

- `backend/src/routes/user.routes.js`
  - Existing admin-only user routes.

- `backend/src/controllers/user.controller.js`
  - Handles user CRUD.
  - Already validates user role as `admin` or `cashier`.

- `backend/src/repositories/user.repository.js`
  - Talks to the Sequelize `User` model.

- `backend/src/models/product.model.js`
  - Product fields include `stall_id`, `category_id`, `name`, `price_usd`, `price_khr`, `image_url`, and `is_visible`.

- `backend/src/models/category.model.js`
  - Category fields include `stall_id`, `name`, and `tone`.

- `backend/src/models/stall.model.js`
  - Stall fields include `name`, `device_token`, and `telegram_chat_id`.

- `backend/src/models/stall-staff.model.js`
  - Join table between stalls and users.
  - Useful for staff/stall assignment.

- `backend/src/models/index.js`
  - Defines Sequelize associations such as `Stall.belongsToMany(User)` and `User.belongsToMany(Stall)`.

- `docs/database/schema.sql`
  - Must stay synchronized if you change database structure.

- `docs/database/queries.sql`
  - Should stay synchronized if repository query behavior changes significantly.

### Current localStorage usage to replace

Known localStorage-backed areas:

- `frontend/src/services/api.js`
  - Product CRUD.
  - Category CRUD.
  - User/staff CRUD.
  - Orders are also localStorage here, but orders are not Phase 3 unless needed for product display.

- `frontend/src/utils/stallUtils.js`
  - `toub_stalls`
  - `toub_stall_assignments`

- `frontend/src/components/staff/StaffAllocation.jsx`
  - May use `toub_shift_matrix`.
  - Decide carefully whether this represents Phase 3 stall assignment or a later scheduling feature.

### Existing API routes you can reuse

These routes already exist and are good starting points:

- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/stalls`
- `POST /api/stalls`
- `PUT /api/stalls/:id`
- `DELETE /api/stalls/:id`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Missing backend routes or behavior to investigate

You may need to add small backend API support for:

- Assigning cashiers to stalls.
- Reading a cashier's assigned stall.
- Returning cashier-scoped products.
- Validating that `stall_id` exists before saving products/categories.
- Validating that `category_id` exists before saving products.
- Validating positive product prices.
- Ensuring cashier users cannot access all product data.

Possible API shapes to discuss with the team:

- `GET /api/users/me/stall`
- `GET /api/stalls/:id/staff`
- `PUT /api/stalls/:id/staff`
- `POST /api/stalls/:stallId/staff/:userId`
- `DELETE /api/stalls/:stallId/staff/:userId`

Do not add all of these blindly. Pick the smallest API surface that supports the UI and keeps authorization clear.

### Important data shape mismatch

The frontend prototype and backend database do not use exactly the same field names.

Frontend product shape often looks like:

- `name`
- `price`
- `categoryId`
- `image`
- `available`
- `stallVisibility`

Backend product shape uses:

- `name`
- `price_usd`
- `price_khr`
- `category_id`
- `stall_id`
- `image_url`
- `is_visible`

Before coding, decide where mapping happens:

- API layer can convert backend fields to UI fields.
- UI can be updated to use backend field names.
- A custom hook can normalize data between backend and components.

Good beginner-friendly choice: keep UI components mostly stable, and do mapping inside hooks or API service functions.

## 3. Concept Lesson

### Frontend state vs server state

Frontend state is temporary data inside React.

Examples:

- Is the modal open?
- What is typed into the product name input?
- Is the request loading?
- What error message should be shown?

Server state is data owned by the backend/database.

Examples:

- Products.
- Categories.
- Stalls.
- Users.
- Staff/stall assignments.

In Phase 3, products, categories, stalls, and assignments become server state.

### CRUD operations

CRUD means:

- Create: add new data.
- Read: fetch existing data.
- Update: edit existing data.
- Delete: remove existing data.

In REST APIs, CRUD often maps like this:

- `GET /api/products` reads products.
- `POST /api/products` creates a product.
- `PUT /api/products/:id` updates a product.
- `DELETE /api/products/:id` deletes a product.

### REST API flow

Follow the request from the button click to the database:

1. Component: user clicks "Save Product".
2. Hook: `useProducts` prepares loading/error state.
3. API client: sends HTTP request with JWT.
4. Backend route: matches URL and HTTP method.
5. Middleware: authenticates JWT and checks role.
6. Controller: validates request body and sends response.
7. Service/repository: applies business/database logic.
8. Sequelize: converts JavaScript method calls into SQL.
9. MySQL: stores or reads the real data.
10. Response travels back to the frontend.
11. Hook updates state.
12. Component re-renders.

Tiny example flow:

```txt
MenuCatalog -> useProducts -> apiClient -> /api/products -> product.controller -> product.repository -> Product model -> MySQL
```

### JWT Authorization header

After login, the frontend stores a JWT token. Every protected API call must send:

```txt
Authorization: Bearer <token>
```

The backend reads this token and asks:

- Is this token valid?
- Which user is this?
- What role does this user have?
- Is this route allowed for that role?

### Stall scoping

Stall scoping means users only see data they are allowed to see for their stall.

For TouB POS:

- `admin` can manage products, categories, stalls, and assignments.
- `cashier` should only see products for their assigned stall.
- `cashier` should not be able to manage all products or change stall assignments.

This rule belongs mostly on the backend. The frontend can hide buttons, but the backend must enforce the actual protection.

### Validation and why frontend validation is not enough

Frontend validation helps users quickly fix mistakes.

Backend validation protects the system.

Example:

- The frontend can prevent submitting a product with price `-5`.
- But a user could bypass the frontend and call the API directly.
- Therefore, the backend must also reject negative prices.

Backend should validate:

- Product name is required.
- Prices are positive numbers.
- `stall_id` exists.
- `category_id` exists.
- User role is only `admin` or `cashier`.
- Privileged fields are not trusted from the frontend.

### Loading, error, and empty states

When data comes from a server, it may take time or fail.

Your UI should show:

- Loading state: "Loading products..."
- Error state: "Could not load products."
- Empty state: "No products yet."
- Success state: product list appears.

This makes the app feel stable instead of confusing.

## 4. Step-by-Step Implementation Tasks

### Task 1: Audit existing localStorage product/category/stall/staff code

Goal:

- Find every place where Phase 3 data still comes from localStorage.

Files to open:

- `frontend/src/services/api.js`
- `frontend/src/hooks/useProducts.js`
- `frontend/src/hooks/useUsers.js`
- `frontend/src/utils/stallUtils.js`
- `frontend/src/components/MenuCatalog.jsx`
- `frontend/src/components/StallAdmin.jsx`
- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/staff/StaffAllocation.jsx`

What to change: 

- Do not change code yet during the audit.
- Write notes about which component uses which data source.

Why this matters:

- You cannot safely replace localStorage until you know who depends on it.

Syntax/function explanation:

- Use `rg "localStorage" frontend/src` to search quickly.
- Use `rg "api\\.products|api\\.categories|stallUtils|getAssignedStall" frontend/src` to find indirect localStorage use.

Common mistakes to avoid:

- Replacing one localStorage call while another component still writes old data.
- Forgetting utility files that hide localStorage access.
- Changing order-related localStorage even though orders are not Phase 3.

Mini checkpoint:

- You can list all Phase 3 localStorage keys and which files use them.

### Task 2: Create or extend frontend API functions for products/categories/stalls/users

Goal:

- Add clean frontend functions that call backend endpoints through `apiClient`.

Files to open:

- `frontend/src/services/apiClient.js`
- Optionally create a small resource API file if the project style supports it, such as `frontend/src/services/resourceApi.js`.

What to change:

- Add functions for product, category, stall, user, and assignment API calls.
- Keep JWT handling inside `apiClient`.
- Keep resource functions small.

Why this change matters:

- Components should not manually repeat fetch URLs, headers, and error parsing.
- One API layer makes future backend changes easier.

Syntax/function explanation:

Small example only:

```js
export async function listProducts() {
  const response = await apiRequest('/products');
  return response.data;
}
```

This means:

- `async` lets the function use `await`.
- `await` pauses until the HTTP request finishes.
- `apiRequest('/products')` calls the backend.
- `return response.data` gives the hook just the useful data.

Common mistakes to avoid:

- Calling `fetch` directly from many components.
- Forgetting the `/api` base URL is already part of `VITE_API_BASE_URL`.
- Forgetting that backend fields use names like `category_id`, not `categoryId`.

Mini checkpoint:

- You can call `listProducts()` after login and see backend product data in the browser dev tools network tab.

### Task 3: Refactor `useProducts` to fetch from backend

Goal:

- Make product and category state come from backend APIs.

Files to open:

- `frontend/src/hooks/useProducts.js`
- `frontend/src/services/apiClient.js`
- Product/category API helper file if you create one.

What to change:

- Replace `api.products.getAll()` and `api.categories.getAll()` localStorage calls.
- Add loading and error state.
- Normalize backend response shape if needed.

Why this change matters:

- `useProducts` is the main bridge between admin product UI and the data source.

Syntax/function explanation:

React effect pattern:

```js
useEffect(() => {
  let ignore = false;

  async function loadProducts() {
    try {
      setLoading(true);
      const products = await listProducts();
      if (!ignore) setProducts(products);
    } catch (error) {
      if (!ignore) setError(error.message);
    } finally {
      if (!ignore) setLoading(false);
    }
  }

  loadProducts();

  return () => {
    ignore = true;
  };
}, []);
```

This pattern avoids setting React state after the component unmounts.

Common mistakes to avoid:

- Making `useEffect` callback itself `async`.
- Forgetting to clear old error before retrying.
- Forgetting to map backend product fields to UI fields.
- Accidentally loading all products for cashier without backend scoping.

Mini checkpoint:

- Refresh the admin portal and products load from the backend.
- Clearing localStorage does not remove the loaded products.

### Task 4: Refactor product/category save, update, and delete to use backend

Goal:

- Product/category CRUD actions should call backend APIs.

Files to open:

- `frontend/src/hooks/useProducts.js`
- `frontend/src/components/MenuCatalog.jsx`
- `frontend/src/components/CategoryAdmin.jsx`
- Product/category API helper file.

What to change:

- Replace local `api.products.create/update/delete` calls.
- Replace local `api.categories.create/update/delete` calls.
- After save/delete, update local React state from the backend response or reload the list.

Why this change matters:

- Creating a product must write to MySQL, not browser storage.

Syntax/function explanation:

HTTP methods:

- `POST` creates new records.
- `PUT` updates existing records.
- `DELETE` removes records.

Common mistakes to avoid:

- Sending `price` when backend expects `price_usd` and `price_khr`.
- Sending `categoryId` when backend expects `category_id`.
- Deleting from UI state before confirming backend success.
- Not showing backend validation errors to the user.

Mini checkpoint:

- Create a product, refresh the browser, and confirm the product still exists.

### Task 5: Add loading/error states for product/category UI

Goal:

- Make the UI clear while waiting for backend data or when a request fails.

Files to open:

- `frontend/src/hooks/useProducts.js`
- `frontend/src/components/MenuCatalog.jsx`
- `frontend/src/components/CategoryAdmin.jsx`

What to change:

- Return `loading` and `error` from the hook.
- Display loading text or skeleton area.
- Display useful error messages.
- Show empty states when lists are empty.

Why this change matters:

- Backend requests are not instant.
- Good states prevent users from thinking the app is broken.

Syntax/function explanation:

Conditional rendering:

```jsx
{loading && <p>Loading products...</p>}
{error && <p className="text-red-600">{error}</p>}
{!loading && products.length === 0 && <p>No products yet.</p>}
```

Common mistakes to avoid:

- Showing "No products" before loading has finished.
- Hiding errors in the console only.
- Leaving buttons enabled while save/delete is running.

Mini checkpoint:

- Temporarily stop the backend and confirm the UI shows an error instead of silently failing.

### Task 6: Connect stall list and stall creation to backend

Goal:

- Replace localStorage stall list with backend `stalls` table data.

Files to open:

- `frontend/src/components/StallAdmin.jsx`
- `frontend/src/utils/stallUtils.js`
- `backend/src/routes/stall.routes.js`
- `backend/src/controllers/stall.controller.js`
- `backend/src/repositories/stall.repository.js`

What to change:

- Load stalls from `GET /api/stalls`.
- Create stalls with `POST /api/stalls`.
- Update/delete stalls with backend routes if the UI supports those actions.
- Stop using `getStalls()` and `saveStalls()` as the source of truth.

Why this change matters:

- Stalls are shared business data and must not live only in one browser.

Syntax/function explanation:

Backend create flow:

```txt
POST /api/stalls -> stall.routes.js -> stall.controller.js -> stall.repository.js -> Stall.create(...)
```

Common mistakes to avoid:

- Sending frontend-only fields like `online` or `location` unless the backend schema supports them.
- Changing the database schema without updating `docs/database/schema.sql`.
- Forgetting stall routes are admin-only.

Mini checkpoint:

- Create a stall, refresh, and confirm the stall still appears from the backend.

### Task 7: Connect staff/stall assignment to backend

Goal:

- Store which cashier belongs to which stall in the database.

Files to open:

- `frontend/src/components/StallAdmin.jsx`
- `frontend/src/utils/stallUtils.js`
- `backend/src/models/stall-staff.model.js`
- `backend/src/models/index.js`
- `backend/src/routes/stall.routes.js`
- `backend/src/controllers/stall.controller.js`
- `backend/src/repositories/stall.repository.js`
- `backend/src/repositories/user.repository.js`

What to change:

- Design a small assignment API.
- Use the existing `stall_staff` join table.
- Ensure only admins can assign staff to stalls.
- Ensure assigned users are real users.
- Ensure assigned users have role `cashier` unless your team has a clear reason otherwise.

Why this change matters:

- Cashier product scoping depends on accurate stall assignment.

Syntax/function explanation:

A join table stores many-to-many relationships.

Example:

```txt
stall 1 can have cashier 5
stall 1 can have cashier 8
cashier 5 can be connected to stall 1
```

The `stall_staff` table stores rows like:

```txt
stall_id | user_id
```

Common mistakes to avoid:

- Trusting a frontend-submitted username instead of a user ID.
- Allowing assignment to a deleted/missing stall.
- Allowing assignment to a missing user.
- Forgetting authorization on assignment routes.

Mini checkpoint:

- Assign a cashier to a stall, refresh the page, and confirm assignment still appears.

### Task 8: Add cashier assigned-stall lookup from backend

Goal:

- Let the cashier page discover the logged-in cashier's assigned stall from the backend.

Files to open:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/auth/useAuth.js`
- Backend stall/user route files.
- Backend stall/user repositories.

What to change:

- Replace local `getAssignedStall(currentUser?.id)` lookup.
- Add or use a backend endpoint that returns the logged-in user's assigned stall.
- Do not let cashier choose another stall from the frontend.

Why this change matters:

- Cashier permissions must come from backend-owned assignment data.

Syntax/function explanation:

The backend can use the authenticated user from the JWT:

```txt
req.user.id
req.user.role
```

That is safer than trusting a frontend-submitted `userId`.

Common mistakes to avoid:

- Sending `userId` from the frontend when the backend already knows the user from JWT.
- Returning all stall assignments to a cashier.
- Forgetting the case where a cashier has no assigned stall.

Mini checkpoint:

- Login as a cashier and confirm the cashier page shows the assigned stall name.

### Task 9: Make cashier product catalog load only assigned-stall products

Goal:

- Cashier product list must be limited to their assigned stall.

Files to open:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/hooks/useProducts.js`
- `backend/src/routes/product.routes.js`
- `backend/src/controllers/product.controller.js`
- `backend/src/repositories/product.repository.js`

What to change:

- Decide whether `GET /api/products` returns role-scoped data automatically.
- Recommended beginner-friendly backend rule:
  - If `admin`, return all products needed for management.
  - If `cashier`, return only visible products for cashier's assigned stall.
- Frontend should not filter cashier products as the main security rule.

Why this change matters:

- Frontend filtering can be bypassed.
- Backend scoping is the real authorization control.

Syntax/function explanation:

Filtering in Sequelize might use a `where` object:

```js
Product.findAll({
  where: {
    stall_id: assignedStallId,
    is_visible: true,
  },
});
```

This is only a small syntax example. You still need to connect it correctly to your repository and controller design.

Common mistakes to avoid:

- Returning all products and relying only on React to hide some.
- Forgetting products where `is_visible` is false.
- Forgetting the no-assigned-stall case.

Mini checkpoint:

- Login as cashier A and cashier B assigned to different stalls.
- Confirm each cashier sees only their own stall's products.

### Task 10: Verify admin can still manage all needed data

Goal:

- Ensure stronger cashier scoping does not break admin management.

Files to open:

- `frontend/src/pages/AdminPortalPage.jsx`
- `frontend/src/components/MenuCatalog.jsx`
- `frontend/src/components/StallAdmin.jsx`
- Backend product/category/stall/user route files.

What to change:

- Make sure admin views can still load management data.
- Make sure admin-only mutations still use `authorize('admin')`.
- If admin needs filters, use query parameters instead of separate duplicated routes where possible.

Why this change matters:

- Authorization should restrict cashier access without damaging admin workflows.

Syntax/function explanation:

Query parameter example:

```txt
GET /api/products?stall_id=1
```

The backend must still validate that the requester is allowed to use the filter.

Common mistakes to avoid:

- Accidentally making product creation available to cashier.
- Accidentally making admin see only one stall's products.
- Creating many route versions before checking if one clear route can work.

Mini checkpoint:

- Admin can create/edit/delete products and categories after cashier scoping is added.

### Task 11: Run lint/build and manual tests

Goal:

- Confirm the implementation is stable enough for teammates.

Files to open:

- `package.json` in frontend and backend as needed.
- Any files changed during Phase 3.

What to change:

- Fix lint/build errors caused by Phase 3 work.
- Do not hide real errors by disabling rules without a good reason.

Why this change matters:

- Passing checks gives the team confidence that the code is not only working in one browser tab.

Syntax/function explanation:

Common commands:

```bash
cd frontend
npm run lint
npm run build
```

For backend checks, inspect backend `package.json` and run the available lint/test command.

Common mistakes to avoid:

- Testing only the happy path.
- Forgetting to test after clearing localStorage.
- Forgeting to test a cashier account.

Mini checkpoint:

- You can explain what you tested and what still needs review.

## 5. Guided Code Exercises

### Exercise A: Find the localStorage trail

Your Turn:

- Search for localStorage usage related to products, categories, stalls, and staff.

Hint:

```bash
rg "localStorage|toub_stalls|toub_stall_assignments|sabay-pos-products|sabay-pos-categories" frontend/src
```

Expected result:

- A short list of files and keys that Phase 3 must replace.

Check yourself question:

- Which localStorage keys belong to Phase 3, and which should wait for a later phase?

### Exercise B: Add one product API function

Your Turn:

- Add a small function that reads products from the backend using the existing API client.

Hint:

- Look at how `authApi.login` uses `apiRequest`.
- Follow that style.

Expected result:

- Your hook can call one function instead of writing raw `fetch`.

Check yourself question:

- Where is the JWT token attached: your new function, or the shared API client?

### Exercise C: Map backend product fields to UI fields

Your Turn:

- Write a small mapper that converts backend product data into the shape the current UI expects.

Hint:

Think about:

- `price_usd` -> `price`
- `category_id` -> `categoryId`
- `image_url` -> `image`
- `is_visible` -> `available`

Expected result:

- Existing product components need fewer changes.

Check yourself question:

- When saving back to the backend, do you also need a reverse mapper?

### Exercise D: Add loading and error state

Your Turn:

- Add `loading` and `error` to `useProducts`.

Hint:

- Loading starts as `false`.
- Set it to `true` before the request.
- Set it to `false` in `finally`.

Expected result:

- The UI can distinguish between "still loading" and "loaded but empty."

Check yourself question:

- What should users see if the backend is turned off?

### Exercise E: Validate product price on backend

Your Turn:

- Add backend validation so product prices must be positive numbers.

Hint:

- Controllers are good for request body validation.
- Repositories should focus on database operations.

Expected result:

- Sending a product with price `0`, `-1`, or non-number text returns a clear error.

Check yourself question:

- Why is frontend-only validation not secure enough?

### Exercise F: Design the stall assignment API

Your Turn:

- With your team, choose the smallest API shape needed for the `StallAdmin` UI.

Hint:

Possible design:

- One route to read assignments.
- One route to replace assignments for a stall.

Expected result:

- Your team agrees on route names, request bodies, and response shape before coding.

Check yourself question:

- Does the route trust `req.user` for authorization, or does it trust frontend-submitted role data?

### Exercise G: Test cashier scoping

Your Turn:

- Create two stalls, two cashiers, and products assigned to each stall.
- Login as each cashier.

Hint:

- Use browser dev tools network tab to check what `GET /api/products` returns.

Expected result:

- Each cashier sees only assigned-stall products.

Check yourself question:

- If a cashier manually calls the product API, can they see another stall's products?

## 6. Syntax Explanations

### `async` / `await`

`async` marks a function that works with promises. `await` waits for a promise to finish.

Tiny example:

```js
async function loadProducts() {
  const products = await listProducts();
  setProducts(products);
}
```

Why it matters:

- HTTP requests do not finish immediately.
- `await` lets your code read top-to-bottom instead of using many nested callbacks.

### `fetch`

`fetch` sends HTTP requests from the browser.

Tiny example:

```js
fetch('http://localhost:3000/api/products');
```

In this project, prefer the shared API client instead of direct `fetch` inside components.

### HTTP methods: `GET`, `POST`, `PUT`, `DELETE`

- `GET`: read data.
- `POST`: create data.
- `PUT`: update data.
- `DELETE`: remove data.

Match the method to the user's action.

### `Authorization: Bearer <token>`

This header proves the frontend has a valid login session.

Example:

```txt
Authorization: Bearer eyJhbGciOi...
```

The backend middleware verifies the token and sets the current user for controllers.

### React `useState`

`useState` stores component or hook state.

Example:

```js
const [products, setProducts] = useState([]);
```

This means:

- `products` is the current value.
- `setProducts` updates the value and causes a re-render.

### React `useEffect`

`useEffect` runs side effects, like loading data from an API.

Example:

```js
useEffect(() => {
  loadProducts();
}, []);
```

The empty array means it runs once when the component mounts.

### React custom hooks

A custom hook is a reusable function that uses React hooks.

Example:

```js
function useProducts() {
  const [products, setProducts] = useState([]);
  return { products, setProducts };
}
```

Custom hooks help keep components smaller.

### `try/catch`

`try/catch` handles errors.

Example:

```js
try {
  const products = await listProducts();
  setProducts(products);
} catch (error) {
  setError(error.message);
}
```

Use it for API calls because network and backend errors are normal possibilities.

### Array methods: `map`, `filter`, `find`

`map` transforms every item:

```js
products.map((product) => product.name);
```

`filter` keeps matching items:

```js
products.filter((product) => product.available);
```

`find` returns the first matching item:

```js
products.find((product) => product.id === selectedId);
```

Use these for UI display and local derived state, not as the main security rule.

### Sequelize `findAll`, `findByPk`, `create`, `update`, `destroy`

Common Sequelize methods:

- `findAll`: get many rows.
- `findByPk`: get one row by primary key.
- `create`: insert a new row.
- `update`: modify existing rows.
- `destroy`: delete rows.

Example:

```js
Product.findAll({ where: { stall_id: 1 } });
```

This asks MySQL for products where `stall_id` is `1`.

### Express route/controller patterns

Route files define URLs and middleware.

Controller files handle request logic.

Example pattern:

```txt
router.post('/', authenticate, authorize('admin'), createProduct)
```

This means:

- User must be logged in.
- User must be admin.
- Then `createProduct` handles the request.

## 7. Backend Checklist

Use this checklist before calling Phase 3 backend work done.

- Product routes exist and are protected.
- Category routes exist and are protected.
- Stall routes exist and are protected.
- Staff/stall assignment routes exist if needed by the frontend.
- Admin-only write routes use `authorize('admin')`.
- Cashier read routes are scoped to the cashier's assigned stall.
- Product name is required.
- Product prices are positive numbers.
- `stall_id` is checked against real stalls.
- `category_id` is checked against real categories.
- Category/stall relationship is validated if your business rule requires it.
- User role accepts only `admin` or `cashier`.
- API does not trust frontend-submitted privileged fields like role, owner, or user ID when `req.user` should be used.
- Password hashes and PINs are never returned in normal API responses.
- Sequelize model changes are reflected in SQL docs if schema changes are made.
- Error messages are clear enough for frontend display but do not leak secrets.

## 8. Frontend Checklist

Use this checklist before calling Phase 3 frontend work done.

- Product source of truth is backend/database, not localStorage.
- Category source of truth is backend/database, not localStorage.
- Stall source of truth is backend/database, not localStorage.
- Staff/stall assignment source of truth is backend/database, not localStorage.
- API client attaches JWT automatically.
- Product/category/stall/user functions use the shared API client.
- UI handles loading states.
- UI handles backend errors.
- UI handles empty states.
- Cashier only sees assigned-stall products.
- Admin can still manage products, categories, stalls, and staff assignments.
- Clearing browser localStorage does not delete products/categories/stalls/assignments.
- Demo/mock data is not treated as real production data.

## 9. Manual Test Plan

Run these tests as a team before merging Phase 3.

### Test 1: Admin login

Steps:

1. Start the backend.
2. Start the frontend.
3. Open `/login`.
4. Login as an admin user.

Expected result:

- Login succeeds.
- User is redirected to `/admin-portal`.
- Browser dev tools show backend API requests using JWT.

### Test 2: View product list from backend

Steps:

1. Login as admin.
2. Open product/menu management.
3. Watch the network tab.

Expected result:

- Frontend calls `GET /api/products`.
- Product list displays backend data.
- Clearing localStorage and refreshing does not remove products.

### Test 3: Create product

Steps:

1. Login as admin.
2. Create a product with valid name, price, category, and stall.
3. Refresh the page.

Expected result:

- Backend returns success.
- Product appears after refresh.
- Product exists in the database.

### Test 4: Edit product

Steps:

1. Login as admin.
2. Change a product name or price.
3. Save.
4. Refresh.

Expected result:

- Backend update succeeds.
- Updated value remains after refresh.

### Test 5: Delete or hide product

Steps:

1. Login as admin.
2. Delete or hide a product depending on the UI behavior.
3. Refresh.

Expected result:

- Product is deleted or hidden according to backend behavior.
- Cashier does not see hidden products.

### Test 6: Create category

Steps:

1. Login as admin.
2. Create a category.
3. Assign it to a stall if the backend requires `stall_id`.
4. Refresh.

Expected result:

- Category remains after refresh.
- Product form can use the category.

### Test 7: Create stall

Steps:

1. Login as admin.
2. Create a new stall.
3. Refresh.

Expected result:

- Stall remains after refresh.
- Stall is available for products and staff assignment.

### Test 8: Assign cashier to stall

Steps:

1. Login as admin.
2. Create or choose a cashier user.
3. Assign cashier to a stall.
4. Refresh.

Expected result:

- Assignment remains after refresh.
- Assignment is stored in the database, not localStorage.

### Test 9: Login as cashier

Steps:

1. Logout admin.
2. Login as cashier.
3. Open `/cashier`.

Expected result:

- Cashier reaches cashier screen.
- Cashier sees assigned stall information.

### Test 10: Confirm cashier only sees assigned-stall products

Steps:

1. Create products for stall A and stall B.
2. Assign cashier to stall A.
3. Login as cashier.

Expected result:

- Cashier sees stall A products.
- Cashier does not see stall B products.

### Test 11: Clear browser localStorage

Steps:

1. Login as admin.
2. Confirm products/categories/stalls exist.
3. Clear browser localStorage.
4. Refresh and login again if needed.

Expected result:

- Products/categories/stalls/assignments still exist because they are in MySQL.

### Test 12: Invalid product price

Steps:

1. Login as admin.
2. Try creating a product with price `-5`.
3. Try creating a product with a non-number price.

Expected result:

- Backend rejects the request.
- Frontend shows a helpful error.

## 10. Debugging Guide

### 401 Unauthorized

What it means:

- The request has no valid JWT token.

Where to check:

- Browser dev tools network tab.
- Request headers.
- Frontend auth storage.
- Backend auth middleware logs/errors.

How to fix:

- Login again.
- Confirm `apiClient` attaches `Authorization: Bearer <token>`.
- Confirm the route is using `authenticate`.

### 403 Forbidden

What it means:

- The user is logged in but does not have permission.

Where to check:

- User role in JWT/session.
- Backend route `authorize(...)` usage.
- Whether you are testing as `admin` or `cashier`.

How to fix:

- Use an admin account for admin-only routes.
- Make sure cashier routes are intentionally allowed.
- Do not add `cashier` to admin-only mutation routes.

### CORS error

What it means:

- Browser blocked the request because frontend origin is not allowed by backend CORS config.

Where to check:

- Backend `.env` `FRONTEND_ORIGIN`.
- Frontend dev server URL.
- Browser console.

How to fix:

- Set `FRONTEND_ORIGIN` to the actual frontend URL, often `http://localhost:5173` in development.
- Restart backend after changing `.env`.

### Empty product list

What it means:

- The request worked, but no products were returned, or the frontend mapped data incorrectly.

Where to check:

- Network response body.
- Backend database table.
- Product `stall_id`.
- Cashier assignment.
- Mapping from `price_usd`/`category_id` to frontend fields.

How to fix:

- Confirm products exist in MySQL.
- Confirm the logged-in cashier has an assigned stall.
- Confirm admin and cashier behavior are intentionally different.

### Token missing

What it means:

- API request was sent without the JWT.

Where to check:

- `frontend/src/services/apiClient.js`
- Auth storage files.
- Network request headers.

How to fix:

- Ensure resource API functions use `apiRequest`.
- Avoid direct `fetch` unless you manually include auth headers.

### Backend route mismatch

What it means:

- Frontend calls a URL/method the backend does not define.

Where to check:

- Browser network tab status, especially `404`.
- `backend/src/routes/*.routes.js`.
- Frontend API helper paths.

How to fix:

- Match frontend path and HTTP method to backend route.
- Remember the frontend base URL already includes `/api` if configured that way.

### Sequelize validation or database errors

What it means:

- Data does not match model/database rules, or a foreign key is invalid.

Where to check:

- Backend terminal output.
- Sequelize model definitions.
- MySQL table schema.
- Request body sent by frontend.

How to fix:

- Validate body before repository calls.
- Check `stall_id` and `category_id` exist.
- Keep model and SQL schema synchronized.

### Frontend state not refreshing after save/delete

What it means:

- Backend changed, but React state still shows old data.

Where to check:

- Hook save/delete function.
- Whether state is updated after success.
- Whether the list is reloaded.

How to fix:

- After successful save/delete, either update state from the response or call the load function again.
- Do not update UI as success if the backend request failed.

## 11. Team Collaboration Activity

For a 3-person team, try these roles.

### API Captain

Focus:

- Frontend API helper functions.
- Network requests.
- JWT headers.
- Error handling.

Review question:

- Are components calling clean API functions instead of repeating fetch logic?

### UI Pilot

Focus:

- Product/category/stall screens.
- Loading, error, and empty states.
- Form behavior.
- Keeping the UI understandable.

Review question:

- Can a user tell what is happening when the backend is slow or rejects input?

### Database Detective

Focus:

- Backend repositories.
- Sequelize models.
- MySQL relationships.
- Validating `stall_id`, `category_id`, and user assignments.

Review question:

- Does the backend protect the data even if someone bypasses the frontend?

### Team checkpoints

Checkpoint 1:

- Everyone reviews the localStorage audit together.

Checkpoint 2:

- API Captain and Database Detective agree on route shapes before code is written.

Checkpoint 3:

- UI Pilot tests loading/error/empty states while API Captain watches network requests.

Checkpoint 4:

- Database Detective tries invalid API requests to confirm backend validation works.

Checkpoint 5:

- Everyone performs the manual test plan from section 9.

### Reflection questions

- Which data should React own temporarily, and which data should MySQL own permanently?
- Which validation belongs in the frontend for user experience?
- Which validation belongs in the backend for security?
- What did you change so cashier access is scoped by the backend instead of only by the UI?
- What would break if two admins used the app from different computers at the same time?

## 12. Definition of Done

Phase 3 is done only when all of these are true:

- Admin login still works through backend JWT.
- Admin can view products from the backend.
- Admin can create, edit, and delete or hide products through backend APIs.
- Admin can view and manage categories through backend APIs.
- Admin can view and manage stalls through backend APIs.
- Admin can assign cashier users to stalls using database-backed assignment.
- Cashier can login through the real auth flow.
- Cashier can open `/cashier`.
- Cashier sees only products for their assigned stall.
- Cashier cannot access admin-only product/category/stall mutation routes.
- Product name is required by backend validation.
- Product prices must be positive numbers.
- Product `stall_id` must refer to an existing stall.
- Product `category_id` must refer to an existing category.
- User roles remain only `admin` and `cashier`.
- Clearing browser localStorage does not delete products, categories, stalls, or assignments.
- UI shows loading, error, and empty states.
- Frontend `npm run lint` passes.
- Frontend `npm run build` passes.
- Backend lint/test command passes if available.
- Any schema changes are reflected in `docs/database/schema.sql`.
- Teammates can explain the new data flow without guessing.

## 13. Teammate Handoff Summary

Paste this into team chat when you are ready to start Phase 3:

```txt
Phase 3 is about moving TouB POS products, categories, stalls, and staff/stall assignments from browser localStorage to the backend database.

Likely frontend files: frontend/src/services/apiClient.js, frontend/src/services/api.js, frontend/src/hooks/useProducts.js, frontend/src/hooks/useUsers.js, frontend/src/utils/stallUtils.js, frontend/src/components/MenuCatalog.jsx, frontend/src/components/CategoryAdmin.jsx, frontend/src/components/StallAdmin.jsx, frontend/src/pages/AdminPortalPage.jsx, frontend/src/pages/CashierPage.jsx, and cashier/product display components.

Likely backend files: backend/src/routes/product.routes.js, category.routes.js, stall.routes.js, user.routes.js; controllers and repositories for products/categories/stalls/users; Sequelize models for Product, Category, Stall, User, and StallStaff.

Main tests: admin can manage backend products/categories/stalls, cashier can login and only sees assigned-stall products, invalid product data is rejected by backend, and clearing browser localStorage does not remove database data.

Phase 4 should connect order-taking and order lifecycle to the backend, including cashier order creation, order status updates, and preparation flow. Payment, KHQR, and Telegram should stay out of Phase 3 unless the team intentionally starts later phases.
```

You are not just wiring APIs. You are upgrading the app from a prototype that remembers things in one browser into a shared system where the backend owns business truth. That is a big step toward a real POS.
