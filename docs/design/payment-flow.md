# Payment Flow

## KHQR (QR Code) Payment

```mermaid
sequenceDiagram
    participant C as Cashier (Browser)
    participant API as Backend API
    participant DB as MySQL
    participant WH as Banking Webhook
    participant WS as WebSocket / SSE

    C->>API: POST /api/orders { items, payment_method: "khqr" }
    API->>DB: INSERT order (status = "pending")
    API->>API: Generate KHQR payload (amount, merchant ID)
    API-->>C: { order_id, qr_payload, status: "pending" }

    C->>C: Display QR modal to customer

    Note over WH: Customer scans & pays via banking app
    WH->>API: POST /webhook/payment { transaction_ref, amount }
    API->>DB: UPDATE orders SET status = "completed", completed_at = NOW()
    API->>WS: Emit payment_confirmed { order_id } to cashier session
    WS-->>C: payment_confirmed event
    C->>C: Close QR modal, show receipt
```

---

## Cash Payment

```mermaid
sequenceDiagram
    participant C as Cashier (Browser)
    participant API as Backend API
    participant DB as MySQL

    C->>C: Cashier confirms cash received (dialog)
    C->>API: POST /api/orders { items, payment_method: "cash" }
    API->>DB: INSERT order (status = "completed", completed_at = NOW())
    API-->>C: { order_id, status: "completed" }
    C->>C: Show receipt modal
```

---

## Order Status Lifecycle

```
pending ──▶ completed
        └─▶ cancelled
```

| Status      | Trigger                                          |
|-------------|--------------------------------------------------|
| `pending`   | Order created, awaiting KHQR payment             |
| `completed` | Webhook confirms payment OR cashier marks cash paid |
| `cancelled` | Cashier manually cancels before payment          |
