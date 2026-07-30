# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Backend Auth/Security Hardening — **COMPLETE**
- Phase 2: Frontend Authentication Integration — **COMPLETE**
- Phase 3: Backend-Owned Products, Categories, Stalls, And Staff — **COMPLETE**
- Phase 4: Backend-Owned Orders, Cash Confirmation, And Audit Logs — **COMPLETE**
- Phase 4.5: Security Hardening — **COMPLETE**
- Phase 5: Multi-Owner Data Isolation & Security — **COMPLETE** ✅
- Phase 5.5: RBAC Hierarchy Cleanup — **COMPLETE** ✅
- Phase 6: KDS & Live Payment WebSocket Integration — **COMPLETE** ✅
  - Telegram KDS Bot (cash payment trigger) — **COMPLETE** ✅
  - Multiple Stall Product Assignment (choose 0 to many stalls per item) — **COMPLETE** ✅
  - ImageKit product photo upload integration — **COMPLETE** ✅
  - Strict Stall-Scoped Cashier Roster & Device Registration — **COMPLETE** ✅
  - Programmatic Ngrok Tunnel & Webhook Auto-Registration — **COMPLETE** ✅
  - Webgroup Migration Self-Healing & Done Callback updates — **COMPLETE** ✅
  - WebSocket server for KHQR live notification — **COMPLETE** ✅
  - KHQR paid-status check → Telegram dispatch — **COMPLETE** ✅
  - KHQR background status checker — **COMPLETE** ✅
  - Telegram ticket status and retry — **COMPLETE** ✅
- Post-Phase 6 Operations & Security Hardening — **IN PROGRESS**
  - Owner/Manager Operations Watch for KHQR and Telegram ticket issues — **COMPLETE** ✅
  - Safe KHQR close and resume flow — **COMPLETE** ✅
  - KHQR pre-checkout confirmation — **COMPLETE** ✅
  - Backend-backed UI auto-refresh fallback — **COMPLETE** ✅
- Phase 7A: Dashboard/Reports UI Cleanup & API Client Migration — **COMPLETE** ✅
- Phase 7B: Reporting Hardening — **COMPLETE** ✅
- Phase UI-1: Design System Cleanup — **COMPLETE** ✅
- Phase UI-2: Cashier POS Flow Redesign — **COMPLETE** ✅
- Phase UI-3: Owner/Manager Screens — **COMPLETE** ✅
- Phase UI-4: Responsive & Polish — **COMPLETE** ✅
- Pagination & Performance Optimization — **COMPLETE**
- KHQR Provider Transition — **SUSPENDED SAFELY** ✅
  - Cash remains the active checkout method.
  - Backend KHQR creation, explicit status checks, and the background checker are disabled by default.
  - Frontend KHQR checkout, polling modal, and resume actions are hidden by default.
  - Historical KHQR orders, reports, receipts, audit data, schema fields, and provider code are retained for a future approved merchant integration.

- **Safely suspended KHQR payment processing**:
  - Added explicit opt-in `KHQR_ENABLED` and `VITE_KHQR_ENABLED` feature flags, both defaulting to `false`.
  - Backend KHQR order creation and status checking return `503 KHQR_DISABLED` before database or provider work begins.
  - The startup background checker exits before querying pending orders or calling Bakong when KHQR is disabled.
  - Cashier checkout now shows cash as the only payment action; pending historical KHQR orders remain visible but cannot be resumed.
  - Added a database-free regression test covering creation, status checking, and background-checker suspension.
  - Updated active README, API, payment-flow, Swagger, project, and architecture documentation without deleting historical implementation records.

- **Completed backend service-layer cleanup (Step 1)**:
  - Added dedicated product, category, stall/device, user/RBAC, and Telegram callback services.
  - Reduced active controllers to HTTP input/output handling; controllers no longer import repositories or Sequelize models directly.
  - Preserved existing routes, status codes, response shapes, ownership checks, role restrictions, credential hashing, terminal revocation, and kitchen callback behavior.
  - Added a shared status-aware HTTP error helper for service validation failures.
  - Restored the live credential test deleted during the device migration and updated it for registered-terminal PIN login.
  - Backend lint passes with no errors; controller/service import and credential-test syntax checks pass.

- **Split the backend order service by responsibility (Step 2)**:
  - Replaced the former 928-line order service with a stable facade that preserves every existing public export.
  - Extracted backend-owned order creation, trusted item/total calculation, KHQR generation, and `order_created` audit logging.
  - Extracted cash confirmation, change calculation, row locking, payment audit logging, and paid-order kitchen dispatch.
  - Extracted KHQR provider checking, amount/currency/account validation, idempotent row-locked confirmation, WebSocket notification, and background-checker support.
  - Extracted owner/cashier access checks, order history queries, and Telegram retry rules into focused modules under `backend/src/services/orders/`.
  - Preserved all route/controller/background-checker imports through `backend/src/services/order.service.js`.
  - Backend lint passes with no errors; facade export parity and full Express app imports pass.

- **Split backend reporting by responsibility (Step 3)**:
  - Reduced `report.service.js` from a 717-line mixed module to report validation, mapping, trend composition, and response orchestration.
  - Added `report.repository.js` for owner-scoped raw SQL summary/breakdown/trend queries and the paginated Sequelize transaction ledger.
  - Added `report-range.util.js` for Cambodia-local date boundaries, Monday-based weeks, custom ranges, previous-period comparisons, UTC SQL formatting, and trend granularity.
  - Preserved the `getSalesReport` export and existing controller/API response contract.
  - Backend lint passes with no errors; report/app imports, public export parity, custom-range formatting, and granularity checks pass.
  - A live MySQL response comparison remains pending because the backend was not running during this refactor.

- **Organized backend startup and development operations (Step 4)**:
  - Moved duplicate-index cleanup, legacy terminal migration, and the process-local KHQR checker from general services into `backend/src/startup/`.
  - Moved the Ngrok/Telegram webhook runner from `utils/` into `backend/src/scripts/dev/` and updated `npm run tunnel`.
  - Updated `server.js` startup imports while preserving schema cleanup, legacy device migration, and KHQR checker execution order.
  - Corrected the tunnel script's relative `.env` path after relocation.
  - Updated active architecture and KHQR flow documentation; historical handoff documents remain unchanged.

- **Removed the obsolete payment webhook placeholder (Step 5)**:
  - Removed the unauthenticated `POST /api/webhook/payment` route, controller, and Express mount; the endpoint previously returned `501` and never processed payments.
  - Removed the legacy Swagger, backend README, and API endpoint documentation entries.
  - Kept the real Telegram callback at `POST /api/telegram/callback` unchanged.
  - Updated current project, architecture, and roadmap wording to describe the implemented Bakong MD5 status-check and background-checker flow instead of a Bakong webhook.

- **Added backend stabilization tests (Step 6)**:
  - Added database-free tests for Cambodia-local report boundaries, invalid dates, custom-range granularity, previous-month comparisons, and percentage changes.
  - Added an opt-in live order suite covering trusted backend totals, item snapshots, hidden and cross-stall product rejection, invalid quantities, cashier management-route denial, cash underpayment/change, duplicate confirmation, and cashier/owner histories.
  - The live order suite creates uniquely named test data and deletes its orders, audit logs, items, products, assignments, devices, stalls, category, and cashier in foreign-key-safe order.
  - Added `npm test`, `npm run test:orders`, and `npm run test:live`; backend lint now includes `tests/`.
  - Unit tests pass (4/4) and backend/test lint passes with no errors. Live tests remain pending because the local API was not running.

- **Standardized SweetAlert notifications**:
  - Changed management success/error feedback to bottom-right toast notifications with a 3-second timeout and visible progress bar.
  - Kept destructive confirmations and blocking loading dialogs centered so they cannot disappear before the user responds or the operation finishes.

