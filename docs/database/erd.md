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
        int owner_id FK
        varchar name
        varchar location
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
        decimal total_usd
        text qr_payload
        datetime created_at
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

    telegram_tickets {
        int           id               PK
        int           order_id         FK  
        bigint        telegram_msg_id      
        bigint        telegram_chat_id     
        enum          status               
        datetime      sent_at              
        datetime      completed_at         
    }

    users         ||--o{ stalls            : "owns"
    users         ||--o{ stall_staff       : "assigned to"
    stalls        ||--o{ stall_staff       : "has staff"
    stalls        ||--o{ categories        : "owns"
    stalls        ||--o{ products          : "scopes"
    stalls        ||--o{ orders            : "processes"
    categories    ||--o{ products          : "groups"
    users         ||--o{ orders            : "cashier places"
    orders        ||--|{ order_items       : "contains"
    products      ||--o{ order_items       : "referenced by"
    orders        ||--o{ telegram_tickets  : "dispatched to"
```

## Notes

- `order_items.name`, `price_usd`, `price_khr` are **snapshots** — frozen at time of sale. Survives product edits or deletions.
- `order_items.notes` stores free-text modifiers ("no ice", "extra spicy") per line item.
- `telegram_tickets.status` tracks the kitchen ticket progress independently from the order payment status.
- `telegram_tickets.telegram_msg_id` stores the Telegram message ID so the bot can edit the existing message when the cook taps "Done".
- `stalls.owner_id` identifies the business owner responsible for each stall.
- `stalls.location` stores the physical location of the stall (e.g. AEON Mall, Night Market, University).
- `stalls.device_token` is the permanent terminal registration key stored in browser `localStorage`.
- `products.stall_id = NULL` means a global/shared item visible to all stalls.
- `categories.stall_id = NULL` means a shared category across stalls.
