# TouB POS UI Redesign Audit

## 1. Executive Summary

TouB POS already has a working frontend with the right product structure: a cashier-first POS screen, Owner/Manager management portal, backend-owned orders, KHQR payment flow, Telegram ticket status, and sales reporting. The current UI is demo-capable, but it looks like several design passes were layered on top of each other over time.

The main redesign direction should be **not a full rewrite**. The best path is to strengthen the existing design system, replace one-off styling with shared components, and improve the high-frequency POS workflows first. For a POS system, the UI should feel fast, predictable, touch-friendly, and calm under pressure.

Important codebase note: the current frontend is **React + Vite**, not Next.js. Routing is handled with `react-router-dom`.

## 2. Top UI Problems

1. **Inconsistent styling patterns across screens**
   - Many components mix Tailwind tokens, hard-coded hex colors, inline `style={{ ... }}`, arbitrary radii, and custom shadows.
   - Examples appear heavily in `OwnerSidebar.jsx`, `OwnerHeader.jsx`, `MenuCatalog.jsx`, `StallOwner.jsx`, `StaffList.jsx`, and `OrderHistory.jsx`.
   - Priority: High.

2. **Too many native `alert()` / `confirm()` calls**
   - Several user-facing validation and error messages still use browser dialogs.
   - This feels less professional and interrupts POS speed.
   - Replace with inline errors, toast/alert banners, and `ConfirmDialog`.
   - Priority: High.

3. **Large overloaded components**
   - `OrderHistory.jsx`, `MenuCatalog.jsx`, `StallOwner.jsx`, `CashierScreen.jsx`, and `LoginScreen.jsx` are doing too much UI work in one file.
   - This makes visual consistency harder and increases the risk of layout bugs.
   - Priority: High.

4. **Tables are not consistently responsive**
   - Several tables use flex-row layouts with fixed widths.
   - On tablet/mobile, these can become cramped or require awkward scrolling.
   - Management tables should become responsive cards on smaller screens.
   - Priority: High.

5. **Shared UI components exist but are underused**
   - Good primitives already exist: `ModalShell`, `ConfirmDialog`, `FormInput`, `FormSelect`, `StatusBadge`, `TabPills`, `Icon`, and `TotalsBreakdown`.
   - But many pages still define private buttons, modals, switches, cards, and table rows.
   - Priority: Medium/High.

6. **Design tokens need cleanup**
   - `index.css` defines several brand colors, including green/brown legacy tokens and blue action tokens.
   - The project context says TouB POS should follow a single-blue architecture, but some screens still use warm sand/yellow and one-off colors.
   - Priority: Medium.

7. **Loading, error, and empty states are uneven**
   - Some screens have good empty states.
   - Others show plain text, native alerts, or small inline error labels.
   - A POS demo needs clear recovery states.
   - Priority: Medium.

8. **Some labels still feel technical or temporary**
   - Examples: "Backend-owned Individual KHQR order", "TODO", "Shift allocation is not database-backed yet".
   - These are useful for developers but should be softened or hidden in demo-facing UI.
   - Priority: Medium.

## 3. Design System Recommendation

### Colors

Use a tighter TouB POS palette:

- Primary action: `#003EC7` / `bg-brand-action`
- Primary hover: slightly darker blue, e.g. `#0034A6`
- Page background: `#F8FAFC` or `bg-gray-50`
- Surface: `#FFFFFF`
- Border: `#E5E7EB`
- Muted background: `#F3F4F6`
- Primary text: `#111827`
- Secondary text: `#6B7280`
- Muted text: `#9CA3AF`
- Success: `#157811`
- Danger: `#C70000`
- Warning: amber only for payment/kitchen attention states
- KHQR: use danger red only where it matches KHQR branding or risk state

Recommendation: keep category tone colors for product/category labels, but avoid using random decorative colors for core layout.

### Typography

- Font: Inter everywhere.
- Page titles: `text-lg` to `text-xl`, `font-bold` or `font-extrabold`.
- Section titles: `text-sm` to `text-base`, `font-bold`.
- Table headers: `text-xs`, uppercase, muted.
- Buttons: `text-sm`, `font-bold`.
- Avoid inline `fontFamily`.