- **Implemented multi-device terminal identity and real-time revocation**:
  - Added `stall_devices` with hashed tokens, device names, active/revoked state, last-seen time, and most recent cashier metadata.
  - Added startup migration from the former single `stalls.device_token` registration without invalidating existing registered browsers.
  - Bound cashier PIN login and 8-hour JWTs to an active `device_id` and `stall_id`; all protected cashier API and Socket.IO connections now verify the matching device token.
  - Changed Stall Management to list each active device and revoke one by ID, preserving all other devices at the stall.
  - Added targeted `device:revoked` Socket.IO logout plus API-interceptor and browser-focus validation fallbacks.
  - Added same-business `device_registry_updated` events so an open Owner/Manager Stall Management screen refreshes immediately after another terminal is registered or deregistered.

- **Moved terminal deregistration into Stall Management**:
  - Added the Owner/Manager-protected `DELETE /api/stalls/:id/device` endpoint, scoped to the authenticated business, to revoke a terminal by clearing its database token.
  - Stopped exposing device tokens in stall-list responses and added the safe `device_registered` status flag instead.
  - Added per-stall device status and a typed `DEREGISTER` confirmation flow to the management portal.
  - Removed the login-screen action that only cleared local browser state without revoking backend access.

- **Fixed the cashier KHQR confirmation dialog layout**:
  - Made compact confirmation-dialog message content span the available panel width so summary rows no longer collapse around their text.
  - Reworked the item/total summary with responsive spacing and semantic theme tokens for clear separation in light and dark modes.

- **Restored automatic KHQR payment reconciliation**:
  - Started the existing KHQR background checker when the HTTP/WebSocket server begins listening, so pending payments keep checking after the cashier closes the QR modal.
  - Removed temporary startup diagnostics that printed the configured Bakong account ID while retaining safe missing-configuration checks.
  - Kept backend verification strict: only a Bakong-confirmed transaction with matching amount, USD currency, and destination account can mark an order paid.

- **Added standalone bulk demo product seeder (`npm run seed:bulk`)**:
  - Added `backend/src/scripts/seed-bulk-products.js`, an idempotent script that appends 100 new demo products per owner (`role='owner'`), independent of the deterministic `seed.js` so canonical demo data and order history stay untouched.
  - Each product is assigned to one of that owner's existing categories (product ownership flows through `Category.owner_id`), linked to every active/non-deleted stall of the owner via `stall_products`, and given a remote faker image URL (`faker.image.urlLoremFlickr`, clamped to the 500-char `image_url` limit).
  - Seeded faker deterministically per owner (`faker.seed(BULK_SEED_BASE + owner.id)`) and used find-or-create by product `name` and by `(stall_id, product_id)` so re-runs do not create duplicates; wrapped each owner's writes in a transaction.
  - Added a cross-owner contamination guard that regenerates a product name (owner-slug + counter) when a name clash resolves to another owner's category.
  - Registered `"seed:bulk": "node src/scripts/seed-bulk-products.js"` in `backend/package.json`.

- **Fixed pre-existing schema drift in seed scripts** (`seed.js` and `seed-bulk-products.js`):
  - Both scripts called plain `sequelize.sync()`, which never added the `default_price_usd`/`default_price_khr` columns declared on the `Product` model, so any `Product.findOrCreate` failed with `Unknown column 'default_price_usd'`.
  - Changed the sync call to match `server.js`: `{ alter: true }` in `development`, `{}` otherwise, so the columns are created before seeding. This also fixes the same latent failure in the base `seed.js`.

- **Implemented public landing page (`/`)**:
  - Added `frontend/src/pages/LandingPage.jsx` as a marketing/public route at `/` with no sign-up; only two login entry points (Cashier Terminal → `/login?mode=cashier`, Management Portal → `/login?mode=management`).
  - Built hero, feature grid (KHQR, cashier-only confirmation, Telegram kitchen, multi-stall reports), 3-step "How it works", final CTA band, and footer using existing `Logo`, `Button`, `Icon`, and `ThemeToggle` primitives.
  - Used semantic theme tokens (8px grid, `bg-ui-bg`/`bg-ui-surface`/`border-brand-border`/`text-brand-action`) so it renders correctly in both dark and light mode via the existing `data-theme` system.
  - Wired the `/` route in `App.jsx` (lazy-loaded) and updated `LoginPage` to honor a `?mode=` query param for the initial cashier vs. management login mode.
  - Verified frontend lint and production build; both pass. ✅

- **Fixed login mode URL sync & Cashier/Management separation** (`LoginPage.jsx`):
  - Made `?mode=` query param the source of truth for `loginMode` via `useSearchParams`, replacing the one-time `window.location.search` read.
  - Gave explicit `?mode=management` priority over device registration so a registered cashier terminal cannot force cashier mode when management is requested.
  - `setLoginMode` now writes the URL (`setSearchParams`) so switching modes updates the address bar; memoized with `useCallback` to keep `loadActiveCashiers` deps valid.
  - Frontend lint passes with no warnings.

- **Fixed cashier receipt contrast across light and dark themes**:
  - Replaced legacy receipt color utilities with explicit semantic surface, border, and text tokens.
  - Strengthened item, totals, cash/change, metadata, and payment-status readability without changing receipt behavior.
  - Styled final order and aggregate sales totals in the shared success green across cart, cash/KHQR confirmation, receipt, cashier history, dashboard, and management reporting views.
  - Frontend lint and production build pass.

- **Polished Menu & Catalog product selection and grid layout**:
  - Replaced hard-coded selected and hover colors with theme-aware surfaces and readable text in light and dark modes.
  - Added a strong brand outline and background treatment to the product currently open in the editor.
  - Replaced fixed-width desktop cards with evenly distributed responsive columns to remove unused grid gaps.
  - Improved grid action-menu contrast and kept mobile cards to practical one-, two-, and three-column breakpoints.
  - Applied matching theme-aware hover, expanded-category, product-row, and action-control contrast fixes to the Categories tab.
  - Frontend lint and production build pass.

- **Fixed unassigned products disappearing from Menu & Catalog**:
  - Changed Owner/Manager product listing and ownership checks to use the product's owner-scoped category instead of requiring a stall assignment.
  - Products with zero selected stalls now remain manageable in the business catalog and are not soft-deleted.
  - Added product-level default USD/KHR prices so removing the final stall assignment no longer resets the configured price.
  - Added inline editor validation when a product is missing a valid positive price, with assignment-specific guidance.
  - Cashier product loading remains strictly scoped to visible products assigned to the cashier's stall.

- **Implemented Owner/Manager reporting UX upgrade**:
  - Kept Today, Week, and Month report presets and added a responsive custom date-range dialog backed by the existing validated `range=custom` report API.
  - Replaced CSV export with a direct PDF report containing the selected date/filter context, backend summary totals, stall and cashier breakdowns, and transaction ledger rows.
  - Loaded PDF dependencies only when export is requested so normal portal loading remains lean.
  - Fixed the dashboard Hourly Revenue Breakdown to use the backend report's complete 24-hour buckets and added clear loading, error, and no-paid-sales states.
  - Corrected report date-only response formatting so local calendar dates are not shifted backward by UTC conversion.
  - Restored CSV export alongside PDF so teams can choose a spreadsheet-ready ledger or a presentation-ready report.
  - Frontend lint, production build, and a jsPDF/AutoTable runtime smoke test pass.

- **Fixed Hourly Revenue Breakdown timezone conversion**:
  - Kept database order timestamps in UTC and converted hourly SQL buckets to the configured business-local offset.
  - Made today/week/month/custom report boundaries independent of the API server's operating-system timezone.
  - Added validated `REPORT_TIMEZONE_OFFSET` configuration with a Cambodia default of `+07:00`.

- **Simplified the cashier KHQR payment modal**:
  - Rebuilt the modal around the provided official KHQR asset with merchant name, amount, payment status/expiry, and QR as the only primary information.
  - Removed duplicated instructions, payment reference, QR fingerprint, poster footer, and long close guidance that crowded narrow screens.
  - Made QR sizing viewport-aware so the complete code stays visible on mobile.

