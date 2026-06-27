# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Project Scaffolding — **COMPLETE**

- **Implemented Phase 1 backend auth/security hardening**:
  - Updated backend RBAC so `authorize()` supports string and array role inputs, while admin-only routes now use `authorize('admin')`.
  - Removed `manager` from the backend user role model and SQL schema; user API role validation accepts only `admin` or `cashier`.
  - Added backend startup environment validation for `JWT_SECRET`, core DB settings, production `FRONTEND_ORIGIN`, and optional password-required DB setups.
  - Hardened login to reject inactive users with `403` after credential validation and kept JWT payload limited to `id`, `username`, and `role`.
  - Restricted CORS to `FRONTEND_ORIGIN`, with `http://localhost:5173` as the development fallback.
  - Made default `admin/admin123` seeding non-production only and removed PIN/password exposure from user API responses.

- **Fixed cashier stall assignment source mismatch**:
  - Centralized default stall data and default stall assignments in `frontend/src/utils/stallUtils.js`.
  - Updated Cashier, Stall Management, Staff Directory, and Sales Reports assignment reads to use the same shared helper.
  - Resolved the issue where Cashier Dara could appear assigned in the admin portal but be blocked from the cashier portal until an admin refresh or save.

- **Enforced one-stall-per-cashier assignment in Stall Management**:
  - Updated roster drop assignment so assigning a cashier to a new stall first removes that cashier from every other stall roster.
  - Prevented Cashier Dara from appearing assigned to multiple stalls at the same time.

- **Implemented routing for /admin-portal and isolated auth guards**:
  - Defined `/admin-portal` route in `App.jsx` pointing to `AdminPortalPage`.
  - Extracted admin-only workspace, services, and routing hooks from `CashierPage.jsx` into a dedicated page `AdminPortalPage.jsx`.
  - Set up bidirectional auth guards on `/cashier` and `/admin-portal` to prevent cross-role access and auto-redirect users to their authorized workspace.
  - Refactored `LoginPage.jsx` to navigate Admin/Manager users directly to `/admin-portal`.
  - Updated `AdminWorkspace.jsx` to delegate logout callbacks to the page router, eliminating inline page reloads.

- **Consolidated and Reused QuantityInput component**:
  - Rewrote `QuantityInput.jsx` to encapsulate the entire quantity pill control—housing the outer pill wrapper, the minus/plus button handlers with their icons, and the text input field.
  - Removed duplicate adjuster layouts, button classes, and `Icon` imports from both `CartItem.jsx` and `ProductCard.jsx`, replacing them with simple, clean `<QuantityInput>` components.
  - Implemented dynamic green border highlight (`border-state-success`) for selected `ProductCard` components that have active items added in the cart.
- **Refactored icon rendering system to `lucide-react`**:
  - Installed `lucide-react` package in the frontend.
  - Updated centralized `Icon.jsx` component to dynamically render Lucide React components using prop mapping.
  - Replaced remaining inline SVGs inside `AdminDashboard.jsx` and `QuickActions.jsx` with `<Icon>` components.
  - Replaced custom HTML/CSS basket representation in `Topbar.jsx` and mobile checkout button in `CashierScreen.jsx` with unified `<Icon name="cart" />` component (mapping to `ShoppingBag`).
  - Fixed pre-existing ESLint warnings in `LoginScreen.jsx` and `LoginPage.jsx` (synchronous `setState` inside effect).
  - Verified a clean production build compile and zero-lint-warning output.
- Defined all context files.
- Drafted SE deliverables in `context/software-engineering.md`.
- **Scaffolded full backend structure** (`backend/src/{routes,controllers,services,repositories,middleware,config}`).
  - `app.js` + `index.js` Express entry points.
  - Auth middleware (JWT verify + RBAC `authorize()`).
  - Global error handler middleware.
  - MySQL2 connection pool config.
  - Route files: auth, order, product, user, report.
  - Controller stubs for all routes.
  - `auth.service.js` fully implemented (bcrypt + JWT sign).
  - `user.repository.js` fully implemented.
  - Stub services/repositories for order, product, report.