### Spacing

Use the existing 8px grid:

- Page padding: `p-4`, `p-6`, or responsive `p-[clamp(...)]`.
- Card padding: `p-4` or `p-5`.
- Form gap: `gap-4`.
- Dense table row padding: `py-3 px-4`.
- Touch buttons: minimum height `44px`.

### Radius

Standardize:

- Buttons/inputs: `rounded-lg` or `rounded-xl`
- Cards/panels: `rounded-2xl`
- Modals: `rounded-2xl` or `rounded-3xl`
- Avoid excessive mixed values like `rounded-[9px]`, `rounded-[10px]`, `rounded-4xl` unless needed.

### Buttons

Create or improve a shared `Button` component:

- Variants: `primary`, `secondary`, `danger`, `success`, `ghost`
- Sizes: `sm`, `md`, `lg`, `icon`
- States: loading, disabled, active scale
- Icons: support left/right icon

This would replace many repeated button class strings.

### Form Controls

Improve `FormInput`, `FormSelect`, and `FormCheckbox`:

- Add `error`, `helperText`, `requiredLabel`, and `disabled` styling.
- Use the same height/radius across Login, Owner forms, product editor, and cash modal.
- Avoid special-case inline styles.

### Tables

Create a reusable responsive table/list pattern:

- Desktop: table-like rows with columns.
- Tablet/mobile: card rows with label/value pairs.
- Built-in empty/loading/error states.
- Built-in row actions area.

Use this for staff, reports, product list, categories, and order history.

### Modals

Improve `ModalShell` and `ConfirmDialog`:

- Add close button support.
- Add size variants: `sm`, `md`, `lg`, `full`.
- Add footer/action slot.
- Add keyboard escape handling later if time allows.
- Keep destructive confirmations typed where needed.

### Badges/Status Indicators

Expand `StatusBadge` into a more general `Badge`:

- Variants: `success`, `warning`, `danger`, `info`, `neutral`
- Use for order status, payment method, kitchen status, user status, product visibility.

## 4. Page-by-Page UI Review

### Login Page

Current issue:
- The login flow is functional and nicely separated into management, cashier profile selection, device registration, and PIN pad.
- It still uses a native `confirm()` for deregistering a terminal.
- Development credentials appear in a floating pill, which is fine in dev but visually busy.
- Some labels are slightly inconsistent: "Login" vs "Log in", "ToubPOS" vs "Toub POS".

Recommended improvement:
- Replace native deregister `confirm()` with `ConfirmDialog`.
- Make the login cards use the same button/input primitives as the rest of the app.
- Keep cashier PIN pad large and touch-friendly.
- Move dev credentials into a cleaner collapsible dev-only panel.

Risk/priority:
- Priority: Medium/High.
- Risk: Low. Mostly visual and UX safety cleanup.

### Cashier Page

Current issue:
- The main workflow is strong: product grid, cart panel, cash/KHQR checkout, receipt, and My Orders.
- The screen is dense, which is good for POS, but some status/error messages still rely on `alert()`.
- Product browsing and cart are touch-friendly, but small laptop/tablet layouts need visual testing because the cart becomes a drawer at `1100px`.
- Product grid cards could be more compact for high item counts.

Recommended improvement:
- Replace checkout validation alerts with inline banner/toast messages.
- Keep the cart visible on large screens and make drawer behavior smoother on tablet.
- Add clearer "cart has unsaved items" feedback before payment buttons.
- Make product cards use consistent image fallback, price, and selected quantity styling.
- Add skeleton/empty states when products are loading or unavailable.

Risk/priority:
- Priority: High.
- Risk: Medium because cashier flow is the core POS path.

### KHQR Payment Modal

Current issue:
- The KHQR modal now includes order details, QR payload support, expiry, status, reference, and MD5.
- It has a strong visual poster style, but some developer wording appears in the UI.
- The modal depends on an external QR image service for rendering the QR image.
- The close behavior is safe, but the visual hierarchy could be clearer for a cashier in a rush.

