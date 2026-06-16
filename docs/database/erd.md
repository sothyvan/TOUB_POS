# Entity Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        varchar username
        varchar password
        varchar pin
        enum role
        boolean is_active
        datetime created_at
    }

    stalls {
        int id PK
        varchar name
        varchar device_token
        bigint telegram_chat_id
        datetime created_at
    }

    stall_staff {
        int id PK
        int stall_id FK
        int user_id FK
    }

    categories {
        int id PK
        int stall_id FK
        varchar name
        enum tone
        datetime created_at
    }

    products {
        int id PK
        int stall_id FK
        int category_id FK
        varchar name
        decimal price_usd
        int price_khr
        varchar image_url
        boolean is_visible
        datetime created_at
    }

    orders {
        int id PK
        int stall_id FK
        int cashier_id FK
        enum payment_method
        enum status
        decimal subtotal_usd
        decimal service_fee
        decimal tax
        decimal total_usd
        text qr_payload
        enum kitchen_status
        bigint telegram_msg_id
        datetime created_at
        datetime completed_at
    }

    order_items {
        int id PK
        int order_id FK
        int product_id FK
        varchar name
        decimal price_usd
        int price_khr
        int quantity
        varchar notes
    }

    telegram_sessions {
        int id PK
        int stall_id FK
        bigint telegram_user_id
        varchar name
    }

    users         ||--o{ stall_staff       : "assigned to"
    stalls        ||--o{ stall_staff       : "has staff"
    stalls        ||--o{ categories        : "owns"
    stalls        ||--o{ products          : "scopes"
    stalls        ||--o{ orders            : "processes"
    stalls        ||--o{ telegram_sessions : "authorizes cooks"
    categories    ||--o{ products          : "groups"
    users         ||--o{ orders            : "cashier places"
    orders        ||--|{ order_items       : "contains"
    products      ||--o{ order_items       : "referenced by"
```

## Notes

- `order_items.name`, `price_usd`, `price_khr` are **snapshots** — frozen at time of sale. Survives product edits or deletions.
- `order_items.notes` stores free-text modifiers ("no ice", "extra spicy") per line item.
- `orders.kitchen_status` tracks Telegram cook acknowledgement independently from payment `status`.
- `orders.telegram_msg_id` stores the sent message ID so the bot can `editMessage` in-place when cook taps "Done".
- `stalls.device_token` is the permanent terminal registration key stored in browser `localStorage`.
- `products.stall_id = NULL` means a global/shared item visible to all stalls.
- `categories.stall_id = NULL` means a shared category across stalls.