- **Reorganized frontend & Layout** (`CashierWorkspace.jsx` → `pages/CashierPage.jsx`, CSS deduplicated, and introduced `<PageShell>` component wrapper to standardize layouts, wrap top navbar, and handle future global statuses).
- **Integrated OrderPanel into CashierScreen** (extracted `QuantityInput.jsx` to avoid duplication, imported and nested `<OrderPanel>` inside `<CashierScreen>` within the `.workspace` CSS container to preserve grid column layout, and kept them as separate components).
- **Refactored Admin workspaces** (exported `ROLES`/`TONES` from `seedData.js`, added proper `onCancel` handlers to hooks and passed them down, removed local duplicates of `blankProductForm`/`blankUserForm`, improved Category select dropdown fallback, cleared all ESLint warnings, and updated CSS media queries to stack admin grid panels vertically on screens smaller than 768px).
- **Resolved React Doctor diagnostics** (fixed 13 warnings, score improved from 93 to 96):
  - Replaced non-semantic `role="button"` container with `<button>` tag for cart backdrop in `CashierScreen.jsx`.
  - Added descriptive `aria-label` to quantity inputs in `CashierScreen.jsx` and `OrderPanel.jsx`.
  - Renamed vague event handlers in quantity inputs to `handleQuantityChange` and `handleQuantityBlur`.
  - Optimized cart mutation hook `useCart.js` by combining chained map-filter operations into single-pass `.reduce()` loops.
  - Relocated pure functions `blankUserForm` and `blankProductForm` outside of component render scopes in `UserAdmin.jsx` and `ProductAdmin.jsx`.
  - Removed unused exports from `seedData.js`.
- **Refactored Stylesheet to Tailwind CSS v4**:
  - Installed `@tailwindcss/vite` and `tailwindcss` (v4).
  - Configured custom theme colors (`brand-primary`, `brand-bg`, `brand-text`, tone swatches) in `index.css`.
  - Rewrote all components (`Topbar`, `QuantityInput`, `OrderPanel`, `CashierScreen`, `CategoryAdmin`, `ProductAdmin`, `UserAdmin`, `LoginScreen`, `PageShell`) to use Tailwind CSS utility classes.
  - Removed the legacy `CashierWorkspace.css` file completely.
  - Ensured full build and lint compliance.
- **Converted all gradients to solid colors**:
  - Replaced PageShell and LoginScreen backgrounds with solid `bg-brand-bg` class.
  - Converted CashierScreen product card tone backgrounds to solid `bg-tone-*-bg` color classes.
- **Redesigned Login Screen**:
  - Replaced the generic beige background with the vibrant warm golden-yellow color (`bg-brand-yellow` / `#ebc02b`) matching the screenshot.
  - Set the login form card's background to solid white with custom rounded corners (`rounded-[24px]`) and a soft, wide drop shadow.
  - Updated the brand title to "ToubPOS" in royal blue (`text-brand-blue` / `#0047cc`), next to a dark gray logo block with a yellow capital letter "T".
  - Structured the dropdown selector and PIN input with custom SVG chevrons, exact borders, heights, font styles, and placeholders matching the screenshot.
  - Styled the "Log in" button to match the brand blue color.
  - Relocated the helper credentials list into a clean, floating glassy bar at the bottom of the page to maintain design fidelity while preserving usability.
