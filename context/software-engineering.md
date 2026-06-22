# Software Engineering (SE) Context

This document captures the Software Engineering deliverables required by the Cross-Disciplinary Project handbook.

## 1) Methodology

**Chosen methodology**: Scrum (lightweight).

**Cadence (suggested)**

- Sprint length: 1 week
- Ceremonies: planning (30–45 min), daily standup (10 min), review/demo (30 min), retro (15 min)

**Definition of Done (DoD)**

- Feature works end-to-end in its defined scope
- No invariant in `context/architecture.md` is violated
- Basic happy-path + error-path handling exists
- API endpoint documented (Swagger/OpenAPI) and testable

## 2) Scope (MVP)

The MVP targets the core flow described in `context/project-overview.md`:

- Cashier creates an order/order and generates a payment QR
- System receives/derives a payment confirmation event
- System notifies the **specific cashier** who initiated the order
- Manager can view a simple daily summary report

**Out of scope (for MVP)**

- Inventory depletion logic
- Hardware integrations (printers/cash drawers)
- Non-QR payment processing

## 3) Actors and Roles

**Actors**

- Cashier
- Manager

**Roles (RBAC)**

- `CASHIER`: create orders, view own active/session orders
- `MANAGER`: read access to all orders + reporting

## 4) Functional Requirements

FR-01 Authentication

- Users can log in and receive a JWT.
- Requests to protected routes require a valid JWT.

FR-02 Authorization

- Cashier can only access and mutate orders they own (or are assigned to).
- Manager can access reporting and read all orders.

FR-03 Products (basic)

- Manager can create/update/delete products (or preset items).
- Cashier can list products to build an order.

FR-04 Order creation

- Cashier can create an order with line items and total.
- Order is created in `PENDING_PAYMENT` state.

FR-05 QR generation

- System can generate a payment QR payload for the order.

FR-06 Payment confirmation

- System can record a payment confirmation event for an order.
- An order cannot be marked `PAID/COMPLETED` without a valid confirmation event (see invariants in `context/architecture.md`).

FR-07 Cashier-specific notification

- When payment is confirmed, the system notifies the **specific cashier** who initiated the order.

FR-08 Reporting

- Manager can view a daily summary report (e.g., total count, total amount, list of orders).

FR-09 API documentation + testing

- The API is documented with Swagger/OpenAPI.
- Endpoints are testable (Swagger UI and/or Postman collection).

## 5) Non-Functional Requirements

NFR-01 Security

- JWT auth on all mutation endpoints.
- Role checks enforced on privileged endpoints.
- Unknown input validated at boundaries.

NFR-02 Reliability / Correctness

- Payment status transitions are controlled and auditable.
- No “paid” state without a confirmation event.

NFR-03 Usability

- Cashier-facing UI optimized for tablet/mobile usage and fast tapping (see `context/ui-context.md`).

NFR-04 Performance

- Common endpoints respond quickly under normal booth traffic.

NFR-05 Maintainability

- Backend follows separation: routes/controllers/services/repositories (see `context/architecture.md`).

## 6) User Stories (with Acceptance Criteria)

US-01 Cashier login

- As a cashier, I want to log in so I can start processing sales.
- Acceptance:
  - Given valid credentials, I receive a JWT
  - Given invalid credentials, I receive an error response

US-02 Create order

- As a cashier, I want to create a new order so I can request a QR payment.
- Acceptance:
  - Creates an order in `PENDING_PAYMENT`
  - Order is linked to the cashier

US-03 Show QR

- As a cashier, I want to display a QR code so the customer can pay.
- Acceptance:
  - A QR payload is generated for an order
  - UI indicates “waiting for payment”

US-04 Receive confirmation

- As a cashier, I want an instant confirmation when the payment is received so I can complete the sale.
- Acceptance:
  - Only the initiating cashier sees the confirmation
  - The order status becomes `PAID/COMPLETED` only after confirmation

US-05 Manager report

- As a manager, I want to see a daily report so I can reconcile sales.
- Acceptance:
  - Manager can view totals and order list for a day
  - Cashier cannot access manager-only report endpoints

## 7) Team Responsibilities (example mapping)

Adjust names to your group.

- Member A (Backend): Express API, auth, middleware, Swagger
- Member B (Database): ERD/RM, SQL scripts, indexing/roles, connection
- Member C (HCI + Frontend): personas/flows/wireframes, React UI integration

SE responsibility: ensure requirements, diagrams, and planning stay consistent with implemented scope.

## 8) UML Diagrams (Handbook requirement)

### 8.1 Use Case Diagram (Use Case view)

```mermaid
flowchart LR
  Cashier[Actor: Cashier]
  Manager[Actor: Admin/Owner]
  Cook[Actor: Kitchen Staff]
  Gateway[External: Payment Gateway]

  subgraph SystemBoundary[Toub POS System]
    %% Cashier Flow
    UC1((Login via Avatar & PIN))
    UC2((Create Order & Modifiers))
    UC3((Process KHQR / Cash))
    UC4((Receive Real-time WS Ping))
    
    %% Manager Flow
    UC5((Provision Stalls & Staff))
    UC6((Manage Dual-Pricing Menu))
    UC7((View Time-Series Analytics))

    %% Kitchen Flow
    UC8((View Telegram Queue))
    UC9((Tap 'Done' to Update Status))

    %% System Flow
    UC10((Webhook Verification))
  end

  %% Connections
  Cashier --> UC1
  Cashier --> UC2
  Cashier --> UC3
  Cashier --> UC4

  Manager --> UC5
  Manager --> UC6
  Manager --> UC7

  Cook --> UC8
  Cook --> UC9

  Gateway --> UC10
  UC10 -.->|Triggers| UC4
  UC10 -.->|Triggers| UC8
```