- **Implemented Phase UI-1 Design System Cleanup**:
  - Added shared frontend primitives: `Button`, `Alert`, `Badge`, `Switch`, `EmptyState`, and `LoadingState`.
  - Expanded Tailwind theme tokens for primary hover, warning state, UI surfaces, borders, and text colors.
  - Improved `ModalShell` with optional size classes and close-button support.
  - Improved `FormInput` and `FormSelect` with helper text, error text, required markers, disabled styling, and accessible error metadata.
  - Refactored `ConfirmDialog`, `FormActions`, `StatusBadge`, `TabPills`, and `OwnerCrudTable` to use the shared foundation components where safe.
  - Replaced the private product editor availability toggle in `MenuCatalog.jsx` with the shared `Switch`.
  - Verified frontend lint and production build; build still reports the existing large bundle warning for future code-splitting consideration.
  - Verification pass restored the existing `brand-yellow` token used by login/dialog classes and added pointer cursor affordance to the shared `Button`.
  - Re-ran frontend lint and production build after the verification fixes; both passed with the same non-blocking large bundle warning.

- **Implemented Phase UI-2 Cashier POS Flow Redesign**:
  - Redesigned the cashier workspace into a clearer POS layout with stronger Quick Sale/My Orders separation, responsive product browsing, and a more touch-friendly cart panel.
  - Improved product cards, category filters, search, empty states, loading states, and backend error presentation for the cashier selling flow.
  - Upgraded cart rows, quantity controls, totals display, checkout disabled states, and clear-cart confirmation using shared UI primitives.
  - Replaced cashier checkout/resume native `alert()` usage with inline `Alert` feedback and page-level cashier notices.
  - Polished cash confirmation and KHQR payment modal UX while keeping backend-owned payment status and KHQR checking behavior unchanged.
  - UI-2 verification corrected narrow-phone product cards to use one column below 460px so touch-sized quantity controls are not clipped.
  - UI-2 verification made the global cart action return to Quick Sale and close the cart when entering My Orders, avoiding a no-op tablet/mobile cart button.
  - Verified frontend lint and production build; build still reports the existing non-blocking large bundle warning.

- **Implemented Phase UI-3 Owner/Manager Screens**:
  - Polished the management shell with clearer page titles, consistent TouB POS branding, responsive navigation, and mobile logout access.
  - Replaced native product, user, and stall mutation alerts with shared inline feedback while preserving backend authorization and CRUD behavior.
  - Kept product and staff editors open after failed saves so validation errors remain actionable.
  - Made staff statistics, employee rows, product filters, report filters, cashier sales metrics, and transaction ledger rows responsive for desktop and mobile.
  - Replaced technical shift-allocation placeholder language with a demo-ready future-scope empty state.
  - Fixed the cashier WebSocket role guard to use normalized role values, restoring real-time cashier order and kitchen updates.
  - Verified at 1440px desktop and 390px mobile with Playwright; checked dashboard, catalog, staff management, sales reports, ledger, mobile navigation, and horizontal overflow.

- **Implemented Phase UI-4 Responsive & Polish**:
  - Added route-level lazy loading for login, cashier, and management pages; the initial production chunk is now about 283 KB and the previous bundle-size warning is gone.
  - Added shared modal keyboard behavior: Escape closes cancellable dialogs, Tab stays inside the active dialog, and focus returns to the triggering control.
  - Replaced the final native terminal deregistration confirmation with the shared confirmation dialog.
  - Added a global focus-visible fallback for buttons, links, inputs, selects, textareas, and custom interactive controls.
  - Fixed mobile development credentials so they remain in document flow instead of overlapping login/register cards.
  - Adjusted product management breakpoints so 768px and 1024px use responsive cards while 1280px uses the complete table without clipped actions.
  - Added clean cashier product-image fallbacks for failed media URLs and aligned the Stall Management primary action with the shared TouB blue.
  - Verified login, cashier catalog/cart/payment dialogs, dashboard, products, stalls, staff, reports, and destructive dialogs at 390px, 768px, 1024px, and 1280px with no horizontal overflow or browser console errors.
  - Frontend lint and production build pass with no bundle-size warning.

- **Implemented Phase 5.5 RBAC Hierarchy Cleanup**:
  - Finalized the active role hierarchy as `platform_admin`, `owner`, `manager`, and `cashier`.
  - Removed the previous unsafe privileged-user creation path and all active compatibility handling for the former privileged role name.
  - Added `platform_admin` as a temporary TouB POS team bootstrap role that can create business Owner accounts only.
  - Confirmed that customer businesses allow one Owner account; extra supervisors should be Managers.
  - Kept `platform_admin` API-only for now with no frontend platform console.
  - Updated development startup seeding so an empty dev database creates `platform_admin/platform123`.
  - Synchronized Sequelize, SQL schema/docs, API docs, Swagger docs, frontend role helpers, and active context documentation.

- **Applied post-RBAC security audit fixes**:
  - Scoped single-order access so Owner/Manager users can fetch, confirm cash payment, or check KHQR status only for orders belonging to their business owner scope.
  - Hardened terminal registration so Owner/Manager users can register device tokens only for stalls belonging to their business owner scope.
  - Removed the KHQR demo account fallback; `BAKONG_ACCOUNT_ID` is now required for KHQR generation and paid-status validation.
  - Updated API docs, Swagger, payment flow docs, backend README, and architecture notes to reflect same-business order permissions and required Bakong account configuration.

- **Implemented cash change calculation for cash confirmation**:
  - Added backend-owned cash received/change tracking on orders with `cash_received_usd` and `change_due_usd`.
  - Updated `POST /api/orders/:id/confirm-cash` so the cashier submits the cash amount received, while the backend rejects underpayment and calculates the saved change due.
  - Updated the cashier cash confirmation modal to collect cash received, preview change, and show cash/change values on the receipt.
  - Synchronized Sequelize, raw SQL schema/query docs, ERD, API docs, Swagger, payment flow docs, and active architecture notes.

- **Applied Phase 6 readiness cleanup after teammate pull**:
  - Restored backend startup environment validation for JWT, database, production CORS, and development platform-admin seed settings.
  - Documented the `PLATFORM_ADMIN_*` development seed variables in `.env.example`, backend README, and getting-started docs.
  - Fixed the frontend product image fallback state in `MenuCatalog.jsx` so React lint passes before Phase 6 WebSocket work.

- **Implemented Phase 6A cashier-scoped WebSocket payment notifications**:
  - Installed Socket.IO on the backend and `socket.io-client` on the frontend.
  - Refactored backend startup to use an HTTP server and initialize `websocket.service.js` beside Express.
  - Added JWT-authenticated cashier sockets with a strict `cashier_id -> socketIds` mapping.
  - Connected the KHQR paid-status path so `payment_confirmed` is emitted only to the cashier who created the paid order.
  - Added a frontend cashier socket client that refreshes the matching order and shows the receipt when the live event arrives.
  - Kept KHQR polling active as a fallback until a real webhook/background status checker exists.

- **Implemented Phase 6B KHQR-to-Telegram dispatch hook**:
  - Reused the existing `dispatchToTelegram` kitchen ticket flow after KHQR status checking marks an order as `paid`.
  - Kept dispatch fire-and-forget so Telegram errors do not roll back or break the paid-order response.
  - Only newly processed KHQR confirmations dispatch to Telegram; already-paid idempotent status checks do not re-dispatch.

- **Hardened Telegram kitchen dispatch recovery**:
  - Made `dispatchToTelegram` idempotent by skipping orders that already have a `telegram_tickets` row.
  - Allowed already-paid KHQR status checks to recover missing Telegram tickets for orders that were paid before the Telegram hook was active or before the backend was restarted with Telegram configuration.
  - Preserved duplicate protection so repeated status checks do not spam the kitchen chat.

- **Implemented Phase 6C KHQR background status checker**:
  - Added `khqr-background-checker.service.js` to periodically scan unexpired `pending_payment` KHQR orders.
  - Reused the existing Bakong validation and paid-confirmation path, including amount/currency/account validation, audit logging, WebSocket notification, and Telegram dispatch.
  - Added optional environment controls for enabling the checker, interval, and batch size.
  - Kept frontend QR-modal polling as a fallback instead of the only status detection mechanism.