- **Modernized Cashier Screen & Product Catalog**:
  - Replaced dummy coffee data with new food items, descriptions, and static image paths in `seedData.js`.
  - Upgraded menu saving, blank form states, and local storage state versions (`v3`) to invalid old cache in `useProducts.js`.
  - Redesigned back-office product cards and creation form to include image URL input and render list thumbnails in `ProductAdmin.jsx`.
  - Overhauled cashier screen with responsive horizontal scroll categories, square card-based product layouts, and a sticky mobile "Review Order" checkout bar in `CashierScreen.jsx`.
  - Redesigned `OrderPanel.jsx` to match the exact high-fidelity white sidebar layout in the screenshot (including the top "Clear All" button, promo dashed button, dynamic green/black quantity selector circles, and SVG icons for payment options).
  - Adjusted `useCart.js` to calculate **Service Fee (3%)** and **Estimated Tax (8%)** and pass `estimatedTax` down the order workflow.
  - Locked `PageShell.jsx` to a fixed `100svh overflow-hidden` to prevent page scrolling and ensure all headers remain statically visible.
  - Swapped out browser-native payment `alert()` calls for a beautiful custom receipt modal overlay showing the order list, totals breakdown, and order metadata in `CashierPage.jsx`.
  - Added golden-yellow (`#ebc02b`) Cash confirmation dialog ("Did you received the cash?") and KHQR poster scan dialog ("Scan QR Code to Pay!") with vector buttons, dynamic QR API generation, and automatic scan success transition in `CashierPage.jsx`.
  - Upgraded the Topbar profile chip into an interactive dropdown popover button inside `Topbar.jsx` with a custom chevron indicator, click-outside backdrop clicker, and inline red Logout button option with a custom SVG door icon.
  - Added a golden-yellow (`#ebc02b`) logout confirmation dialog ("Are you sure you wanna log out?") with red Cancel and green Confirm action buttons to intercept logout events in `Topbar.jsx`.
  - Overhauled and modernised the Admin and Manager Workspaces (`AdminWorkspace.jsx`, `ProductAdmin.jsx`, `CategoryAdmin.jsx`, `UserAdmin.jsx`, `OrderHistory.jsx`):
    * Replaced basic dark elements with royal-blue active tabs (`bg-[#003ec7]`), warm sand backgrounds (`bg-[#f6f4ef]`), and rounded `rounded-[24px]` cards.
    * Upgraded forms with border inputs highlighting blue on focus (`focus:border-[#003ec7]`).
    * Refactored list cards to use dynamic category tone swatches, status-dot pills (Visible/Hidden, Active/Disabled), specific role badges (Admin in purple, Manager in blue, Cashier in orange), and circular pill action buttons.
    * Refactored "Today's summary" into a widget with a massive price indicator in royal blue.
    * Ensured responsive vertical stacking and role-based permissions (hiding Users panel from Managers).
  - **Overhauled Admin Back Office UX & CRUD Overlays**:
    * Converted persistent CRUD form sidebars into high-fidelity, centered modal overlays (in `ProductAdmin.jsx`, `CategoryAdmin.jsx`, and `UserAdmin.jsx`), maximizing screen width for admin lists.
    * Added "+ Add Item", "+ Add Category", and "+ Add User" buttons directly inside the headers of their respective list panels to invoke these modals.
    * Reorganized tab navigation from horizontal top buttons to a modern, left-aligned sidebar menu stack (`w-60` on desktop) featuring custom SVG icons for Products, Categories, Orders, and Users.
    * Added responsive mobile handling to automatically render a header bar with a hamburger menu button on phone viewports, which toggle the vertical sidebar menu directly under it.
    * Integrated a central golden-yellow (`#ebc02b`) Deletion Confirmation Modal Overlay in `AdminWorkspace.jsx` to intercept all CRUD deletions with a prompt, preventing accidental modifications.
    * Replaced all text-based row action buttons (Edit, Show/Hide, Disable/Enable, Delete) in `ProductAdmin.jsx`, `CategoryAdmin.jsx`, and `UserAdmin.jsx` with clean circular SVG icon buttons (`w-9 h-9`) to enhance layout spacing and cleanliness on small screens.
- **Reorganized & Componentized ToubPOS** (current sprint):
  - Created `src/services/api.js` - centralized API service layer with localStorage-backed CRUD operations for products, categories, users, and orders.
  - Refactored `src/hooks/useProducts.js` to use the API service layer.
  - Refactored `src/hooks/useUsers.js` to use the API service layer.
  - Refactored `src/hooks/useOrders.js` to use the API service layer.
  - Created `src/components/CartItem.jsx` - extracted cart item UI component.
  - Created `src/components/ProductCard.jsx` - extracted product card UI component.
  - Created `src/components/ReceiptModal.jsx` - extracted receipt modal UI.
  - Created `src/components/CashConfirmationModal.jsx` - extracted cash confirmation modal UI.
  - Created `src/components/KhqrPaymentModal.jsx` - extracted KHQR payment modal UI.
  - Refactored `src/components/OrderPanel.jsx` to use `CartItem` component.
  - Refactored `src/components/CashierScreen.jsx` to use `ProductCard` component.
  - Refactored `src/pages/CashierPage.jsx` to use extracted modal components.
  - Fixed all lint errors (removed unused `useEffect` imports, wrapped callback in `useCallback`).
  - Verified production build (53 modules transformed, 316KB JS bundle).
