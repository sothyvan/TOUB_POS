# UI Context

## Theme

- **Target Environments:** Smartphone and tablet form factors deployed in high-noise, crowded, and fast-paced merchant environments.
- **UI Architecture:** Adaptive layouts utilizing high-contrast visual cues and oversized touch targets.
- **State Normalization:** Customer-facing user actions are bounded by role privileges (`owner`, `manager`, `cashier`) encoded within the central JWT session. The temporary `platform_admin` role is API/bootstrap-only and has no management UI yet.

## Role UI Rules

- Owner sees full management navigation, including user role management, terminal controls, payment settings, reports, menu, stalls, and staff allocation.
- Manager sees operational management navigation, including cashier management, menu, stalls, orders, reports, and staff allocation, but cannot create or promote Owner/Manager users.
- Cashier sees only the cashier terminal workspace and personal shift/order history for the active stall session.

## Colors

TouB POS supports dark and light presentation themes. Dark mode remains the default, and the user's choice is stored in the browser for future visits.

| Role            | Value / Tailwind Class |
| --------------- | ---------------------- |
| Page background | `#080807`              |
| Surface         | `#111110`              |
| Elevated surface| `#171715`              |
| Primary text    | `#F1EFEA`              |
| Muted text      | `#A29D96`              |
| Primary accent  | `#E76F2E`              |
| Error/Alert     | `#E35D5D`              |
| Success         | `#55A982`              |

The light theme uses warm off-white surfaces (`#F3F2EE`, `#FBFAF7`), near-black text (`#1B1917`), warm-gray borders (`#D7D3CC`), and a darker orange action color (`#C9571D`) for accessible contrast.

## Color System Rules (Dual-Theme Dark-Tech Architecture)

- TouB POS uses layered near-black surfaces, warm-gray borders, off-white text, and one restrained orange action accent.
- **Primary Surfaces:** Page, sidebar, header, card, table, and modal surfaces use `ui-bg`, `ui-surface`, and `ui-elevated` tokens rather than isolated hardcoded colors.
- **Direct Actions:** Orange is reserved for the active navigation state, primary submit actions, and important totals. Destructive, success, and payment colors keep their semantic meanings.
- **Elevation:** Prefer thin borders and small tonal shifts over large shadows. Overlays use a dark transparent backdrop with restrained blur.
- **Theme behavior:** Components consume semantic theme tokens rather than fixed foreground/background pairs. The root `data-theme` attribute switches palettes, and scan-critical KHQR content stays white in both themes.

## Frontend Theme Tokens

The Tailwind v4 theme in `frontend/src/index.css` defines app-specific tokens for the current visual system:

- `brand-action` — restrained orange for checkout, active tabs, submit buttons, and important totals.
- `state-danger` — destructive/cancel red for KHQR, delete, logout, and clear actions.
- `state-success` — confirmation green for cash and successful payment actions.

## Layout Patterns

- **Cashier View**: Full-viewport with a large central numeric keypad/item grid, and a prominent right-side order summary and checkout button.
- **QR Modal**: Large, centered overlay with backdrop blur. Must feature clear visual states (e.g., "Waiting for payment" in yellow, "Payment Received" in green).
- **Transient Notifications**: SweetAlert success/error notifications appear as bottom-right toasts and close after 3 seconds. Confirmations and blocking progress dialogs remain centered and require explicit completion.

### Global Layout Grids & Sizing Scale

- **Base Grid:** Strict 8px spatial grid system (`8px`, `16px`, `24px`, `32px`, `48px`). All margins, paddings, and structural spacing values must align to this increments.
- **Corner Radii (Rounding):**
  - Interactive UI controls (Buttons, Text Inputs, Selector Pills): `6px` to `8px` rounded borders.
  - Contextual Sheet Elements & Layout Cards: `8px` rounded borders.
  - Overlay Modals (Success panels, QR code blocks): `8px` rounded borders, except the scan-critical white KHQR card.
  - User Profiles (Avatar containers): `50%` circular bounding boxes.