- **Implemented Phase 6D Telegram ticket visibility and retry**:
  - Added `POST /api/orders/:id/retry-telegram` with same-business order access checks for Owner/Manager and own-order access checks for Cashier.
  - Kept pending/sent/done Telegram tickets protected from duplicate dispatch while allowing paid orders with missing or failed tickets to retry.
  - Added kitchen ticket status badges to the management transaction ledger and retry actions for recoverable tickets.
  - Added cashier-side "Kitchen issue" warning badges and retry actions when the cashier's own paid order kitchen dispatch is missing or failed.

- **Fixed live Telegram "Done" UI refresh**:
  - Added a `kitchen_ticket_updated` Socket.IO event after Telegram dispatch finishes as `sent`/`failed` and after callback processing saves a ticket as `done`.
  - Routed the event to the creating Cashier and same-business Owner/Manager sockets only.
  - Updated Cashier and Owner/Manager order screens to refresh order history from the backend when the event arrives, so ticket status changes appear without a full page reload.
  - Stopped treating `pending` tickets as retryable because `pending` means the original dispatch is still in progress.

- **Fixed live Owner/Manager order history refresh**:
  - Added a management-scoped `order_updated` Socket.IO event for new orders and payment status changes.
  - Emitted `order_updated` after backend-owned order creation, cash payment confirmation, and KHQR paid confirmation.
  - Updated Owner/Manager portal sockets to refresh order history from the backend when same-business order events arrive.

- **Fixed cashier-side Telegram ticket refresh state**:
  - Updated the cashier live ticket handler to reload the exact changed order and replace matching open receipt/KHQR modal state, not only the order list.
  - Added a short paid-order refresh fallback for cash and KHQR flows so quickly completed Telegram dispatches do not leave the cashier UI showing stale `pending` ticket state.

- **Closed Phase 6 handoff and verification**:
  - Created `docs/codex-handoff-phase-6.md` for teammate review.
  - Verified backend lint, frontend lint, and frontend production build after live payment, Telegram ticket, retry, and UI refresh fixes.
  - Marked Phase 6 complete and moved remaining work into post-Phase 6 monitoring/cook-authorization follow-up.

- **Implemented Owner/Manager Operations Watch**:
  - Added a compact operations alert panel to the management order screen.
  - Surfaces failed/missing/pending Telegram kitchen tickets and pending/expired KHQR orders using existing backend-owned order data.
  - Added quick filters into the transaction ledger so Owner/Manager users can jump directly to affected orders and retry recoverable kitchen tickets.

- **Fixed Operations Watch filtering semantics**:
  - Replaced broad text-search filtering with exact operational filters for each alert card.
  - `KHQR waiting` now shows only unexpired `pending_payment` KHQR orders instead of all KHQR orders.
  - Renamed the kitchen in-progress card to `Kitchen waiting` and included KHQR orders that are waiting for payment before kitchen dispatch.

- **Implemented safe KHQR close and resume flow**:
  - Renamed the KHQR modal action from destructive-looking `Cancel` to `Close QR`.
  - Closing the QR screen now clearly keeps the backend order in `pending_payment`.
  - Added a cashier-side `Resume QR` action for unexpired pending KHQR orders with an existing QR payload.
  - Resume fetches the latest backend order first, reopening the QR if still pending or showing the receipt if payment already completed.

- **Implemented KHQR pre-checkout confirmation**:
  - Clicking the KHQR checkout button now opens a confirmation dialog instead of immediately creating a backend order.
  - The confirmation shows item count and total, with `Back to cart` and `Create KHQR` actions.
  - Backend order creation and QR generation now happen only after the cashier confirms `Create KHQR`.

- **Added backend-backed UI auto-refresh fallback**:
  - Added a shared frontend `useAutoRefresh` hook that refreshes server-owned data when the tab regains focus, becomes visible, and on a quiet interval.
  - Wired products/categories, staff users, orders, stall lists, stall assignments, cashier assigned-stall lookup, and cashier login roster to refresh without requiring a full page reload.
  - Kept existing WebSocket order/payment updates as the primary live path while adding polling/focus refresh as a safety net for screens that do not yet receive specific socket events.

- **Implemented Phase 7A dashboard/report cleanup and API client migration**:
  - Replaced frontend `fetch()` usage with the centralized Axios-backed API client while preserving JWT and device-token header behavior.
  - Added Recharts for Owner/Manager reporting visualizations and replaced the dashboard's static SVG revenue chart with a data-driven Recharts area chart.
  - Cleaned the dashboard tab by removing Average Ticket Prep Time, Recent System Events, and Quick Tasks.
  - Cleaned Sales Report analytics by removing fake prep-speed metrics and replacing them with backend-order-derived stall activity and payment mix.
  - Added a Receipt action to each Owner/Manager transaction ledger row using the existing receipt modal.

- **Implemented Phase 7B reporting hardening**:
  - Added `GET /api/reports/sales` for Owner/Manager sales reporting with backend-enforced same-business scoping.
  - Added date range, stall, and cashier filters plus backend-calculated revenue, payment mix, stall/cashier breakdowns, hourly revenue, and ledger rows.
  - Wired the Owner/Manager Sales Reports screen to the backend report endpoint with loading/error states, auto-refresh, direct PDF export, preset/custom date ranges, and backend report filters.
  - Removed remaining fake cashier status/prep-speed style reporting from the sales matrix and kept receipt viewing available from the transaction ledger.
  - Synchronized API docs, Swagger docs, raw SQL query examples, and architecture notes.

- **Fixed local backend startup after repeated Sequelize alter syncs**:
  - Moved `orders.payment_reference` and `stalls.device_token` to named Sequelize unique indexes.
  - Added a development-only startup cleanup that drops duplicate generated MySQL unique indexes and keeps the canonical named index.
  - Synchronized `schema.sql` and `queries.sql` so raw SQL docs match the named-index model definitions.

- **Enforced Multi-Owner Data Isolation & Security across Backend Operations**:
  - Added an `owner_id` column to the `users` table to link managers and cashiers to their business owners.
  - Signed the authenticated owner's user ID (`owner_id`) into the JWT token payload.
  - Implemented data-scoping filters on `GET /api/stalls`, `GET /api/users`, `GET /api/products`, `GET /api/orders`, and `GET /api/reports/daily` so that logged-in users only retrieve resources belonging to their business.
  - Hardened route mutations (`create/update/delete`) for stalls, products, and users to perform server-side checks preventing cross-owner updates.
  - Updated seeding logic to assign the correct `owner_id` to managers and cashiers under each owner.
  - Synchronized `erd.md`, `schema.sql`, and `queries.sql` to maintain 100% database schema parity.

- **Refactored local demo database seeding system to be modular, ERD-aligned, and multi-owner supporting**:
  - Replaced the monolithic `seed-demo-data.js` script with a clean driver entry point `backend/src/scripts/seed.js`.
  - Separated concerns into modular seeder modules under `backend/src/scripts/seeders/` including `data.js` (static configurations), `helpers.js` (pricing/date utilities), `users.js` (user seeding), `stalls.js` (stall creation and staff assignments), `menu.js` (menu items catalog), and `orders.js` (orders, order items, audit logs, and Telegram tickets).
  - Added support for seeding 3 distinct business owners (`owner`, `owner_bixby`, `owner_clara`), each with their own assigned manager, stalls, cashiers, product menu assignments, and transaction logs.
  - Refactored order seeding to populate `telegram_tickets` for paid/pending orders to fully align the test data with `erd.md` definitions.
  - Added mock `telegram_chat_id`s in stall seeds so that the Telegram KDS can be tested with seeded values.
  - Updated `package.json` to map `npm run seed` to the new `seed.js` script.

- **Added local Faker demo database seeding**:
  - Installed `@faker-js/faker` in the backend and added `npm run seed`.
  - Added a safe upsert seeder for owner/manager/cashier users, stalls, cashier assignments, categories, products, per-stall prices, and recent fake order history.
  - Marked seeded audit-log details so repeat seed runs skip duplicate fake order generation while preserving existing project data.
  - Documented the seed command, local-only warning, and demo credentials in `backend/README.md`.