- **Refactored shared frontend UI consistency layer**:
  - Added `ModalShell`, `ConfirmDialog`, and `AdminFormModal` primitives for consistent overlays, confirmation dialogs, and admin CRUD forms.
  - Refactored Cash confirmation, KHQR payment, receipt, logout confirmation, delete confirmation, and admin CRUD overlays to use shared modal structure.
  - Added Tailwind theme tokens for `brand-action`, `state-danger`, and `state-success`; updated common cashier/admin action controls to use token classes instead of repeated hardcoded hex values.
  - Cleaned up copy and class issues (`Did you receive the cash?`, logout wording, delete warning icon color, invalid receipt text class).
  - Removed unused prop forwarding from `PageShell`/`Topbar` and `CashierScreen`/`OrderPanel`.
  - Verified lint and production build after refactor.
- **Refactored Admin CRUD tables into reusable component**:
  - Expanded `AdminCRUDTable` to own shared admin list panel, add button, row action buttons, accessibility labels, and admin form modal sizing/scroll behavior.
  - Refactored `ProductAdmin`, `CategoryAdmin`, and `UserAdmin` to reuse `AdminCRUDTable` while keeping domain-specific row rendering and form fields inside each feature component.
- **Extracted reusable frontend Icon component**:
  - Added `src/components/ui/Icon.jsx` with shared POS/admin icon definitions and configurable `name`, `className`, and `strokeWidth` props.
  - Replaced inline SVG markup across admin navigation, admin CRUD actions, cashier order controls, login selector, topbar logout/profile controls, cart controls, payment buttons, search, and receipt confirmation.
  - Normalized admin CRUD table imports to match the actual `AdminCrudTable.jsx` filename casing.
  - Verified lint and production build after the refactor.
- **Extracted reusable form field components**:
  - Created `src/components/ui/FormInput.jsx` — reusable labeled `<input>` with standard admin-form Tailwind classes, `wrapperClassName`/`className` override props, and rest-spread to native element.
  - Created `src/components/ui/FormSelect.jsx` — reusable labeled `<select>` with standard classes and children slot for `<option>` elements.
  - Created `src/components/ui/FormCheckbox.jsx` — reusable labeled checkbox with accent color styling.
  - Refactored `ProductAdmin.jsx`, `CategoryAdmin.jsx`, and `UserAdmin.jsx` to use `FormInput`, `FormSelect`, and `FormCheckbox` instead of raw HTML elements with repeated Tailwind class strings.
  - Refactored `LoginScreen.jsx` to use `FormInput` and `FormSelect` with custom `wrapperClassName`/`className` overrides to preserve its unique login-page styling (brand-blue focus, gray-200 borders, block label layout with chevron icon overlay).
  - **Implemented Admin Dashboard**:
    - Created `frontend/src/components/dashboard` with reusable `MetricCard`, `RevenueChart`, `LiveEvents`, and `QuickActions` components.
    - Integrated `AdminDashboard` into `AdminWorkspace` as the default landing view.
- **Refactored codebase to eliminate repetitive code and improve maintainability**:
  - Created custom hook `useAdminForm` (`src/hooks/useAdminForm.js`) to unify duplicate state management (`isAddingNew`, `isFormOpen`, `handleSubmit`, `handleCancel`, `handleAddNewClick`) shared across all back-office admin forms.
  - Created `FormActions` (`src/components/ui/FormActions.jsx`) component to consolidate duplicated save/cancel actions styling and layout in admin forms.
  - Created `StatusBadge` (`src/components/ui/StatusBadge.jsx`) component to handle visible/hidden and active/disabled status pills with indicator dots consistently.
  - Created `TotalsBreakdown` (`src/components/ui/TotalsBreakdown.jsx`) component to unify order summaries display structure between `ReceiptModal` and `OrderPanel`.
  - Created centralized `toneClasses` utility (`src/utils/toneClasses.js`) to map category tone values (`gold`, `green`, `blue`, `rose`) to their badge and swatch Tailwind classes.
  - Refactored `ProductAdmin.jsx`, `CategoryAdmin.jsx`, and `UserAdmin.jsx` to utilize `useAdminForm`, `FormActions`, `StatusBadge`, and color tone mapping utilities.
  - Refactored `AdminWorkspace.jsx` desktop and mobile nav menus to use a shared `navButtonClass(isActive)` layout helper.
  - Extracted dynamic factory `createCrudResource` in `api.js` (`src/services/api.js`) to deduplicate CRUD operations across products, categories, and users resources.
  - Extracted shared reducer helper `adjustQuantity` in `useCart.js` to deduplicate cart quantity modification logic.
  - Centralized `SERVICE_RATE` (0.03) and `TAX_RATE` (0.08) in `seedData.js` and imported them in `useCart.js`.
  - Deduplicated `initials` and `suggestedCode` in `format.js` using a shared `nameAcronym` helper.
  - Extracted higher-order wrapper `withCartSync` in `CashierPage.jsx` to deduplicate cart synchronization handlers.