Recommended improvement:
- Change "Backend-owned Individual KHQR order" to a cashier-friendly line like "Waiting for customer payment".
- Make status the most prominent element after the QR.
- Keep technical fields such as MD5 smaller or behind "Payment details".
- Ensure expired QR and paid QR states look very different.
- Add a consistent action footer: `Close QR`, `View order`, maybe `Create new KHQR` only if backend flow supports it later.

Risk/priority:
- Priority: High.
- Risk: Medium because payment confidence is critical.

### Owner Dashboard

Current issue:
- Dashboard is now cleaner after removing fake prep-time/recent-events/quick-task blocks.
- Metrics are simple and based on order data.
- Recharts is used for the revenue chart.
- Dashboard still feels visually separate from management tables because cards/charts use one style and other screens use another.

Recommended improvement:
- Standardize metric cards with shared `MetricCard`.
- Make the chart card responsive and readable on tablet.
- Add clear empty state when there are no orders yet.
- Consider using backend report data later so dashboard and Sales Reports match exactly.

Risk/priority:
- Priority: Medium.
- Risk: Low.

### Product Management

Current issue:
- `MenuCatalog.jsx` is large and contains product list, filters, image upload, editor panel, private toggle component, and categories tab routing.
- Product list has good features, including filters and images, but the UI uses many inline styles and hard-coded colors.
- Mobile cards exist, but the desktop/list and mobile/card experiences are implemented inside one large component.

Recommended improvement:
- Split into smaller components:
  - `ProductList`
  - `ProductFilters`
  - `ProductEditorPanel`
  - `ProductImageUpload`
  - `ProductAssignmentSelector`
- Replace private `Toggle` with shared switch component.
- Use shared `Button`, `FormInput`, `FormSelect`, `Badge`, and responsive table/list.
- Make loading/error states consistent with other management pages.

Risk/priority:
- Priority: High.
- Risk: Medium because product management has many connected form behaviors.

### Category Management

Current issue:
- Category management already uses `OwnerCRUDTable`, `FormInput`, `FormSelect`, `FormActions`, and `StatusBadge`.
- It is more reusable than some other screens.
- Expandable category rows are useful, but nested product cards may become visually heavy.

Recommended improvement:
- Keep the current structure but update `OwnerCRUDTable` styling and responsive behavior.
- Use the future shared `Badge` for tone/status.
- Improve empty state when categories exist but no products are assigned.

Risk/priority:
- Priority: Medium.
- Risk: Low.

### Stall Management

Current issue:
- Stall management is functional and includes assignment/transfer flows.
- The screen uses drag/drop, click assignment, staff pool, roster cards, and transfer confirmation.
- However, it contains a private `AddStallModal`, `PoolPill`, `RosterCard`, and `DropZone` with many inline styles.
- Error handling still uses `alert()`.
- Drag/drop may be less discoverable on mobile/tablet.

Recommended improvement:
- Replace private add modal with shared `ModalShell` or `OwnerFormModal`.
- Add explicit "Assign" buttons for touch users, not only drag/drop.
- Replace assignment errors with inline alert/toast.
- Make the three-column layout collapse into a guided vertical flow on smaller screens:
  1. Choose stall
  2. See assigned staff
  3. Add available cashier

Risk/priority:
- Priority: High.
- Risk: Medium/High because stall assignment is important and drag/drop can be fragile.

### Staff/User Management

Current issue:
- Staff list includes stats, search, role-aware form fields, user status, assigned stall, and actions.
- It still defines its own modal and stat cards.
- Table rows use fixed widths and inline styles.
- Native `alert()` is used by `useUsers` for validation and backend errors.

Recommended improvement:
- Replace private `UserModal` with `OwnerFormModal` or improved shared modal.
- Move stat cards to reusable `MetricCard` or `SummaryCard`.
- Convert table to shared responsive table/card component.
- Replace user hook `alert()` calls with returned error state or toast.
- Keep credential logic unchanged; this is UI-only.

Risk/priority:
- Priority: High.
- Risk: Medium because user management includes RBAC-sensitive actions.

### Staff Allocation