- **Strict Stall-Scoped Cashier Roster & Device Registration**:
  - Implemented backend repository methods to query and update a stall's `device_token` in the database.
  - Implemented `POST /api/stalls/:id/register-device` controller and route under Owner/Manager JWT protection to generate secure random device tokens.
  - Restructured backend `getPublicCashiers` to strictly require the `X-Device-Token` header, verify it against the database, and return only cashiers assigned to that specific stall.
  - Integrated the two-stage frontend provisioning flow: authenticating Owner/Manager credentials, showing the list of stalls for registration, and saving the resulting token.
  - Updated API request handlers to append the `X-Device-Token` header to all outgoing requests when provisioned.
  - Implemented terminal de-registration to clean up all storage tokens and block access until re-provisioned.

- **Refactored seed to per-owner menus**:
  - Moved `categories` and `products` arrays inside each `OWNER_SEEDS` entry in `data.js`, removed global `CATEGORY_SEEDS`/`PRODUCT_SEEDS`.
  - `seedMenu` now iterates over each owner record, creates their specific categories + products, and assigns only to that owner's stalls.
  - Each owner has their own themed catalog: owner (general food court), owner_bixby (BBQ & Bakery), owner_clara (Juice & Desserts).

- **Added `owner_id` to categories for multi-owner data isolation**:
  - Added `owner_id INT NOT NULL` column + FK to `categories` table in `schema.sql`.
  - Updated `erd.md` with the new column and `users ||--o{ categories : "manages"` relationship.
  - Updated note: categories are per-owner menu groupings, not global.
  - Added `Category.belongsTo(User)` / `User.hasMany(Category)` association in `models/index.js`.
  - Scoped `getCategories` in the controller to filter by the authenticated owner.
  - Set `owner_id` on `createCategory` from the authenticated user's owner chain.
  - Added ownership checks on `updateCategory` and `deleteCategory` to prevent cross-owner mutations.
  - Updated `validateCategoryRef` in the product controller to reject cross-owner category assignment.
  - Updated the dev migration fallback category creation to resolve and assign an `owner_id`.
  - Added `UNIQUE KEY uq_category_owner_name (owner_id, name)` to prevent duplicate category names per owner.

- **Refactored product database structure to match the current ERD**:
  - Converted `categories` into global menu groups shared across stalls (later revised to per-owner).
  - Converted `products` into shared catalog metadata with `category_id`, `name`, and `image_url`.
  - Replaced the partial `product_stalls` assignment table with ERD-aligned `stall_products`.
  - Moved per-stall `price_usd`, `price_khr`, and `is_visible` into `stall_products`.
  - Updated Sequelize associations so `Category` groups `Product`, while `Product` and `Stall` connect through `ProductStall`.
  - Updated product create/update/list repository logic to create and return stall-specific assignments.
  - Updated order creation to load trusted sale prices from the cashier's assigned `stall_products` row.
  - Kept frontend product mapping compatible with the existing admin UI shape while reading the new assignment response.
  - Synchronized `docs/database/schema.sql`, `docs/database/queries.sql`, `docs/database/erd.md`, and architecture context with the refactor.
  - Verified backend lint, frontend lint, and frontend production build; backend lint still has pre-existing warnings in unrelated files.

- **Fixed local backend startup after product ERD refactor**:
  - Added a development-only pre-sync migration that creates a fallback category when needed and backfills legacy `products.category_id` values before Sequelize adds the non-null foreign key.
  - Added duplicate unique-index cleanup for repeated Sequelize `alter` syncs on `stalls.device_token`.
  - Moved raw development migration SQL out of `server.js` into `backend/src/services/development-migration.service.js` so the server entry point only orchestrates startup.
  - Documented the matching raw SQL migration/debug steps in `docs/database/queries.sql`.

- **Enhanced Stall Roster & Employee Pool Layout with Transfer Confirmation**:
  - Split the employee pool into **Available** (unassigned) and **Assigned** categories.
  - Added a visual badge on assigned employee pills indicating their active stall name (or "This stall").
  - Implemented a clean, compact `ConfirmDialog` warning if an owner/manager drags or clicks to assign an employee already assigned to another stall.
  - Added a detailed footer tracking how many employees are assigned/unassigned relative to the current location.

- **Added filters to Menu Items in Menu & Catalog**:
  - Implemented dropdown select filters for **Category**, **Stall**, and **Availability/Status** in the back-office product catalog.
  - Positioned the filters in the panel header of the Menu Items list to optimize screen space and align with Figma layout aesthetics.
  - Updated the products search memo logic to combine text search with the selected category, stall, and stock status filters.

- **Removed legacy Station concept**:
  - Eliminated mock `station` field from frontend seed data, user model normalization, login page mapping, and blank form templates.
  - Removed "Station" column from the Staff Directory table and removed the "Station" input field from the add/edit employee modal.
  - Adjusted layout widths in the Staff Directory to expand the "Stall" column.
  - Replaced the "Station" metadata label in the Receipt Modal with "Stall", mapping to the backend-owned `stallName` field.
  - Configured `PageShell` and `Topbar` to receive and display the cashier's active assigned stall/location in the top bar session header.

- **Implemented ImageKit product photo uploads**:
  - Added ImageKit backend and frontend SDK dependencies.
  - Added Owner/Manager-only `GET /api/products/imagekit-auth` for short-lived browser-direct upload auth parameters.
  - Added ImageKit env placeholders in `backend/.env.example` and documented ImageKit as the product media storage boundary.
  - Hardened product `image_url` create/update validation to require a URL/app-relative path with the existing 500-character DB limit.
  - Added frontend product-photo upload controls with JPG/PNG/WebP validation, 5MB max size, progress state, error state, preview rendering, and manual URL fallback.
  - Kept v1 persistence scoped to the existing `products.image_url` field; ImageKit `fileId` deletion/cleanup remains out of scope.
- Phase 5: KHQR Individual Payment Flow — **COMPLETE**
- Phase 6: KDS, Telegram Kitchen, And Live Payment WebSocket Integration — **COMPLETE**

- **Generated current code-backed ERD documentation**:
  - Refreshed `docs/database/erd.md` from the active Sequelize models and canonical SQL schema.
  - Added current KHQR order fields, line item totals, timestamps, nullable shared menu scoping, and `audit_logs`.
  - Kept the Mermaid relationship diagram aligned with the Owner / Manager / Cashier, stall, order, Telegram ticket, and audit-log model.

- **Implemented Phase 5 KHQR Individual Payment Flow**:
  - Added `bakong-khqr` SDK-backed Individual KHQR generation for KHQR orders.
  - Kept order creation backend-owned: cashier checkout sends only item IDs, quantities, notes, and payment method while backend derives cashier/stall and calculates trusted totals.
  - Added KHQR order metadata storage: `qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at`.
  - Added protected `GET /api/orders/:id` for passive order reads, with cashier ownership enforced server-side.
  - Updated the KHQR modal to display backend QR payload details and rely on backend payment status.
  - Synchronized Sequelize models, raw SQL docs, ERD notes, API docs, Swagger, architecture, and payment-flow docs.

- **Upgraded Phase 5 to real Bakong transaction status checking**:
  - Added backend-only Bakong Open API checking by stored KHQR `qr_md5` through `POST /api/orders/:id/check-khqr-status`.
  - Added `BAKONG_OPEN_API_BASE_URL` and backend-only `BAKONG_OPEN_API_TOKEN` configuration.
  - Backend calls `/v1/check_transaction_by_md5`, normalizes provider responses, and validates amount, currency, and configured destination account before marking an order `paid`.
  - Made already-paid checks idempotent so repeated polling does not duplicate `khqr_payment_confirmed` audit logs.
  - Updated KHQR modal polling to call the TouB backend status-check endpoint instead of passively reading order status.
  - Updated active docs, Swagger, architecture notes, and environment examples to show that the frontend never receives the Bakong Open API token.