- **Refactored codebase for maintainability and DRY principles based on architectural audit**:
  - Created centralized `storage` utility (`src/utils/storage.js`) to unify JSON read/write operations for `localStorage`.
  - Refactored `api.js` and `useSavedState.js` to import and utilize the unified `storage` helpers.
  - Centralized storage key definitions in `api.js` and updated `LoginPage.jsx` to consume `STORAGE_KEYS.USERS` instead of hardcoded strings.
  - Created `mapUsersWithDefaultPins` utility in `permissions.js` to deduplicate roles-to-PIN mapping logic across `useUsers.js` hook and `LoginPage.jsx` page.
  - Extracted stateless `<Logo />` UI component (`src/components/ui/Logo.jsx`) supporting `topbar` and `login` variants to unify brand mark layouts in `LoginScreen.jsx` and `Topbar.jsx`.
  - Configured external QR code generator API URL base constant `QR_CODE_API_BASE` in `KhqrPaymentModal.jsx`.
  - Verified client compilation builds successfully.
- **DRY Code Refactoring & Component Abstraction**:
  - Extracted duplicated sub-tab selector pills layout into a reusable `<TabPills>` UI component in `src/components/ui/TabPills.jsx`.
  - Refactored `UserAdmin.jsx` and `MenuCatalog.jsx` to consume the new `TabPills` component, eliminating duplicated CSS/styling rules.
  - Cleaned up `MenuCatalog.jsx` to replace private, hardcoded `FieldInput`, `FieldLabel`, and custom inline status badges with reusable shared primitives (`FormInput`, `FormSelect`, and `StatusBadge`).
  - Refactored `UserModal` inside `StaffList.jsx` to use shared input, select, checkbox, and status badge primitives, unifying modal overlays.
- **Implemented Cashier Workspace "My Orders" Tab**:
  - Implemented active tab switcher in `CashierScreen.jsx` supporting Quick Sale (menu catalog) and My Orders.
  - Configured cashier filtering (`order.cashierId === currentUser.id`) to restrict visible history to their own shift session.
  - Added shift statistics indicators detailing Today's Orders and Today's Total revenue.
  - Integrated "View Receipt" triggers connecting past transactions back to the high-fidelity receipt modal.
- **Implemented Staff Management & Allocation Matrix**:
  - Modularized `UserAdmin.jsx` into a two-tab dashboard panel hosting Staff List and Staff Allocation.
  - Implemented `StaffList.jsx` directory list with detailed profile cards, role badges, active/inactive statuses, and modal overlays for CRUD.
  - Implemented `StaffAllocation.jsx` cycle-based shift matrix supporting click-to-cycle shift assignments (AM/PM/FD/Unassigned) with local storage persistence.
  - Added visual Coverage by Stall progress metrics and a Shift Key schedule helper.
  - Renamed the sidebar navigation item and admin breadcrumbs to "Staff Management".
- **Implemented Admin Sales Reports & Analytics**:
  - Replaced the basic order list layout with a modern dual-tab `OrderHistory.jsx` (renamed crumb to "Sales Reports", title to "Revenue & Speed Analytics Ledger").
  - Implemented high-fidelity Analytics Dashboard with custom SVG sparkline graphs, Active Stalls running visualizers, and Average Prep Time tracker gauges.
  - Built Employee Efficiency Metrics ledger table detailing cashier orders completed, average prep speed in seconds, and shift statuses with sorting and export mock interactions.
  - Added searchable Transaction Ledger sub-tab list for auditing historical receipts.
