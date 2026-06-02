# UI Context

## Theme

The design language must be highly legible, high-contrast, and optimized for fast-paced, high-stress environments. UI elements must be large enough for quick tapping on a tablet/mobile device.

## Colors

| Role            | CSS Variable       | Value / Tailwind Class |
| --------------- | ------------------ | ---------------------- |
| Page background | `--bg-base`        | `bg-gray-50`           |
| Surface         | `--bg-surface`     | `bg-white`             |
| Primary text    | `--text-primary`   | `text-gray-900`        |
| Muted text      | `--text-muted`     | `text-gray-500`        |
| Primary accent  | `--accent-primary` | `bg-blue-600`          |
| Error/Alert     | `--state-error`    | `bg-red-500`           |
| Success         | `--state-success`  | `bg-green-500`         |

## Layout Patterns

- **Cashier View**: Full-viewport with a large central numeric keypad/item grid, and a prominent right-side order summary and checkout button.
- **QR Modal**: Large, centered overlay with backdrop blur. Must feature clear visual states (e.g., "Waiting for payment" in yellow, "Payment Received" in green).