- **Finalized Phase 5 production Bakong KHQR flow**:
  - Standardized KHQR confirmation on backend-owned Bakong Open API status checking.
  - Simplified environment configuration to production/SIT Bakong Open API URL plus backend-only token.
  - Kept KHQR confirmation backend-owned through `POST /api/orders/:id/check-khqr-status`.

- **Refined role-specific user credential model**:
  - Updated active backend validation so Owner/Manager accounts use username/password only and Cashier accounts use PIN login only.
  - Made `users.password` nullable in Sequelize/SQL so Cashier accounts can store `password = NULL`.
  - Enforced create/update cleanup so Owner/Manager accounts cannot store PINs and Cashier accounts cannot store passwords.
  - Updated frontend staff forms to show password for Owner/Manager and PIN for Cashier, leaving edit credential fields blank unless a new credential is entered.
  - Synchronized active auth docs, API docs, ERD notes, and SQL references with the role-specific credential rules.
  - Marked the older frontend connection roadmap as historical so its old local credential fallback example is not treated as current auth guidance.
  - Improved the staff modal submit flow so validation/backend errors keep the modal open and the modal closes only after a successful save.
  - Added an opt-in live credential API test script (`npm run test:credentials` in `backend/`) for create/update/login credential rules.

- **Implemented Phase 4.5 Security Hardening**:
  - Changed Cashier PIN storage from plain text to bcrypt hashes and expanded the Sequelize/SQL `users.pin` field to hash-sized storage.
  - Updated user create/update so PINs are hashed before saving and blank PIN edits do not overwrite the existing PIN.
  - Updated PIN login to use bcrypt comparison and added a development-friendly fallback that upgrades old 4-digit plain PINs to bcrypt hashes after a successful login.
  - Added `express-rate-limit` protections to username/password login and stricter Cashier PIN login.
  - Added Helmet security headers while keeping Swagger documentation compatible.
  - Improved request logging sanitization so nested password/PIN/token/authorization/secret fields are masked.
  - Added typed `DELETE` confirmation to the centralized management delete modal.
  - Documented localStorage JWT as an accepted final-project tradeoff and HttpOnly refresh tokens as the production upgrade path.

- **Implemented Phase 4 Backend-Owned Orders**:
  - Reworked order creation so cashier checkout sends only product IDs, quantities, optional notes, and payment method.
  - Backend now derives cashier ID from JWT, stall ID from staff assignment, product prices from MySQL, and subtotal/total from database product snapshots.
  - Enforced backend rejection for unassigned cashiers, invalid quantities, hidden products, products outside the cashier's assigned stall, and request-body trusted fields such as `total`, `stall_id`, `cashier_id`, and `status`.
  - Updated order status vocabulary to `pending_payment`, `paid`, and `cancelled`, with a development migration for old `pending`/`completed` rows.
  - Added `POST /api/orders/:id/confirm-cash` so explicit cash confirmation marks cash orders as `paid` and stores `completed_at`.
  - Added database-backed `audit_logs` for `order_created` and `cash_payment_confirmed`.
  - Updated cashier checkout/history to use backend order responses instead of building paid receipts from frontend cart totals.
  - Removed fake order-history seed fallback from the management ledger so order history is backend-owned.
  - Deferred KHQR gateway verification to Phase 5.
  - Synchronized Sequelize models with `docs/database/schema.sql`, `docs/database/queries.sql`, API docs, and architecture context.

- **Applied Phase 4 RBAC cleanup**:
  - Confirmed cash payment can be confirmed by the creating Cashier, Owner, or Manager.
  - Removed stale frontend order localStorage storage-key export from `frontend/src/services/api.js`.
  - Updated active documentation wording from older two-role cash-confirmation language to the official Owner / Manager / Cashier model.
  - Kept Manager user-management restrictions intact: Managers can manage Cashier users only, while Owner-only role creation remains blocked server-side.

- **Applied Phase 3 verification fixes**:
  - Changed cashier user creation/update to use PIN-only authentication with `users.password = NULL`; owner/manager accounts still require password hashes, and SQL/model docs now allow nullable cashier passwords.
  - Hardened product create/update validation so prices must be numeric and positive, stall/category IDs must be valid, and invalid input returns clean `400`/`404` responses instead of database `500` errors.
  - Scoped cashier product reads to assigned-stall visible products and scoped cashier category reads to assigned-stall/global categories.
  - Restricted stall create/update inputs to normal editable fields (`name`, `location`) and stopped trusting request-body `owner_id`, `device_token`, or `telegram_chat_id`.
  - Validated staff assignment so only existing cashier users can be assigned to existing stalls.
  - Removed active Phase 3 UI reads from old localStorage stall/assignment helpers; staff displays now use backend stall assignment data, and non-backed shift scheduling shows a temporary state.
  - Removed fake/default PIN mapping from backend-fetched users and stopped sending password/PIN on user update unless a new PIN is typed.
  - Removed frontend fallback `stallId = 1`; product creation now requires an explicit stall.
  - Verified backend lint, frontend lint, frontend build, and API validation/scoping probes.

- **Implemented Phase 3 Backend & Frontend Integration**:
  - Rewrote frontend React hooks (`useProducts.js`, `useUsers.js`, `useOrders.js`) to fetch from and persist to Express.js API endpoints instead of `localStorage`.
  - Refactored `StallOwner.jsx` to fetch stalls dynamically (`api.stalls.getAll()`) and process staff assignments via the new `POST /api/stalls/:id/staff` and `DELETE` endpoints.
  - Plumbed asynchronous `loading` and `error` states through `OwnerPortalPage.jsx` into nested workspace components.
  - Implemented real-time loading spinners and error banners in `MenuCatalog`, `CategoryOwner`, and `StaffList` components to handle backend latency.
  - Removed outdated localStorage fallback code in `api.js` for orders, products, stalls, and users.

- **Refactored backend models to match the ERD kitchen/stall structure**:
  - Added `TelegramTicket` Sequelize model and `orders -> telegram_tickets` association so kitchen dispatch state is tracked separately from payment order state.
  - Added `stalls.owner_id` and `stalls.location` to the Sequelize model, controller inputs, canonical SQL schema, and raw SQL reference queries.
  - Removed order-level Telegram/kitchen status fields from active order creation and Sequelize order model usage.
  - Updated payment confirmation side effect to queue a `telegram_tickets` row after an order is completed, without rolling back successful payment completion on ticket queue failure.
  - Synchronized `docs/database/schema.sql`, `docs/database/queries.sql`, and architecture risk notes with the model refactor.

- **Renamed Telegram kitchen dispatch model**:
  - Replaced the temporary `KitchenTicket` model/file with `TelegramTicket` backed by the `telegram_tickets` table.
  - Removed the old `TelegramSession` model/file from the Sequelize model graph.
  - Added Sequelize and SQL indexes for `telegram_tickets.order_id`, `telegram_tickets.telegram_chat_id`, `telegram_tickets.status`, and the Telegram chat/message lookup pair.
  - Updated order reads, payment ticket queueing, ERD, SQL references, and architecture context to use `TelegramTicket`.

- **Implemented Owner / Manager / Cashier RBAC migration**:
  - Replaced active backend role enum and validation with `owner`, `manager`, and `cashier`.
  - Updated management API route guards so Owner and Manager can access operational management APIs, while Cashier remains blocked from management endpoints.
  - Enforced backend user-management limits: Owner can manage Manager and Cashier users; Manager can create/manage Cashier users only.
  - Changed the development default seed account to `owner/owner123` at that time; Phase 5.5 later changed empty-database bootstrap to `platform_admin/platform123`.
  - Updated frontend route guards, login redirects, permission helpers, demo credential copy, seed users, and staff-management role options for the three-role model.
  - Kept the management portal while removing active app-role dependence on the old `admin` role.
  - Synchronized Sequelize role definitions with `docs/database/schema.sql` and `docs/database/queries.sql`.
  - Verified `backend/npm run lint`, `frontend/npm run lint`, and `frontend/npm run build`.

