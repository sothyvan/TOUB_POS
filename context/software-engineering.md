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
  Manager[Actor: Manager]

  subgraph System[Toub POS]
    %% Cashier Flow
    UC1_Cashier((Log in to Cashier Session))
    UC2((Create order))
    UC3((Generate / show QR))
    
    %% Manager Flow
    UC1_Admin((Log in to Admin Dashboard))
    UC5((View daily report))
    UC6((Manage products))
  end

  %% Cashier Connections
  Cashier --> UC2
  Cashier --> UC3
  UC2 .->|&lt;&lt;include&gt;&gt;| UC1_Cashier
  UC3 .->|&lt;&lt;include&gt;&gt;| UC1_Cashier

  %% Manager Connections
  Manager --> UC5
  Manager --> UC6
  UC5 .->|&lt;&lt;include&gt;&gt;| UC1_Admin
  UC6 .->|&lt;&lt;include&gt;&gt;| UC1_Admin
```

**Description**

- Cashier focuses on creating orders and receiving payment confirmations.
- Manager focuses on reporting and product management.

### 8.2 Activity Diagram 
1. Main cashier flow

```mermaid
flowchart TD
  A([Start]) --> B[Cashier logs in]
  B --> C[Create order]
  C --> D[Generate QR]
  D --> E[Show QR / Waiting]
  E --> F{Payment confirmed?}
  F -- No --> E
  F -- Yes --> G[Mark order PAID/COMPLETED]
  G --> H[Notify initiating cashier]
  H --> I([End])
```

**Description**

- Loops in “waiting” until a confirmation event is recorded.

2. Main manager flow 
```mermaid
graph TD
  Start([Start]) --> Login[Manager logs in]
  Login --> Dashboard[Access Admin Dashboard]
  
  %% Decision point for the Manager's intent
  Dashboard --> Action{Choose Action}
  
  %% Branch 1: View Reports
  Action -->|View Reports| ViewReport[Request daily report]
  ViewReport --> FetchData[System fetches order data]
  FetchData --> DisplayReport[Display daily report summary]
  DisplayReport --> EndLoop1{Done?}
  EndLoop1 -->|No| Dashboard
  EndLoop1 -->|Yes| End
  
  %% Branch 2: Manage Products
  Action -->|Manage Products| SelectProduct[View product list]
  SelectProduct --> ModifyProduct{Add/Edit/Delete?}
  ModifyProduct --> UpdateDB[Update product database]
  UpdateDB --> DisplaySuccess[Show success message]
  DisplaySuccess --> EndLoop2{Done?}
  EndLoop2 -->|No| Dashboard
  EndLoop2 -->|Yes| End
```

### 8.3 Class Diagram (Domain model)

```mermaid
classDiagram
  class User {
    +int id
    +string username
    +string passwordHash
    +string role
    +login(string username, string password) bool
    +logout() void
  }

  class Order {
    +int id
    +int cashierId
    +string status
    +double totalAmount
    +dateTime createdAt
    +createOrder() Order
    +updateStatus(string newStatus) void
    +calculateTotal() double
  }

  class OrderItem {
    +int id
    +int orderId
    +int productId
    +int qty
    +double unitPrice
    +calculateSubtotal() double
  }

  class Product {
    +int id
    +string name
    +double price
    +bool isActive
    +updatePrice(double newPrice) void
    +toggleActiveStatus() void
  }

  class PaymentConfirmation {
    +int id
    +int orderId
    +string providerRef
    +double amount
    +dateTime confirmedAt
    +verifyWithProvider() bool
    +saveConfirmation() bool
  }

  %% Relationships representing data flow and structural dependencies
  User "1" --> "many" Order : creates
  Order "1" *-- "many" OrderItem : contains
  Product "1" --> "many" OrderItem : referenced by
  Order "1" --> "0..1" PaymentConfirmation : has
```

**Description**

- `PaymentConfirmation` is the audit record enabling the invariant “no paid without confirmation”.

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