Current issue:
- This tab is intentionally paused and shows "TODO" / "not database-backed yet".
- It is honest for developers, but it may look unfinished during final demo.

Recommended improvement:
- Rename it to "Shift Scheduling Coming Soon" or hide it until the backend exists.
- Keep staff-to-stall assignment in Stall Management as the active feature.
- If shown, use a polished empty/future-state card.

Risk/priority:
- Priority: Medium.
- Risk: Low.

### Order History / Sales Reports

Current issue:
- The report screen has strong functionality: operations watch, analytics, backend report loading, filters, CSV export, receipt viewing, and Telegram retry.
- `OrderHistory.jsx` is very large and uses many custom status configs and flex-table layouts.
- On smaller screens, transaction ledger columns may become cramped.
- There are multiple status badge implementations across the app.

Recommended improvement:
- Split into:
  - `OperationsWatch`
  - `SalesReportFilters`
  - `SalesKpiCards`
  - `CashierSalesMatrix`
  - `TransactionLedger`
  - `KitchenStatusBadge`
- Make transaction ledger responsive: desktop table, mobile order cards.
- Standardize all status colors through shared badge variants.
- Keep backend report endpoint as the source of truth.

Risk/priority:
- Priority: High.
- Risk: Medium because reports are important for Owner/Manager demo.

### Receipt Modal

Current issue:
- Receipt modal is clean and useful.
- It uses shared `ModalShell` and `TotalsBreakdown`.
- It may show empty item lists when opened from report rows that do not include full order items.

Recommended improvement:
- Add an empty item fallback like "Open full order details to view items" if detailed order items are missing.
- Add optional print/download later only if needed.
- Make status/payment badges use shared `Badge`.

Risk/priority:
- Priority: Medium.
- Risk: Low.

### Topbar / Page Shell

Current issue:
- Cashier topbar is compact and includes profile/logout/cart access.
- Owner portal uses a separate header/sidebar instead of the shared topbar.
- This is okay, but visual language should still match.

Recommended improvement:
- Keep separate cashier and owner headers, but align colors, radius, buttons, avatar, and logout confirmation patterns.
- Make `PageShell` support common loading/error overlays later if needed.

Risk/priority:
- Priority: Medium.
- Risk: Low.

## 5. Component Refactoring Plan

Recommended shared components to create or improve:

1. `Button`
   - Variants: primary, secondary, danger, success, ghost.
   - Sizes: sm, md, lg, icon.
   - Handles loading and disabled states.

2. `Alert`
   - Variants: info, success, warning, danger.
   - Replaces many `alert()` calls and inline error paragraphs.

3. `ToastProvider` or simple `useToast`
   - Optional but useful for save/delete errors and success feedback.
   - If time is short, use inline `Alert` first.

4. `Badge`
   - More general than `StatusBadge`.
   - Supports order/payment/kitchen/user/product states.

5. `Switch`
   - Replaces private toggle in product editor.

6. `ResponsiveDataView`
   - Desktop table, mobile card layout.
   - Use for staff, order ledger, product list, and category/product rows.

7. `PageSection`
   - Standard card/panel wrapper with title, subtitle, actions, loading/error/empty slot.

8. `EmptyState`
   - Icon, title, message, optional action.

9. `LoadingState`
   - Spinner or skeleton blocks.

10. `ModalShell` / `ConfirmDialog` improvements
   - Add close button slot, footer slot, size variants, and consistent panel classes.

11. `ProductTile`
   - POS-optimized product card for cashier screen.
   - Keeps image, name, category, price, selected quantity, and add/adjust actions consistent.

12. `CartDrawer`
   - Could wrap `OrderPanel` behavior for desktop/sidebar/mobile drawer consistency.

## 6. Implementation Plan

### Phase UI-1: Design System Cleanup

Goal:
- Create a consistent base layer without changing business logic.

Tasks:
- Normalize Tailwind theme tokens in `frontend/src/index.css`.
- Create shared `Button`, `Alert`, `Badge`, `Switch`, `EmptyState`, and `LoadingState`.
- Improve `ModalShell`, `ConfirmDialog`, `FormInput`, and `FormSelect`.
- Replace obvious duplicated button/input/status styles in low-risk areas first.
- Remove or reduce inline `fontFamily` and hard-coded color usage where safe.