- **Fixed local backend startup after RBAC migration**:
  - Added a development-only startup compatibility migration that originally converted existing legacy `admin` user roles to `owner`; Phase 5.5 now maps old `admin` values to `platform_admin`.
  - Documented the matching raw SQL migration steps in `docs/database/queries.sql`.

- **Implemented Phase 2 frontend JWT authentication integration**:
  - Added a Vite-compatible API client using `VITE_API_BASE_URL` with a `http://localhost:3000/api` fallback and automatic Bearer token attachment.
  - Added an auth/session provider that stores the backend JWT and current user, restores sessions after refresh, and clears sessions on logout or `401` responses.
  - Replaced localStorage-based management credential checks with `POST /api/auth/login`; management portal login now requires a backend-authenticated Owner or Manager user.
  - Replaced `location.state` route guards with protected route logic for the management portal and `/cashier`.
  - Kept the cashier avatar/PIN UI visible as a temporary flow, but stopped creating fake cashier auth sessions until a backend PIN endpoint exists.
  - Hid demo credentials outside development/demo mode and removed active frontend `manager` role options.

- **Approved Owner / Manager / Cashier RBAC model**:
  - Replaced the previous two-role product direction with customer roles: Owner, Manager, and Cashier.
  - Owner has full control over one customer business and can create Manager and Cashier users.
  - Manager handles day-to-day operations and can create/manage Cashier users only.
  - Cashier remains limited to stall-scoped POS sales and personal shift/order history.
  - Phase 5.5 later added `platform_admin` as a separate TouB POS team bootstrap role for creating Owner accounts only.

- **Implemented Phase 1 backend auth/security hardening**:
  - Updated backend RBAC so `authorize()` supports string and array role inputs. Later phases replaced the early `admin`/`cashier` model with the current `platform_admin`/`owner`/`manager`/`cashier` hierarchy.
  - Added backend startup environment validation for `JWT_SECRET`, core DB settings, production `FRONTEND_ORIGIN`, and optional password-required DB setups.
  - Hardened login to reject inactive users with `403` after credential validation and kept JWT payload limited to `id`, `username`, and `role`.
  - Restricted CORS to `FRONTEND_ORIGIN`, with `http://localhost:5173` as the development fallback.
  - Made the then-default development seeding non-production only and removed PIN/password exposure from user API responses. Later phases replaced this with `platform_admin/platform123` bootstrap.

- **Fixed cashier stall assignment source mismatch**:
  - Centralized default stall data and default stall assignments in `frontend/src/utils/stallUtils.js`.
  - Updated Cashier, Stall Management, Staff Directory, and Sales Reports assignment reads to use the same shared helper.
  - Resolved the issue where Cashier Dara could appear assigned in the management portal but be blocked from the cashier portal until a refresh or save.

- **Enforced one-stall-per-cashier assignment in Stall Management**:
  - Updated roster drop assignment so assigning a cashier to a new stall first removes that cashier from every other stall roster.
  - Prevented Cashier Dara from appearing assigned to multiple stalls at the same time.

- **Implemented routing for the owner/manager portal and isolated auth guards**:
  - Defined the management portal route in `App.jsx` pointing to `OwnerPortalPage`; the active route is now `/owner-portal`.
  - Extracted management-only workspace, services, and routing hooks from `CashierPage.jsx` into a dedicated page `OwnerPortalPage.jsx`.
  - Set up bidirectional auth guards on `/cashier` and the management portal to prevent cross-role access and auto-redirect users to their authorized workspace.
  - Refactored `LoginPage.jsx` to navigate Owner/Manager users directly to the management portal.
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
- **Added persistent light and dark presentation themes**:
  - Added a shared theme context and accessible theme toggle on login, cashier, and owner/manager shells.
  - Kept the approved dark-tech theme as the default and added a warm, high-contrast light palette using the same semantic tokens.
  - Persisted the user's choice in browser storage and preserved the white KHQR scan surface in both themes.
  - Fixed Staff Management row hover styling so row text remains readable in dark and light mode.
- **Refined responsive cashier selling views**:
  - Added compact product thumbnails and image fallbacks to current-order cart rows.
  - Kept the Quick Sale catalog at two columns on phone widths with compact card typography and controls.
  - Converted My Orders to a bounded responsive card grid so order details fit without horizontal scrolling on mobile or oversized rows on desktop.
- **Improved mobile management navigation and report filtering**:
  - Matched the mobile owner/manager menu order to the desktop sidebar order.
  - Replaced stacked mobile report-period buttons with a compact dropdown while preserving the custom date dialog.
  - Changed Operations Watch into a horizontally scrollable snap row on mobile so key report data appears sooner.
  - Made the Selling Stalls KPI expand to fit every active stall and wrap long stall names safely on mobile.

- **Implemented server-side pagination & performance improvements**:
  - Created `backend/src/utils/pagination.js` shared utility (`parsePagination`, `buildOrderClause`, `buildPaginationMeta`, `paginatedResponse`).
  - Converted `order.service.js` `getAllOrders()` and `getOrdersByUser()` to `findAndCountAll` with server-side pagination, search, and date/status filters.
  - Converted `product.repository.js` (`findAllProducts`, `findAllProductsByOwnerId`, `findAllProductsForStall`), `user.repository.js` (`findAllUsers`, `findAllUsersByOwnerId`, `findOwnerUsers`), `stall.repository.js` (`findAllStalls`, `findAllStallsByOwnerId`), and `category.repository.js` (`findAllCategories`) to accept pagination options and use `findAndCountAll`.
  - Updated `order`, `product`, `user`, `stall`, and `category` controllers to pass `req.query` pagination parameters through to services/repositories.
  - Rewrote `report.service.js` summary, breakdown, and hourly aggregations to use raw SQL `GROUP BY` via `sequelize.query()` instead of in-memory iteration. `fetchLedgerOrders()` uses paginated `findAndCountAll`.
  - Added `page`/`limit` pagination support to API client methods (`products.getAll`, `categories.getAll`, `users.getAll`, `stalls.getAll`, `orders.getAll`) with dual-mode: no params returns flat array (backward compatible), with `{ page, limit }` returns `{ data, pagination }`.
  - Created `frontend/src/components/ui/Pagination.jsx` reusable pagination component with prev/next buttons, page numbers, ellipsis, and aria labels.
  - Created `frontend/src/hooks/usePaginatedQuery.js` generic paginated data-fetching hook (available for future use).
  - Wired `OrderHistory.jsx` ledger to server-side pagination via `useSalesReport` hook with `ledgerPage`/`ledgerLimit` params and `<Pagination>` component.
  - Added client-side pagination to `OwnerCrudTable.jsx` (20 per page), `StaffList.jsx` (15 per page), and `CashierScreen.jsx` My Orders tab (10 per page).
  - Added `loading="lazy"` to product images in `ProductCard.jsx`, `ProductOwner.jsx`, and `MenuCatalog.jsx`.
  - Frontend lint and production build pass cleanly. Backend lint has only pre-existing `no-console` warnings.
- **Removed confirmed unused legacy files and mock data**:
  - Removed obsolete frontend localStorage stall helpers, the unused ID utility, and the unconsumed generic pagination hook.
  - Removed the placeholder order repository and disconnected legacy payment service from the backend.
  - Removed unused frontend mock categories, products, users, and rate constants while retaining active role/tone constants.
  - Removed the tracked Vite error log and added `*.err` to the root ignore rules.
- **Restored a clean lint baseline before folder migration**:
  - Reworked catalog pagination resets to happen in filter event handlers and safely clamp the active page when results shrink.
  - Added required braces to backend report/pagination conditionals and removed unused Sequelize report imports.
- **Started the frontend feature-folder migration**:
  - Moved cashier selling components into `features/cashier/components`.
  - Moved cash, KHQR, and receipt modals into `features/payments/components`.
  - Updated all affected imports without changing routes, state, payment behavior, or UI flow.
  - Moved the Owner/Manager workspace, sidebar, header, dashboard, metric cards, and revenue chart into `features/management/components`.
  - Moved menu, product, category, and owner CRUD-table components into `features/catalog/components` and normalized the CRUD-table import casing.
  - Moved stall management into `features/stalls/components` and staff list/allocation management into `features/staff/components`.
  - Moved sales report history/analytics and its date-range dialog into `features/reports/components`.
  - Moved login UI/page, auth context, auth hook, and auth storage into `features/auth` while preserving route and session contracts.
  - Moved app routing/protection into `app`, shared page/topbar layout into `shared/layout`, and theme state/toggle into `shared/theme`.
  - Updated `context/architecture.md` with the new frontend boundaries and dependency-direction rules.