**Description**

- Expanded to include Kitchen Staff (Telegram) and Payment Gateway actors.
- Highlights specific PRD requirements like Avatar/PIN login, Dual-Pricing, and WebSocket pings.

### 8.2 Activity Diagram 

1. Main Checkout & Kitchen Fulfillment Flow (with Swimlanes)

```mermaid
flowchart TD
  subgraph Cashier [Frontline Cashier Workspace]
    A([Start]) --> B(Tap Avatar & Enter PIN)
    B --> C(Build Order with Modifiers)
    C --> D{Payment Channel?}
    D -- Cash --> E(Verify Cash Guardrail)
    D -- KHQR --> F(Generate Dynamic KHQR)
    J(Receive Real-time WS Notification) --> O([Cashier Completes Sale])
  end

  subgraph System [Backend & Webhooks]
    F --> G(Wait for Bank Callback)
    G --> H(Process Webhook Event)
    E --> I(Update DB to PAID)
    H --> I
    I --> J
    I --> K(Push Payload to Telegram Bot)
  end

  subgraph Kitchen [Back-of-House Telegram]
    K --> L(Display Digital Ticket in Sequence)
    L --> M(Cook Order)
    M --> N(Tap 'Done' inline button)
    N --> P([Kitchen Order Closed])
  end
```

**Description**

- Introduces swimlanes (subgraphs) to clearly separate responsibilities between the physical POS terminal, the backend system, and the Telegram kitchen display.
- Visualizes the parallel execution of notifying the cashier (WebSockets) and dispatching to the kitchen (Telegram) immediately after the database is updated.

2. Main Administrative Flow

```mermaid
flowchart TD
  subgraph Admin [Administrative Portal]
    A([Start]) --> B(Login via Credentials)
    B --> C{Select Module}
    
    C -->|Staff Matrix| D(Provision Devices & Assign Avatars)
    C -->|Package Manager| E(Upload Menu & Set Dual Prices)
    C -->|Analytics| F(Toggle Granular Reports & View Charts)
    
    D --> Z([End Task])
    E --> Z
    F --> Z
  end
```

### 8.3 Class Diagram (Domain model)

```mermaid
classDiagram
  class User {
    +int id
    +string username
    +string password
    +string pin
    +string role
    +bool is_active
    +dateTime created_at
  }

  class Stall {
    +int id
    +string name
    +string device_token
    +bigint telegram_chat_id
    +dateTime created_at
  }

  class Category {
    +int id
    +int stall_id
    +string name
    +string tone
    +dateTime created_at
  }

  class Product {
    +int id
    +int stall_id
    +int category_id
    +string name
    +double price_usd
    +int price_khr
    +string image_url
    +bool is_visible
    +dateTime created_at
  }

  class Order {
    +int id
    +int stall_id
    +int cashier_id
    +string payment_method
    +string status
    +double total_usd
    +string qr_payload
    +string kitchen_status
    +string telegram_status
    +bigint telegram_msg_id
    +dateTime created_at
    +dateTime completed_at
  }

  class OrderItem {
    +int id
    +int order_id
    +int product_id
    +string name
    +double price_usd
    +int price_khr
    +double subtotal_usd
    +int subtotal_khr
    +int quantity
    +string notes
  }

  class TelegramSession {
    +int id
    +int stall_id
    +bigint telegram_user_id
    +string name
  }

  %% Relationships representing data flow and structural dependencies
  User "many" -- "many" Stall : stall_staff
  Stall "1" --> "many" Category : has
  Stall "1" --> "many" Product : has
  Stall "1" --> "many" Order : processes
  Stall "1" --> "many" TelegramSession : authorizes
  
  Category "1" --> "many" Product : groups
  
  User "1" --> "many" Order : acts_as_cashier
  
  Order "1" *-- "many" OrderItem : contains
  
  Product "1" --> "many" OrderItem : snapshotted_in
```

**Description**

- The Class Diagram now accurately maps 1:1 with the physical `schema.sql` (Database-First approach).
- `stall_staff` is represented as a many-to-many relationship between `User` and `Stall`.
- `OrderItem` correctly relies on `Product` for its origin, but copies the `name` and `price` as snapshots.

### 8.4 Sequence Diagram (Payment confirmation + notification)

```mermaid
sequenceDiagram
  participant C as Cashier UI
  participant API as Backend API
  participant DB as MySQL
  participant L as Payment Listener/Webhook

  C->>API: POST /orders (JWT)
  API->>DB: insert Order(status=PENDING_PAYMENT)
  DB-->>API: orderId
  API-->>C: 201 Created + orderId

  C->>API: GET /orders/{id}/qr (JWT)
  API-->>C: QR payload

  L->>API: POST /payments/confirm (provider event)
  API->>DB: insert PaymentConfirmation
  API->>DB: update Order(status=PAID)
  API-->>C: realtime event (notify initiating cashier)
```

**Description**

- Listener/webhook is shown as a separate participant. The exact provider API is an open question in `context/progress-tracker.md`.

## 9) Assumptions and Open Questions

- Payment gateway/provider API is not finalized yet (see `context/progress-tracker.md`).
- “Real-time notification” may be implemented via WebSocket or polling, depending on constraints.