Suggested files:
- `frontend/src/index.css`
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/Alert.jsx`
- `frontend/src/components/ui/Badge.jsx`
- `frontend/src/components/ui/Switch.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/ui/LoadingState.jsx`
- `frontend/src/components/ui/ModalShell.jsx`
- `frontend/src/components/ui/ConfirmDialog.jsx`
- `frontend/src/components/ui/FormInput.jsx`
- `frontend/src/components/ui/FormSelect.jsx`

Checkpoint:
- Login, cashier, owner portal still render.
- No business behavior changes.
- `npm run lint` and `npm run build` pass.

Implementation status:
- **Completed.** Phase UI-1 added shared `Button`, `Alert`, `Badge`, `Switch`, `EmptyState`, and `LoadingState` primitives.
- `ModalShell`, `ConfirmDialog`, `FormInput`, and `FormSelect` were improved while preserving existing callers.
- `FormActions`, `StatusBadge`, `TabPills`, `OwnerCrudTable`, and the product editor availability switch now use the shared foundation layer where safe.
- Frontend lint and production build passed. The build still reports a large JavaScript bundle warning, which should be handled later through code splitting if needed.

### Phase UI-2: Cashier POS Flow

Goal:
- Make the cashier flow faster, clearer, and more touch-friendly.

Tasks:
- Replace cashier native `alert()` usage with inline alerts or toast.
- Improve product grid spacing and card hierarchy.
- Improve cart drawer behavior on tablet/mobile.
- Polish cash confirmation modal with shared form/button components.
- Polish KHQR modal wording, status hierarchy, expiry state, and details section.
- Add consistent empty/loading/error states for product catalog and My Orders.

Suggested files:
- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/components/ProductCard.jsx`
- `frontend/src/components/OrderPanel.jsx`
- `frontend/src/components/CashConfirmationModal.jsx`
- `frontend/src/components/KhqrPaymentModal.jsx`
- `frontend/src/components/ReceiptModal.jsx`
- `frontend/src/hooks/useOrders.js`

Checkpoint:
- Cash order works.
- KHQR confirmation flow still requires the second step.
- Resume QR still works.
- Receipt still opens.
- Cart remains easy to use on desktop/tablet/mobile.

### Phase UI-3: Owner/Manager Screens

Goal:
- Make management screens more consistent, readable, and demo-ready.

Tasks:
- Create responsive table/card layout for management data.
- Split large components into smaller sections.
- Replace native alerts in product/user/stall hooks and screens.
- Improve Product Management editor and image upload layout.
- Improve Stall Management touch usability and empty/error states.
- Improve Staff List table responsiveness and modal consistency.
- Polish Order History into smaller components and shared badges.

Suggested files:
- `frontend/src/components/OwnerWorkspace.jsx`
- `frontend/src/components/OwnerSidebar.jsx`
- `frontend/src/components/OwnerHeader.jsx`
- `frontend/src/components/OwnerDashboard.jsx`
- `frontend/src/components/MenuCatalog.jsx`
- `frontend/src/components/CategoryOwner.jsx`
- `frontend/src/components/StallOwner.jsx`
- `frontend/src/components/UserOwner.jsx`
- `frontend/src/components/staff/StaffList.jsx`
- `frontend/src/components/staff/StaffAllocation.jsx`
- `frontend/src/components/OrderHistory.jsx`
- `frontend/src/hooks/useProducts.js`
- `frontend/src/hooks/useUsers.js`

Checkpoint:
- Owner can manage products/categories/stalls/staff.
- Manager sees only allowed management actions.
- Sales reports still use backend report data.
- Destructive delete still requires typing `DELETE`.

### Phase UI-4: Responsive & Polish

Goal:
- Final pass for tablet/mobile/laptop demo readiness.

