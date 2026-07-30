# Entity Relationship Diagram

This ERD is generated from the active Sequelize models in `backend/src/models/`
and the canonical MySQL schema in `docs/database/schema.sql`.

```mermaid
erDiagram
    users {
        int id PK
        int owner_id FK "NULL for platform_admin/owner; owner for staff"
        varchar username
        varchar password "nullable bcrypt hash for platform_admin/owner/manager"
        varchar pin "nullable bcrypt hash for cashier"
        enum role "platform_admin, owner, manager, cashier"
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    stalls {
        int id PK
        int owner_id FK "nullable"
        varchar name
        varchar location "nullable"
        varchar device_token UK "deprecated migration-only"
        bigint telegram_chat_id "nullable"
        varchar telegram_chat_title "nullable"
        datetime telegram_connected_at "nullable"
        datetime created_at
        datetime updated_at
    }

    stall_devices {
        int id PK
        int stall_id FK
        varchar name
        varchar token_hash UK "SHA-256; never returned"
        boolean is_active
        int registered_by_user_id FK "nullable"
        int last_cashier_id FK "nullable"
        datetime last_seen_at "nullable"
        datetime revoked_at "nullable"
        int revoked_by_user_id FK "nullable"
        datetime created_at
    }

    stall_staff {
        int id PK
        int stall_id FK
        int user_id FK
    }

    telegram_cooks {
        int id PK
        int stall_id FK
        bigint telegram_user_id
        varchar display_name
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    telegram_group_connections {
        int id PK
        int stall_id FK
        int created_by_user_id FK "nullable"
        varchar token_hash UK "SHA-256; raw token never stored"
        datetime expires_at
        datetime consumed_at "nullable"
        bigint connected_chat_id "nullable"
        varchar connected_chat_title "nullable"
        bigint connected_by_telegram_user_id "nullable"
        datetime created_at
    }

    categories {
        int id PK
        int owner_id FK
        varchar name
        enum tone "gold, green, blue, rose"
        datetime created_at
        datetime updated_at
    }

    products {
        int id PK
        int category_id FK
        varchar name
        varchar image_url
        decimal default_price_usd "nullable catalog fallback"
        int default_price_khr "nullable catalog fallback"
        datetime created_at
    }

    stall_products {
        int id PK
        int stall_id FK
        int product_id FK
        decimal price_usd
        int price_khr
        boolean is_visible
    }

    orders {
        int id PK
        int stall_id FK
        int cashier_id FK
        varchar idempotency_key UK "nullable historical orders"
        varchar idempotency_fingerprint "nullable historical orders"
        enum payment_method "cash, khqr"
        enum status "pending_payment, paid, cancelled"
        decimal subtotal_usd
        decimal total_usd
        decimal cash_received_usd "nullable cash"
        decimal change_due_usd "nullable cash"
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
        bigint telegram_msg_id
        bigint telegram_chat_id
        enum status
        datetime sent_at
        datetime completed_at
        bigint completed_by_telegram_user_id
        varchar completed_by_name
    }

    users ||--o{ stalls : "owns"
    users ||--o{ categories : "manages"
    users ||--o{ stall_staff : "assigned to"
    stalls ||--o{ stall_staff : "has staff"
    stalls ||--o{ stall_devices : "registers terminals"
    stalls ||--o{ telegram_cooks : "authorizes kitchen identities"
    stalls ||--o{ telegram_group_connections : "receives connection attempts"
    users ||--o{ telegram_group_connections : "creates setup link"
    users ||--o{ stall_devices : "registers/uses/revokes"
    categories ||--o{ products : "groups"
    stalls ||--o{ stall_products : "sells"
    products ||--o{ stall_products : "available in"
    stalls ||--o{ orders : "processes"
    users ||--o{ orders : "cashier places"
    orders ||--|{ order_items : "contains"
    products ||--o{ order_items : "referenced by"
    orders ||--o{ telegram_tickets : "dispatched to"
    users ||--o{ users : "supervises"
```


## Notes

- `order_items.name`, `price_usd`, `price_khr`, `line_total_usd`, and `line_total_khr` are snapshots frozen at time of sale. They survive product edits or deletion.
- `orders.cash_received_usd` and `orders.change_due_usd` are stored for cash orders after backend confirmation. The frontend may preview change, but the backend calculates the saved value.
- `orders.idempotency_key` is unique per cashier. Exact checkout retries return the original order; reuse with different request data is rejected by comparing `idempotency_fingerprint`.
- `orders.qr_payload`, `qr_md5`, `payment_reference`, and `payment_expires_at` are populated for KHQR orders and remain `NULL` for cash orders.
- `orders.payment_reference` is the unique bill number/reference used by the KHQR webhook.
- `users.username` is required and unique for every role.
- `users.password` is used only for Platform Admin, Owner, and Manager username-password login and is `NULL` for Cashiers.
- `users.pin` is used only for Cashier PIN login and is `NULL` for Platform Admins, Owners, and Managers.
- `stall_staff` enforces a unique `(stall_id, user_id)` assignment pair.
- `users.owner_id` is `NULL` for `platform_admin` and business `owner` accounts. It links managers and cashiers to the specific business owner who manages them.
- `order_items.notes` stores free-text modifiers ("no ice", "extra spicy") per line item.
- `audit_logs` stores sensitive POS actions and links them back to the acting user and related order when available.
- `telegram_tickets.status` tracks the kitchen ticket progress independently from the order payment status.
- `telegram_tickets.telegram_msg_id` stores the Telegram message ID so the bot can edit the existing message when the cook taps "Done".
- `telegram_tickets` enforces a unique `(telegram_chat_id, telegram_msg_id)` pair.
- `telegram_cooks` is a stall-scoped allowlist of Telegram identities. Cooks are not web users and never receive JWT credentials.
- `telegram_group_connections` stores only SHA-256 hashes of short-lived, one-time Telegram `startgroup` setup tokens. Consuming a valid token binds the selected Telegram group to its stall.
- `telegram_tickets.completed_by_telegram_user_id` and `completed_by_name` preserve who completed a kitchen ticket.
- `stalls.owner_id` identifies the business owner responsible for each stall.
- `stalls.location` stores the physical location of the stall (e.g. AEON Mall, Night Market, University).
- `stall_devices` supports multiple independently revocable terminals per stall. The raw token is stored only in the registered browser; MySQL stores `token_hash`.
- `stall_devices.last_cashier_id` identifies the most recent cashier who successfully unlocked that device. It is display metadata, not ownership of the terminal.
- `stalls.device_token` remains temporarily nullable only as a startup migration source for terminals registered before the multi-device model. Active authentication does not read it.
- `categories.owner_id` links each category to the business owner who manages it. Category names are unique per owner.
- `products` stores shared catalog metadata, its owner-scoped category, and default USD/KHR prices so unassigned products retain their last configured price.
- Per-stall price and visibility live in `stall_products`.
- A product is visible to a stall only when a matching `stall_products` row exists with `is_visible = TRUE`.
