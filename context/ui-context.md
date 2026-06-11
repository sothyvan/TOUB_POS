# UI Context

## Theme

- **Target Environments:** Smartphone and tablet form factors deployed in high-noise, crowded, and fast-paced merchant environments.
- **UI Architecture:** Adaptive layouts utilizing high-contrast visual cues and oversized touch targets.
- **State Normalization:** All user actions are bounded by role privileges (`manager` vs `cashier`) encoded within the central JWT session.

## Colors

| Role            | Value / Tailwind Class |
| --------------- | ---------------------- |
| Page background | `bg-gray-50`           |
| Surface         | `bg-white`             |
| Primary text    | `text-gray-900`        |
| Muted text      | `text-gray-500`        |
| Primary accent  | `#003EC7`              |
| Error/Alert     | `#C70000`              |
| Success         | `#157811`              |

## Color System Rules (Single-Blue Architecture)

- The application relies on a single signature blue token: `COLOR_BRAND_BLUE` = `#003EC7`.
- **Primary Surfaces (Headers, Direct Action Buttons):** Must use `COLOR_BRAND_BLUE` at solid 100% opacity.
- **Floating Containers (Cart Drawer):** Must use clean white backgrounds (`bg-white`) layered with an explicit elevated elevation shadow to denote physical depth, reserving blue for key text or action buttons.
- **Overlay States (Modals):** Background tinting should use a dark transparent backdrop or `COLOR_BRAND_BLUE` scaled down to 15% opacity matched with a hardware-accelerated backdrop blur filter.

## Frontend Theme Tokens

The Tailwind v4 theme in `frontend/src/index.css` defines app-specific tokens for the current visual system:

- `brand-action` — primary action blue for checkout, admin tabs, submit buttons, and important totals.
- `state-danger` — destructive/cancel red for KHQR, delete, logout, and clear actions.
- `state-success` — confirmation green for cash and successful payment actions.

## Layout Patterns

- **Cashier View**: Full-viewport with a large central numeric keypad/item grid, and a prominent right-side order summary and checkout button.
- **QR Modal**: Large, centered overlay with backdrop blur. Must feature clear visual states (e.g., "Waiting for payment" in yellow, "Payment Received" in green).

### Global Layout Grids & Sizing Scale

- **Base Grid:** Strict 8px spatial grid system (`8px`, `16px`, `24px`, `32px`, `48px`). All margins, paddings, and structural spacing values must align to this increments.
- **Corner Radii (Rounding):**
  - Interactive UI controls (Buttons, Text Inputs, Selector Pills): `8px` rounded borders.
  - Contextual Sheet Elements & Layout Cards: `12px` rounded borders.
  - Overlay Modals (Success panels, QR code blocks): `16px` rounded borders.
  - User Profiles (Avatar containers): `50%` circular bounding boxes.