Tasks:
- Test viewport widths around 390px, 768px, 1024px, 1280px, and desktop.
- Fix overflow/clipping in tables, modals, product grids, cart drawer, and owner sidebar.
- Add consistent focus states and keyboard-accessible controls.
- Ensure empty/loading/error states are polished.
- Review text labels for demo friendliness.
- Consider route-level code splitting if bundle size warning remains important.

Checkpoint:
- Login, cashier, owner dashboard, product management, stall management, staff management, and reports are visually stable at target sizes.
- No page requires browser refresh to show normal updates.
- `npm run lint` and `npm run build` pass.

## 7. Verification Checklist

Commands:

```bash
cd frontend
npm run lint
npm run build
```

Manual visual checks:

- Login page:
  - Management login.
  - Device registration.
  - Cashier profile selection.
  - PIN pad on mobile width.

- Cashier page:
  - Product grid loads.
  - Category filter works.
  - Search works.
  - Add/remove cart items.
  - Cart drawer works on tablet/mobile.
  - Cash payment confirmation calculates change.
  - KHQR pre-confirmation appears.
  - KHQR modal shows pending/paid/expired states.
  - My Orders shows receipt, Resume QR, and kitchen retry states.

- Owner/Manager pages:
  - Dashboard cards and chart.
  - Product create/edit/delete.
  - Category create/edit/delete.
  - Stall create and staff assignment.
  - Staff create/edit/disable/delete.
  - Order History filters, CSV export, receipt view, kitchen retry.

- Responsive checks:
  - 390px mobile.
  - 768px tablet.
  - 1024px laptop/tablet landscape.
  - 1280px desktop.
  - Large desktop.

- Safety checks:
  - No broken auth redirects.
  - No removed RBAC restrictions.
  - No backend logic changes.
  - No localStorage source-of-truth regression for backend-owned data.

## 8. Files Likely To Change

Likely shared UI files:

- `frontend/src/index.css`
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/Alert.jsx`
- `frontend/src/components/ui/Badge.jsx`
- `frontend/src/components/ui/Switch.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/ui/LoadingState.jsx`
- `frontend/src/components/ui/ModalShell.jsx`
- `frontend/src/components/ui/ConfirmDialog.jsx`
- `frontend/src/components/ui/FormInput.jsx`
- `frontend/src/components/ui/FormSelect.jsx`
- `frontend/src/components/ui/StatusBadge.jsx`
- `frontend/src/components/ui/TabPills.jsx`
- `frontend/src/components/common/OwnerCrudTable.jsx`

Likely cashier files:

- `frontend/src/pages/CashierPage.jsx`
- `frontend/src/components/CashierScreen.jsx`
- `frontend/src/components/ProductCard.jsx`
- `frontend/src/components/OrderPanel.jsx`
- `frontend/src/components/CartItem.jsx`
- `frontend/src/components/QuantityInput.jsx`
- `frontend/src/components/CashConfirmationModal.jsx`
- `frontend/src/components/KhqrPaymentModal.jsx`
- `frontend/src/components/ReceiptModal.jsx`
- `frontend/src/hooks/useOrders.js`

Likely Owner/Manager files:

- `frontend/src/pages/OwnerPortalPage.jsx`
- `frontend/src/components/OwnerWorkspace.jsx`
- `frontend/src/components/OwnerSidebar.jsx`
- `frontend/src/components/OwnerHeader.jsx`
- `frontend/src/components/OwnerDashboard.jsx`
- `frontend/src/components/MenuCatalog.jsx`
- `frontend/src/components/CategoryOwner.jsx`
- `frontend/src/components/StallOwner.jsx`
- `frontend/src/components/UserOwner.jsx`
- `frontend/src/components/staff/StaffList.jsx`
- `frontend/src/components/staff/StaffAllocation.jsx`
- `frontend/src/components/OrderHistory.jsx`
- `frontend/src/hooks/useProducts.js`
- `frontend/src/hooks/useUsers.js`

Likely utility files:

- `frontend/src/utils/toneClasses.js`
- `frontend/src/utils/format.js`

Recommended next decision:

Phase UI-1 is complete. The next recommended UI phase is **Phase UI-2: Cashier POS Flow**, focused on cashier alerts, product grid polish, cart/payment modal clarity, and better loading/error/empty states.