- **Integrated Order, Payment Webhook, and Reporting APIs** (current sprint):
  - Rewrote `order.service.js` and `order.controller.js` to use Sequelize transactions. Added cashier stall validation checks.
  - Rewrote `payment.service.js` to handle payment webhook validations and status transitions using Sequelize row locks (`FOR UPDATE`).
  - Created `webhook.routes.js` and registered `/api/webhook` routes.
  - Implemented `report.controller.js` to calculate sales statistics and daily revenue summaries using Sequelize groupings and date filters.
  - Updated `docs/database/queries.sql` with exact raw SQL query conversions for orders, webhooks, row-locks, and report calculations.
  - Tested and verified order creation, listing, webhook completion, and report metrics using curl scripts.
- Verified client compilation builds successfully.

## Next Up

- Unit 2: Connect frontend views to real backend APIs.
  - Wire frontend Login page and connect to `POST /api/auth/login`.
  - Update frontend context hooks (`useProducts.js`, `useUsers.js`, `useOrders.js`) to consume the backend APIs rather than localStorage mocks.
  - Implement persistent session authentication (storing JWT/user context in `localStorage` or `sessionStorage`) to prevent F5/refresh logout.

## Open Questions

- What specific payment gateway API (e.g., Bakong KHQR) will be used to build the real-time listener webhook?
- Will the frontend use `react-router-dom` for routing, or a custom auth-guard pattern?
- Confirm KHR exchange rate strategy: hardcoded `.env` constant (recommended) or live API?

---

## Decision Log

Record of key architectural and product decisions made, with rationale.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Tailwind CSS v4** (not v3 or plain CSS) | v4 offers native CSS variable-based theming, no config file needed, and better performance at build time. Chosen early to avoid migration cost later. |
| 2 | **Device token in `localStorage`** (not server session) | Terminals are semi-permanent physical devices. A persistent browser token survives page refreshes without a server round-trip on every load. Simpler for offline resilience future work. |
| 3 | **Controller-Service-Repository pattern** | Industry-standard separation for Express backends. Keeps route handlers thin, business logic testable in isolation, and DB queries swappable. |
| 4 | **KHR rate hardcoded as `.env` constant** | Live exchange rate APIs add an external dependency, failure point, and cost. Rate changes infrequently in practice. Admin can update `.env` and restart. |
| 5 | **JWT expiry set to 8h** | Matches a typical shift length. Balances security (short-lived token) vs. UX (cashier doesn't get logged out mid-shift). |
| 6 | **Cart state in `localStorage`** (not server) | Reduces backend round-trips during item selection. Cart is ephemeral — only persisted to DB at checkout. Acceptable trade-off for speed. |
| 7 | **PIN validated client-side** (Phase 1) | Pragmatic shortcut for the initial build. Fast UX, no extra API call per login. Flagged as tech debt — must move server-side before production. |
| 8 | **Telegram Bot for kitchen display** (not custom screen) | Eliminates the need for a dedicated kitchen hardware/display build. Cooks already use Telegram. Saves significant scope while delivering real-time order relay. |

---

## Tech Debt

Intentional shortcuts taken during development that must be resolved before production.

| # | Item | Location | Priority |
|---|------|----------|----------|
| 1 | **PIN validated client-side** | `LoginPage.jsx` | 🔴 High — move PIN verification to `POST /api/auth/pin` before any real deployment |
| 2 | **Frontend hooks use `localStorage` mock** | `useProducts`, `useOrders`, `useUsers` | 🔴 High — must be migrated to real API calls (in progress) |
| 3 | **No input sanitization on order modifiers** | `order_items.notes` | 🟡 Medium — add max-length enforcement and strip dangerous characters before DB write |
| 4 | **No auth endpoint rate limiting** | `POST /api/auth/login` | 🟡 Medium — add `express-rate-limit` to prevent brute-force attacks |
| 5 | **Seed admin password is a placeholder hash** | `docs/database/schema.sql` | 🔴 High — generate real bcrypt hash and store securely before any live deployment |
| 6 | **WebSocket server not yet implemented** | `backend/services/` | 🔴 High — required for KHQR payment confirmation routing |

