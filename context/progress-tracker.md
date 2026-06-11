# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Project Scaffolding — **COMPLETE**

## Completed

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

## Next Up

- Unit 1: Implement the backend Express server end-to-end.
  - Install dependencies (`npm install` in `backend/`).
  - Create MySQL schema (users, products, orders, transactions tables).
  - Implement `user.service.js` + `user.controller.js` (create user with bcrypt hash).
  - Implement `product` repository/service/controller.
  - Wire frontend Login page and connect to `POST /api/auth/login`.
  - Implement persistent session authentication (storing JWT/user context in `localStorage` or `sessionStorage`) to prevent F5/refresh logout.

## Open Questions

- What specific payment gateway API (e.g., Bakong KHQR) will be used to build the real-time listener webhook?
- Will the frontend use `react-router-dom` for routing, or a custom auth-guard pattern?
