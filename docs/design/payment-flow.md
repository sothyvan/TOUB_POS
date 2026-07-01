# Payment Flow

This document describes the current Phase 4 payment behavior and the planned Phase 5 KHQR behavior.

## Current Cash Payment Flow

Cash payment is backend-owned. The frontend may preview totals while the cashier builds a cart, but the backend calculates the trusted order total from database product prices.

```mermaid
sequenceDiagram
    participant C as Cashier Browser
    participant API as Backend API
    participant DB as MySQL
    participant AUD as Audit Logs

    C->>API: POST /api/orders { items, payment_method: "cash" }
    API->>API: Derive cashier_id from JWT
    API->>DB: Find cashier's assigned stall
    API->>DB: Load products and prices
    API->>API: Validate stall scope, visibility, quantity
    API->>DB: INSERT order status = "pending_payment"
    API->>DB: INSERT order_items with name/price snapshots
    API->>AUD: INSERT order_created
    API-->>C: { order_id, status: "pending_payment", total_usd }

    C->>C: Show cash confirmation dialog
    C->>API: POST /api/orders/:id/confirm-cash
    API->>API: Check actor is creator cashier, owner, or manager
    API->>API: Check payment_method = "cash"
    API->>API: Check order is still pending_payment
    API->>DB: UPDATE orders SET status = "paid", completed_at = NOW()
    API->>AUD: INSERT cash_payment_confirmed
    API-->>C: { order_id, status: "paid", completed_at }
    C->>C: Show paid receipt
```

Important rules:

- The frontend must not send trusted totals, item prices, `cashier_id`, `stall_id`, paid flags, or final status.
- Cash orders start as `pending_payment`.
- Only backend confirmation changes a cash order to `paid`.
- Cash confirmation is allowed for the creating cashier, owner, or manager.
- Order creation and cash confirmation write audit log rows.

---

## Order Status Lifecycle

```text
pending_payment ──▶ paid
        └────────▶ cancelled
```

| Status | Trigger |
|--------|---------|
| `pending_payment` | Backend creates an order and waits for payment confirmation |
| `paid` | Cash is confirmed by an allowed user, or future KHQR webhook verifies payment |
| `cancelled` | Order is cancelled before payment completion |

---

## Planned KHQR Payment Flow

Real KHQR webhook confirmation is planned for Phase 5 and is not implemented yet. The current webhook endpoint is a placeholder and should not be treated as a real payment confirmation path.

Planned target flow:

```mermaid
sequenceDiagram
    participant C as Cashier Browser
    participant API as Backend API
    participant DB as MySQL
    participant WH as Banking Webhook
    participant WS as WebSocket / SSE

    C->>API: POST /api/orders { items, payment_method: "khqr" }
    API->>DB: INSERT order status = "pending_payment"
    API->>API: Generate verified KHQR payload
    API-->>C: { order_id, qr_payload, status: "pending_payment" }

    C->>C: Display QR modal to customer

    Note over WH: Customer scans and pays in banking app
    WH->>API: POST /api/webhook/payment { transaction_ref, amount, merchant_id }
    API->>API: Verify amount, merchant, duplicate events, and order state
    API->>DB: UPDATE orders SET status = "paid", completed_at = NOW()
    API->>WS: Emit payment_confirmed only to the creating cashier session
    WS-->>C: payment_confirmed event
    C->>C: Close QR modal and show paid receipt
```

Phase 5 must add real gateway verification, idempotency, amount matching, and cashier-specific live notifications before KHQR is considered complete.