- **Improved category product management in the Owner/Manager catalog**:
  - Added a searchable multi-select workflow for moving existing products into a category.
  - Added Edit and Move actions to products shown inside expanded category rows.
  - Reused the existing product editor and a narrow category-only API update so prices, stall assignments, visibility, and images remain unchanged.
  - Added clear empty, loading, disabled, and server-error states without changing the one-category-per-product data model.
  - Frontend lint and production build pass.
- **Expanded the Owner/Manager revenue dashboard**:
  - Replaced the fixed hourly panel with a reusable Revenue Trends chart supporting Today, This Week, and This Month.
  - Added backend-owned hourly/daily aggregation, paid-order counts, average order value comparisons, and previous-period revenue comparisons.
  - Defined business weeks as Monday-based and retained `REPORT_TIMEZONE_OFFSET` conversion for all buckets and date windows.
  - Kept extra reporting queries opt-in through `include_trends=true` so the Sales Reports ledger does not perform unnecessary dashboard aggregation work.
  - Updated Swagger, API endpoint documentation, raw SQL examples, and architecture notes.
  - Padded the weekly trend to a stable Monday-Sunday axis without including future days in totals or comparisons.
  - Added a Custom calendar range using the existing report dialog, with hourly grouping for one day, daily grouping through 31 days, and seven-day grouping for longer ranges.
- **Made cashier-to-stall assignment touch-friendly**:
  - Added a responsive Manage Staff dialog with searchable per-cashier Assign, Move here, and Remove actions.
  - Reused the existing protected assignment endpoints and transfer confirmation so backend RBAC remains authoritative.
  - Hid drag-only employee pool and drop-zone affordances below desktop widths while retaining drag-and-drop as an optional desktop shortcut.
  - Added per-cashier loading, inline errors, empty states, and immediate roster refresh after successful changes.
  - Frontend lint and production build pass.
- **Compacted the Cashier Quick Sale menu on mobile**:
  - Added a compact list view with small product thumbnails, category labels, prices, and touch-friendly add/quantity controls.
  - Kept an optional two-column grid view and persisted the cashier's preferred mobile layout locally.
  - Made mobile search and category controls sticky while keeping the existing desktop catalog layout unchanged.
  - Preserved the Quick Sale scroll position when switching between Quick Sale and My Orders.
  - Frontend lint, production build, and 390px mobile visual checks pass.
- **Fixed mobile Quick Sale sticky-control layering**:
  - Made the sticky search/category surface opaque and moved mobile top spacing outside the scroll boundary so products are fully hidden while scrolling underneath it.
  - Isolated product-card stacking contexts so card controls cannot paint above the sticky controls.
  - Frontend lint, production build, and a scrolled 390px mobile visual check pass.
- **Restored Transaction Ledger search after server-side pagination**:
  - Added backend-scoped ledger search across order ID/reference, cashier, stall, payment method, and status before pagination is calculated.
  - Debounced the Owner/Manager search input and reset ledger pagination when the query changes.
  - Updated Swagger and API endpoint documentation for the `search` report parameter.
- **Fixed Cambodia-local Today report boundaries in raw SQL aggregations**:
  - Traced an inconsistency where Sequelize ledger queries included current-day orders but raw summary/trend queries shifted UTC boundary `Date` objects forward by seven hours.
  - Standardized raw report replacements as explicit UTC SQL timestamps while preserving `REPORT_TIMEZONE_OFFSET=+07:00` for local date selection and chart buckets.
  - Verified Today and the equivalent one-day custom range both return 15 orders, including 14 paid orders and non-zero hourly revenue; the weekly trend still returns seven points.
- **Made management dashboard and Sales Reports update in real time**:
  - Reused the existing authenticated management Socket.IO connection instead of opening another socket per report component.
  - Added debounced report refetches for order and kitchen-ticket events while retaining 30-second polling as a missed-event fallback.
- **Prepared the backend final-presentation guide**:
  - Traced authentication, RBAC, tenant/stall scoping, order transactions, cash/KHQR payments, Socket.IO events, Telegram tickets, and SQL reporting against the executable code.
  - Added spoken presentation scripts, workflow sequences, examiner Q&A, demo narration, and a one-page cheat sheet in `docs/

## Next Up

- Post-Phase 6 Operations & Security Hardening.
  - Add payment monitoring and operational alerting for failed Bakong or Telegram operations.
  - Keep cook authorization Telegram-only, and strengthen the Telegram cook identity model before production.
  - Decide whether failed Telegram dispatches need an automatic retry worker or if manual retry is enough for the final demo.

- Phase 7C Demo Stabilization & Polish.
  - Manually test the Owner/Manager report filters against seeded and real orders.
  - Run the final end-to-end demo script with cash, Telegram, receipt, and retry flows.
  - Prepare presentation screenshots and a concise known-risks list for the final defense.

- Future Payment Provider:
  - Confirm an approved merchant QR provider and suitable transaction-status contract.
  - Keep KHQR disabled until provider credentials, request limits, reconciliation, and production support are formally suitable for POS use.
  - Reuse backend-owned totals and payment-state rules when implementing the replacement.

- Future SaaS / Multi-Customer Platform Administration:
  - `platform_admin` now exists as a temporary API-only bootstrap role for creating business Owner accounts.
  - Keep `platform_admin` outside customer business roles (`owner`, `manager`, `cashier`).
  - Build a real platform console only when the system supports subscriptions/licenses, owner recovery, and audited support access.

## Open Questions

- Which approved merchant payment provider and transaction-confirmation contract should replace the suspended Open API polling flow?
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
| 9 | **Customer RBAC: Owner / Manager / Cashier** | Separates full business control from day-to-day operations. Each customer business has one Owner; extra supervisors should be Managers; Cashier remains stall-scoped to POS sales. |
| 10 | **platform_admin is separate from customer roles** | TouB POS needs a developer/operator bootstrap role to create business Owners. It must stay outside customer RBAC so platform support access does not blur with Owner, Manager, or Cashier permissions. |
| 11 | **KHQR Individual before Merchant KHQR** | Final-project scope does not have official MerchantID and AcquiringBank credentials. Individual KHQR can use owner/stall Bakong account ID and is easier to demo while keeping backend-owned payment status. |
| 12 | **Suspend KHQR behind explicit feature flags** | The available Bakong Open API polling allowance is not suitable for normal POS polling volume. Cash remains active while the team evaluates an approved merchant provider; KHQR code and historical data are retained to avoid destructive rollback. |

---

## Tech Debt

Intentional shortcuts taken during development that must be resolved before production.

| # | Item | Location | Priority |
|---|------|----------|----------|
| 1 | **Cashier PIN backend login missing** | `LoginPage.jsx` / backend auth routes | ✅ Resolved — integrated via `/api/auth/pin` |
| 2 | **Frontend hooks use `localStorage` mock** | `useProducts`, `useOrders`, `useUsers` | ✅ Resolved — fully integrated with backend endpoints |
| 3 | **No input sanitization on order modifiers** | `order_items.notes` | 🟡 Medium — add max-length enforcement and strip dangerous characters before DB write |
| 4 | **No auth endpoint rate limiting** | `POST /api/auth/login` / `POST /api/auth/pin` | ✅ Resolved — added `express-rate-limit` |
| 5 | **Seed owner password is a placeholder hash** | `docs/database/schema.sql` | 🔴 High — generate real bcrypt hash and store securely before any live deployment |
| 6 | **KHQR background checker is process-local** | `startup/khqr-background-checker.js` | Deferred — KHQR is disabled. Reassess worker/queue design as part of any approved replacement provider implementation. |

