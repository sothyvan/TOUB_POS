# Entity Relationship Diagram

This ERD is generated from the active Sequelize models in `backend/src/models/`
and the canonical MySQL schema in `docs/database/schema.sql`.

```mermaid
erDiagram
    users {
        int id PK
        varchar username UK
        varchar password "nullable bcrypt hash for owner/manager"
        varchar pin "nullable bcrypt hash for cashier"
        enum role "owner, manager, cashier"
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    stalls {
        int id PK
        int owner_id FK "nullable"
        varchar name
        varchar location "nullable"
        varchar device_token UK "nullable"
        bigint telegram_chat_id "nullable"
        datetime created_at
        datetime updated_at
    }

    stall_staff {
        int id PK
        int stall_id FK
        int user_id FK
    }

    categories {
        int id PK
        int stall_id FK "nullable shared category"
        varchar name
        enum tone "gold, green, blue, rose"
        datetime created_at
        datetime updated_at
    }

    products {
        int id PK
        int stall_id FK "nullable global product"
        int category_id FK "nullable"
        varchar name
        decimal price_usd
        int price_khr
        varchar image_url "nullable"
        boolean is_visible
        datetime created_at
        datetime updated_at
    }

    orders {
        int id PK
        int stall_id FK
        int cashier_id FK
        enum payment_method "cash, khqr"
        enum status "pending_payment, paid, cancelled"
        decimal subtotal_usd
        decimal total_usd
        text qr_payload "nullable KHQR"
        varchar qr_md5 "nullable KHQR"
        varchar payment_reference UK "nullable KHQR"
        datetime payment_expires_at "nullable KHQR"
        datetime created_at
        datetime updated_at
        datetime completed_at "nullable"
    }

    order_items {
        int id PK
        int order_id FK
        int product_id FK "nullable after product deletion"
        varchar name "snapshot"
        decimal price_usd "snapshot"
        int price_khr "snapshot"
        decimal line_total_usd
        int line_total_khr
        int quantity
        varchar notes "nullable modifiers"
    }

    audit_logs {
        int id PK
        int actor_user_id FK "nullable"
        enum action "order_created, cash_payment_confirmed, khqr_payment_confirmed, order_cancelled"
        int order_id FK "nullable"
        json details "nullable"
        datetime created_at
    }

    telegram_tickets {
        int id PK
        int order_id FK
        bigint telegram_msg_id "nullable"
        bigint telegram_chat_id "nullable"
        enum status "pending, sent, failed, done"
        datetime sent_at "nullable"
        datetime completed_at "nullable"
    }

    users      ||--o{ stalls           : "owns"
    users      ||--o{ stall_staff      : "assigned to"
    stalls     ||--o{ stall_staff      : "has staff"
    stalls     ||--o{ categories       : "scopes"
    stalls     ||--o{ products         : "scopes"
    categories ||--o{ products         : "groups"
    stalls     ||--o{ orders           : "processes"
    users      ||--o{ orders           : "cashier places"
    orders     ||--|{ order_items      : "contains"
    products   ||--o{ order_items      : "referenced by"
    users      ||--o{ audit_logs       : "performs"
    orders     ||--o{ audit_logs       : "records"
    orders     ||--o{ telegram_tickets : "dispatches"
```

## Notes

- `order_items.name`, `price_usd`, `price_khr`, `line_total_usd`, and `line_total_khr` are snapshots frozen at time of sale. They survive product edits or deletion.
- `orders.qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at` are populated for KHQR orders and remain `NULL` for cash orders.
- `orders.payment_reference` is the unique bill number/reference used by the KHQR webhook.
- `users.username` is required and unique for every role.
- `users.password` is used only for Owner/Manager username-password login and is `NULL` for Cashiers.
- `users.pin` is used only for Cashier PIN login and is `NULL` for Owners/Managers.
- `stall_staff` enforces a unique `(stall_id, user_id)` assignment pair.
- `order_items.notes` stores free-text modifiers ("no ice", "extra spicy") per line item.
- `audit_logs` stores sensitive POS actions and links them back to the acting user and related order when available.
- `telegram_tickets.status` tracks the kitchen ticket progress independently from the order payment status.
- `telegram_tickets.telegram_msg_id` stores the Telegram message ID so the bot can edit the existing message when the cook taps "Done".
- `telegram_tickets` enforces a unique `(telegram_chat_id, telegram_msg_id)` pair.
- `stalls.owner_id` identifies the business owner responsible for each stall.
- `stalls.location` stores the physical location of the stall (e.g. AEON Mall, Night Market, University).
- `stalls.device_token` is the permanent terminal registration key stored in browser `localStorage`.
- `products.stall_id = NULL` means a global/shared item visible to all stalls.
- `categories.stall_id = NULL` means a shared category across stalls.
