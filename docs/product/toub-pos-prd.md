# TouB POS Product Requirements Document

## 1. Document Control

| Field | Value |
| --- | --- |
| Product | TouB POS |
| Document type | As-built Product Requirements Document (PRD) |
| Version | 1.0 |
| Status | Baseline for team review |
| Baseline date | 30 July 2026 |
| Product team | TouB POS project team |
| Primary stakeholders | Small merchant operators, project team, course evaluators |
| Current release focus | Cash-first multi-stall POS with Telegram kitchen operations |
| Source baseline | `docs/archive/reference/toub-pos-current-system-fact-sheet.md` |

### 1.1 PRD Method

This PRD follows the concise Agile approach described in Atlassian's
[Product Requirements Document guide](https://www.atlassian.com/agile/product-management/requirements).
It focuses on purpose, users, goals, behavior, success criteria, assumptions,
and scope. Detailed implementation belongs in the functional and technical
design document.

### 1.2 Requirement Status

| Status | Meaning |
| --- | --- |
| Implemented | Present in the current application and verified against code |
| Suspended | Code or data is retained, but users cannot actively use the feature |
| Future | Approved direction or candidate work that is not implemented |
| Open | Requires a team decision before becoming a requirement |

### 1.3 Priority

| Priority | Meaning |
| --- | --- |
| Must | Required for the current final-project baseline |
| Should | Important for a professional and reliable demonstration |
| Could | Valuable enhancement that is not required for the current baseline |

## 2. Executive Summary

TouB POS is a lightweight point-of-sale system for small merchant businesses
operating one or more physical stalls. It gives Cashiers a fast, stall-scoped
selling workspace and gives Owners and Managers centralized control over menu
items, staff, terminals, sales, and kitchen operations.

The product solves three central problems:

1. Preventing incorrect prices, totals, or paid states from being trusted from
   the Cashier browser.
2. Preventing products, staff, devices, and transactions from leaking between
   businesses or Stalls.
3. Replacing paper kitchen tickets with traceable Telegram tickets sent only
   after payment.

Cash is the active payment method. KHQR code and historical records are retained
but disabled while the team evaluates an approved merchant payment provider.

## 3. Product Vision

> Help small multi-stall merchant teams sell quickly, control access clearly,
> calculate payments accurately, and coordinate with the kitchen without
> requiring expensive POS or kitchen-display hardware.

## 4. Problem Statement

Small merchant teams often coordinate orders manually across Cashiers, Owners,
Managers, and kitchen staff. During busy periods this can cause:

- Incorrect totals or change.
- Products from the wrong Stall being sold.
- Unclear responsibility for Orders and payment confirmation.
- Paper tickets being delayed, lost, or misunderstood.
- Weak visibility into Stall and Cashier performance.
- Shared devices remaining active after management wants to revoke them.
- Excessive access when every worker is treated as an administrator.

TouB POS must reduce these problems through backend-owned transaction rules,
role-based access, Stall-scoped terminals, real-time updates, and a Telegram
kitchen workflow.

## 5. Business Objectives

| ID | Objective | Success evidence |
| --- | --- | --- |
| OBJ-01 | Make every completed sale trustworthy | Backend derives prices, Stall, Cashier, total, and paid state |
| OBJ-02 | Keep each customer business isolated | Owner-scoped queries and authorization reject cross-business access |
| OBJ-03 | Keep Cashier selling fast | PIN login, touch-friendly menu, visible cart, and cash/change workflow |
| OBJ-04 | Improve kitchen coordination | Paid Orders produce Stall-routed Telegram tickets with completion state |
| OBJ-05 | Improve operational visibility | Owner/Manager dashboards and reports use database-backed sales data |
| OBJ-06 | Demonstrate professional engineering practice | RBAC, hashing, audit logs, validation, documentation, and testable APIs |

## 6. Users And Stakeholders

### 6.1 Platform Admin

The Platform Admin is a temporary TouB POS team bootstrap role. Their current
goal is to create the single Owner account for a customer business. They are not
part of the customer's operational hierarchy and do not have a platform UI.

### 6.2 Owner

The Owner is the single highest-privilege user inside one customer business.
They need to configure the business, create Managers and Cashiers, manage Stalls
and terminals, connect kitchen groups, inspect Orders, and understand sales.

### 6.3 Manager

The Manager supervises daily operations for an Owner. They need to manage
Cashiers, catalog data, Stalls, staff assignments, registered terminals,
kitchen Cook access, Orders, and reports without gaining Owner-only hierarchy or
kitchen-routing powers.

### 6.4 Cashier

The Cashier sells from a registered terminal assigned to a Stall. They need to
unlock the terminal quickly, see only sellable products for that Stall, manage a
cart, receive cash, calculate change, issue a receipt, and monitor their own
Order's kitchen ticket.

### 6.5 Cook

The Cook works only through Telegram. They need to receive paid kitchen Orders
for their Stall and mark an authorized ticket as done. They do not need web-app
credentials or access to POS management.

### 6.6 Customer

The Customer does not directly use TouB POS. They expect correct totals, correct
change, and timely preparation of the Order entered by the Cashier.

## 7. Core User Stories

| ID | User story | Status |
| --- | --- | --- |
| US-PLT-01 | As a Platform Admin, I want to create a business Owner so a new customer can begin configuring TouB POS. | Implemented |
| US-OWN-01 | As an Owner, I want to create Managers and Cashiers so responsibilities are divided safely. | Implemented |
| US-MGR-01 | As a Manager, I want to manage Cashiers without being able to create Owners or Managers. | Implemented |
| US-DEV-01 | As management, I want to register and revoke individual terminals so one device can be disabled without disrupting another. | Implemented |
| US-CAT-01 | As management, I want products assigned to zero or more Stalls so one catalog can support multiple selling locations. | Implemented |
| US-CSH-01 | As a Cashier, I want to unlock my Stall terminal with a PIN so I can begin a shift quickly. | Implemented |
| US-ORD-01 | As a Cashier, I want to build an Order from my Stall's visible products so I cannot accidentally sell another Stall's menu. | Implemented |
| US-PAY-01 | As a Cashier, I want to enter cash received and see change so I can complete payment accurately. | Implemented |
| US-KIT-01 | As a Cook, I want paid Orders delivered to my Stall's Telegram group so I can prepare the correct items. | Implemented |
| US-KIT-02 | As an authorized Cook, I want to mark a ticket done so POS users see its latest kitchen state. | Implemented |
| US-REP-01 | As an Owner or Manager, I want filtered reports and receipts so I can review business performance and transactions. | Implemented |
| US-PAY-02 | As a Cashier, I want an approved QR payment option with backend verification. | Suspended |
| US-PLT-02 | As the TouB POS team, I want a platform console for customer businesses, subscriptions, and support. | Future |

## 8. Product Scope

### 8.1 In Scope For The Current Baseline

- Public landing and login entry.
- Owner/Manager management portal.
- Cashier terminal workspace.
- JWT authentication and backend RBAC.
- Role-specific password or PIN credentials.
- One Owner per customer business.
- Multiple Managers and Cashiers per Owner.
- Multiple Stalls per business.
- Multiple independently revocable terminals per Stall.
- Cashier-to-Stall assignment.
- Owner-scoped categories and catalog products.
- Product assignment to zero or more Stalls.
- Per-Stall product pricing and visibility.
- USD/KHR product pricing.
- Product images.
- Backend-owned Orders and cash payment confirmation.
- Cash received and change due.
- Order item name, price, quantity, and notes snapshots.
- Own-Order history for Cashiers.
- Business-wide Order access for Owner/Manager.
- Audit logs for Order creation and payment confirmation.
- Telegram kitchen group connection per Stall.
- Telegram-only Cook authorization.
- Telegram ticket completion and manual retry.
- Real-time Order, device, and kitchen updates.
- Sales reports, dashboard trends, filters, search, receipts, CSV, and PDF.
- Responsive light and dark presentation themes.

### 8.2 Retained But Inactive

- KHQR Order creation.
- KHQR QR display and resume flow.
- Bakong transaction checking by MD5.
- KHQR background reconciliation.
- KHQR historical fields, Orders, receipts, and report values.

### 8.3 Out Of Scope

- Multiple Owners within one customer business.
- Cook web-app account or kitchen web portal.
- Full `platform_admin` management portal.
- Subscriptions, licensing, billing, and Owner recovery.
- Inventory ingredient depletion.
- Supplier and purchase-order management.
- Receipt-printer and cash-drawer integration.
- Card payment processing.
- Active QR payment before provider approval.
- General Order cancellation flow.
- Refunds and returns.
- Split payments.
- Parked transactions.
- Offline-first checkout and background synchronization.
- Automatic Telegram retry worker.
- Full refresh-token cookie architecture.
- Enterprise monitoring, disaster recovery, and support tooling.

## 9. Functional Requirements

### 9.1 Identity, Authentication, And Sessions

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| IAM-001 | Every web user shall have a required, unique username. | Must | Implemented |
| IAM-002 | Platform Admin, Owner, and Manager shall authenticate with username and password only. | Must | Implemented |
| IAM-003 | Cashier shall authenticate using a Cashier profile and PIN on an active registered terminal. | Must | Implemented |
| IAM-004 | Platform Admin, Owner, and Manager shall store a bcrypt password hash and no PIN. | Must | Implemented |
| IAM-005 | Cashier shall store a bcrypt PIN hash and no password. | Must | Implemented |
| IAM-006 | Inactive users shall be rejected during login. | Must | Implemented |
| IAM-007 | Successful authentication shall create a short-lived access JWT and an eight-hour rotating refresh session. | Must | Implemented |
| IAM-008 | Protected API requests shall require a valid JWT. | Must | Implemented |
| IAM-009 | Protected Cashier requests shall also require the active token for the terminal bound to the Cashier JWT. | Must | Implemented |
| IAM-010 | Logout shall clear the active browser authentication session. | Must | Implemented |
| IAM-011 | Normal API responses shall never expose passwords, PINs, or their hashes. | Must | Implemented |
| IAM-012 | Login and PIN endpoints shall enforce separate rate limits and return a clear `429` response. | Should | Implemented |
| IAM-013 | Refresh credentials shall use rotating HttpOnly cookies, CSRF protection, hash-only database storage, reuse detection, and revocation. | Must | Implemented |

### 9.2 Roles And Authorization

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| RBAC-001 | Active web roles shall be `platform_admin`, `owner`, `manager`, and `cashier`; `admin` shall not be an active role. | Must | Implemented |
| RBAC-002 | Platform Admin shall create Owner accounts only and shall remain outside customer-business operations. | Must | Implemented |
| RBAC-003 | Each customer business shall have one Owner; additional supervisors shall be Managers. | Must | Implemented |
| RBAC-004 | Owner shall create and manage Manager and Cashier accounts, but not additional Owners. | Must | Implemented |
| RBAC-005 | Manager shall create and manage Cashier accounts only. | Must | Implemented |
| RBAC-006 | Cashier shall not access management APIs or the management portal. | Must | Implemented |
| RBAC-007 | Owner and Manager shall access operational catalog, Stall, device, Cook, Order, and reporting tools in their business scope. | Must | Implemented |
| RBAC-008 | Only Owner shall generate a Telegram kitchen-group connection link. | Must | Implemented |
| RBAC-009 | Backend authorization shall remain authoritative when frontend controls or route guards are bypassed. | Must | Implemented |
| RBAC-010 | All customer-business data access shall resolve and enforce the authenticated Owner scope. | Must | Implemented |

### 9.3 Stall, Staff, And Terminal Management

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| DEV-001 | Owner/Manager shall create, view, update, and soft-delete Stalls within their business scope. | Must | Implemented |
| DEV-002 | Only Cashier users from the same business shall be assignable to a Stall. | Must | Implemented |
| DEV-003 | A Cashier terminal shall load only the roster associated with its registered Stall. | Must | Implemented |
| DEV-004 | Owner/Manager shall register multiple named terminals to one Stall. | Must | Implemented |
| DEV-005 | Every terminal shall receive an independent raw registration token, while MySQL stores only its SHA-256 hash. | Must | Implemented |
| DEV-006 | Owner/Manager shall revoke one terminal without revoking other terminals at the Stall. | Must | Implemented |
| DEV-007 | A revoked terminal shall lose API and Socket.IO access and be logged out without requiring a manual page refresh. | Should | Implemented |
| DEV-008 | Management terminal lists shall update after registration or revocation without requiring a full page refresh. | Should | Implemented |
| DEV-009 | Terminal API responses shall not expose raw token values or token hashes after registration. | Must | Implemented |

### 9.4 Categories, Products, And Stall Catalogs

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| CAT-001 | Owner/Manager shall manage categories within their Owner scope. | Must | Implemented |
| CAT-002 | Category names shall be unique within an Owner's business. | Must | Implemented |
| CAT-003 | Every Product shall belong to one valid Category in the same business. | Must | Implemented |
| CAT-004 | Product name and positive USD/KHR prices shall be required before creation. | Must | Implemented |
| CAT-005 | Owner/Manager shall assign a Product to zero, one, or multiple Stalls in the same business. | Must | Implemented |
| CAT-006 | Removing every Stall assignment shall keep the Product in the management catalog and preserve its default prices. | Must | Implemented |
| CAT-007 | A Product assignment shall support Stall-specific USD/KHR prices and visibility. | Must | Implemented |
| CAT-008 | Cashier shall receive only active, non-deleted, visible Products assigned to the Cashier's Stall. | Must | Implemented |
| CAT-009 | Backend services shall validate Product, Category, and Stall IDs before using them. | Must | Implemented |
| CAT-010 | Owner/Manager shall upload supported Product images, with binary storage handled outside MySQL. | Should | Implemented |
| CAT-011 | Product/category/Stall data shall remain in MySQL after browser storage is cleared. | Must | Implemented |

### 9.5 Cart And Order Creation

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| ORD-001 | Cashier shall search, filter, and add visible Stall Products to a cart. | Must | Implemented |
| ORD-002 | Cashier shall increase, decrease, remove, and clear cart items before checkout. | Must | Implemented |
| ORD-003 | Cashier shall optionally add notes/modifiers of at most 500 characters to an Order Item. | Should | Implemented |
| ORD-004 | Only Cashier shall create a new Order through the POS checkout endpoint. | Must | Implemented |
| ORD-005 | The frontend shall send only payment method, Product ID, quantity, and optional notes for Order creation. | Must | Implemented |
| ORD-006 | Backend shall derive Cashier ID from the JWT and Stall ID from the Cashier's assignment. | Must | Implemented |
| ORD-007 | Backend shall load prices from the Stall Product records and calculate trusted totals. | Must | Implemented |
| ORD-008 | Backend shall reject client-submitted price, total, status, paid, Cashier, or Stall fields. | Must | Implemented |
| ORD-009 | Backend shall reject invalid quantities, hidden Products, unavailable Products, and Products outside the Cashier's Stall. | Must | Implemented |
| ORD-010 | Backend shall snapshot item name, USD/KHR prices, quantity, line totals, and notes. | Must | Implemented |
| ORD-011 | A newly created Order shall start as `pending_payment`. | Must | Implemented |
| ORD-012 | Order creation shall create an `order_created` Audit Log linked to the actor and Order. | Must | Implemented |
| ORD-013 | Cashier shall see only Orders they created; Owner/Manager shall see Orders only within their business. | Must | Implemented |
| ORD-014 | A general user-facing cancellation operation shall not be claimed until an authorized cancellation workflow exists. | Must | Implemented |

### 9.6 Cash Payment

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| PAY-001 | Cash checkout shall require explicit confirmation after the Order is created. | Must | Implemented |
| PAY-002 | Cashier shall enter the amount of cash received. | Must | Implemented |
| PAY-003 | Frontend may preview change, but backend shall validate cash received and calculate the saved change. | Must | Implemented |
| PAY-004 | Backend shall reject cash received below the trusted Order total. | Must | Implemented |
| PAY-005 | Only the creating Cashier or a same-business Owner/Manager shall confirm cash payment. | Must | Implemented |
| PAY-006 | Cash confirmation shall reject non-cash, paid, cancelled, or otherwise non-pending Orders. | Must | Implemented |
| PAY-007 | Successful confirmation shall set the Order to `paid`, save cash received/change, and record completion time. | Must | Implemented |
| PAY-008 | Successful cash confirmation shall create a `cash_payment_confirmed` Audit Log. | Must | Implemented |
| PAY-009 | Frontend shall not mark an Order paid without a successful backend response. | Must | Implemented |
| PAY-010 | The paid receipt shall display trusted Order, payment, cash received, and change information. | Should | Implemented |

### 9.7 QR Payment

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| QRP-001 | New QR payment processing shall remain hidden and blocked until an approved merchant provider is selected. | Must | Suspended |
| QRP-002 | Historical KHQR Orders and metadata shall remain readable in reports and receipts. | Should | Implemented |
| QRP-003 | Any future QR provider shall receive a backend-owned amount and shall never trust a client-paid flag. | Must | Future |
| QRP-004 | Any future QR paid transition shall verify provider status, amount, currency, and destination before changing Order state. | Must | Future |
| QRP-005 | Any future provider integration shall be idempotent and shall not duplicate audit logs or kitchen tickets. | Must | Future |
| QRP-006 | Provider credentials and secrets shall remain backend-only. | Must | Future |

### 9.8 Telegram Kitchen Operations

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| KIT-001 | Owner shall connect one Telegram group to a Stall through a short-lived one-time setup link. | Must | Implemented |
| KIT-002 | Group setup shall accept groups/supergroups and reject invalid, expired, reused, private, or cross-Stall connections. | Must | Implemented |
| KIT-003 | The setup token shall be stored only as a SHA-256 hash and shall expire within the configured short window. | Must | Implemented |
| KIT-004 | Owner/Manager shall authorize and revoke Telegram-only Cook identities for a Stall. | Must | Implemented |
| KIT-005 | A paid Order shall be dispatched to its own Stall's connected Telegram group. | Must | Implemented |
| KIT-006 | Telegram delivery failure shall not reverse or invalidate a paid Order. | Must | Implemented |
| KIT-007 | Kitchen ticket state shall be independent from payment state and use `pending`, `sent`, `failed`, or `done`. | Must | Implemented |
| KIT-008 | Owner/Manager shall retry missing or failed paid-order tickets in their business. | Should | Implemented |
| KIT-009 | Cashier shall retry only their own missing or failed paid-order tickets. | Should | Implemented |
| KIT-010 | Retry shall reject pending, sent, and done tickets to prevent duplicate dispatch. | Must | Implemented |
| KIT-011 | Ticket completion shall require an exact Order/ticket/chat/message match and an active Cook assigned to that Stall. | Must | Implemented |
| KIT-012 | Successful completion shall edit the existing Telegram message and store completion metadata. | Should | Implemented |
| KIT-013 | Complete Telegram user, chat, and message IDs shall remain backend-only; management shall receive masked identifiers only when operationally needed. | Must | Implemented |
| KIT-014 | A future automatic retry worker may retry failed delivery with bounded attempts and auditability. | Could | Future |

### 9.9 Dashboard, Reports, And Receipts

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| REP-001 | Owner/Manager shall view sales reports scoped to their business. | Must | Implemented |
| REP-002 | Reports shall support Today, current Monday-Sunday Week, Month, and custom date ranges. | Must | Implemented |
| REP-003 | Reports shall support optional Stall and Cashier filters. | Must | Implemented |
| REP-004 | Transaction Ledger search shall run against backend-scoped data before pagination. | Must | Implemented |
| REP-005 | Reports shall provide summary revenue, paid Orders, average Order value, payment mix, Stall breakdown, and Cashier breakdown. | Must | Implemented |
| REP-006 | Dashboard trends shall use hourly, daily, or seven-day points appropriate to the selected range. | Should | Implemented |
| REP-007 | Report dates and hourly buckets shall use the configured business timezone while stored timestamps remain UTC. | Must | Implemented |
| REP-008 | Owner/Manager shall open the receipt for a ledger Order. | Should | Implemented |
| REP-009 | Owner/Manager shall export report data as CSV and PDF. | Should | Implemented |
| REP-010 | Active reports shall refresh after relevant real-time events, with polling as fallback. | Should | Implemented |

### 9.10 Real-Time Updates

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| RT-001 | Socket.IO connections shall authenticate using the existing JWT. | Must | Implemented |
| RT-002 | Cashier Socket.IO connections shall also validate the active registered terminal. | Must | Implemented |
| RT-003 | Payment confirmation shall target only the Cashier who created the relevant Order. | Must | Implemented |
| RT-004 | Device revocation shall target only the selected terminal. | Must | Implemented |
| RT-005 | Management updates shall target only the matching Owner's business. | Must | Implemented |
| RT-006 | Order and kitchen updates shall trigger backend refetch so the UI does not rely on event payloads as the source of truth. | Should | Implemented |
| RT-007 | Polling or focus validation shall remain available for reconnects and missed events. | Should | Implemented |

## 10. Permission Matrix

`Allowed` below means the current product requirement allows the role to perform
the operation inside its authorized scope.

| Capability | Platform Admin | Owner | Manager | Cashier | Cook |
| --- | ---: | ---: | ---: | ---: | ---: |
| Create business Owner | Allowed | No | No | No | No |
| Access management portal | No | Allowed | Allowed | No | No |
| Manage Managers | No | Allowed | No | No | No |
| Manage Cashiers | No | Allowed | Allowed | No | No |
| Manage catalog/categories | No | Allowed | Allowed | No | No |
| Manage Stalls and assignments | No | Allowed | Allowed | No | No |
| Register/revoke terminals | No | Allowed | Allowed | No | No |
| Connect Telegram kitchen group | No | Allowed | No | No | No |
| Manage Telegram Cooks | No | Allowed | Allowed | No | No |
| Create Order | No | No | No | Allowed | No |
| Confirm own Cashier cash Order | No | No | No | Allowed | No |
| Confirm same-business cash Order | No | Allowed | Allowed | Own only | No |
| View business reports | No | Allowed | Allowed | No | No |
| View own Order history | No | Business | Business | Allowed | No |
| Retry eligible kitchen ticket | No | Business | Business | Own only | No |
| Mark Telegram ticket done | No | No | No | No | Authorized Stall only |

## 11. Non-Functional Requirements

### 11.1 Security

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-SEC-001 | Backend shall enforce authentication, role permission, business scope, and Stall scope at protected boundaries. | Must | Implemented |
| NFR-SEC-002 | Startup shall fail clearly when required JWT, database, or production-origin configuration is missing. | Must | Implemented |
| NFR-SEC-003 | Production CORS shall allow only the configured frontend origin. | Must | Implemented |
| NFR-SEC-004 | Security headers shall be enabled without breaking local API documentation. | Should | Implemented |
| NFR-SEC-005 | Logs and responses shall not expose passwords, PINs, JWTs, device tokens, provider secrets, or complete Telegram routing identifiers. | Must | Implemented |
| NFR-SEC-006 | Destructive management actions should require explicit user confirmation while backend authorization remains authoritative. | Should | Implemented |
| NFR-SEC-007 | A future production deployment shall use HTTPS and strong secrets. | Must | Future |

### 11.2 Data Integrity And Auditability

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-DAT-001 | MySQL shall remain the source of truth for persisted POS business data. | Must | Implemented |
| NFR-DAT-002 | Order Item snapshots shall remain unchanged when catalog data changes later. | Must | Implemented |
| NFR-DAT-003 | Payment transitions shall be auditable by actor, action, Order, details, and time. | Must | Implemented |
| NFR-DAT-004 | Sequelize models and canonical raw SQL documentation shall remain synchronized. | Must | Implemented |
| NFR-DAT-005 | Database backups and restoration steps shall be documented before production deployment. | Should | Future |

### 11.3 Usability And Accessibility

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-UX-001 | Cashier workflows shall be usable on phone, tablet, laptop, and desktop sizes without required horizontal scrolling. | Must | Implemented |
| NFR-UX-002 | Common Cashier controls shall have clear labels, visible focus, understandable disabled states, and touch-friendly targets. | Must | Implemented |
| NFR-UX-003 | Loading, error, empty, pending, paid, and failed states shall be visible in relevant workflows. | Must | Implemented |
| NFR-UX-004 | Color shall not be the only indicator of important payment or ticket state. | Should | Implemented |
| NFR-UX-005 | Light and dark themes shall maintain readable contrast. | Should | Implemented |
| NFR-UX-006 | Destructive actions shall not use disappearing toast messages as confirmation dialogs. | Should | Implemented |

### 11.4 Performance And Reliability

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-REL-001 | Large management lists and report ledgers shall support pagination. | Should | Implemented |
| NFR-REL-002 | Reporting aggregation shall be performed by the backend/database rather than browser-only calculations. | Must | Implemented |
| NFR-REL-003 | A Telegram outage shall not roll back a successful cash payment. | Must | Implemented |
| NFR-REL-004 | Real-time features shall have a refetch, polling, or focus-check fallback where missing an event would leave stale operational state. | Should | Implemented |
| NFR-REL-005 | A confirmed paid Order should be submitted to Telegram promptly; the target for the final demonstration is within two seconds under normal connectivity and still requires final demo verification. | Should | Implemented |

### 11.5 Maintainability

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NFR-MNT-001 | Backend code shall follow Route, Controller, Service, Repository, Model boundaries. | Should | Implemented |
| NFR-MNT-002 | Frontend business UI shall remain grouped by feature and use shared domain-neutral UI components. | Should | Implemented |
| NFR-MNT-003 | HTTP calls shall use the centralized Axios API client. | Should | Implemented |
| NFR-MNT-004 | Meaningful architecture or behavior changes shall update active context and progress documentation. | Should | Implemented |

## 12. Assumptions And Constraints

### 12.1 Assumptions

- A customer business has one Owner.
- Managers and Cashiers belong to one Owner scope.
- Each active Cashier is assigned to a Stall before selling.
- Cashiers work from pre-registered browser terminals.
- The merchant has internet connectivity for the API, ImageKit, Socket.IO, and
  Telegram.
- Kitchen workers already have access to Telegram.
- USD is the trusted cash Order total currency in the current confirmation flow.
- KHR values are stored as Product and Order Item pricing snapshots.

### 12.2 Constraints

- This is a Year 2 Software Engineering final project with limited time and
  infrastructure.
- Access JWTs remain only in memory; rotating refresh credentials use Secure,
  HttpOnly cookies with an eight-hour absolute session limit.
- `platform_admin` has no current frontend console.
- Owner identity acts as the current customer-business isolation key; there is no
  separate business/tenant table.
- KHQR remains disabled until an acceptable provider arrangement exists.
- Telegram and ImageKit are external dependencies outside TouB POS availability
  control.
- Development may use Sequelize schema synchronization; production-quality
  migrations remain a future hardening area.

## 13. Dependencies

| Dependency | Purpose | Product impact if unavailable |
| --- | --- | --- |
| MySQL | Authoritative business and transaction data | POS cannot authenticate or process persisted sales |
| Telegram Bot API | Kitchen ticket delivery and completion | Payment remains valid; kitchen ticket shows failure/retry state |
| ImageKit | Product image upload and delivery | Existing catalog remains usable; image operations may fail |
| Socket.IO connection | Live browser updates | API remains usable; UI uses refetch/polling fallback |
| Approved future QR provider | Automated QR payment verification | KHQR/QR checkout remains disabled |

## 14. Success Metrics And Acceptance Targets

| ID | Target | Verification |
| --- | --- | --- |
| MET-001 | Browser-submitted fake prices/totals cannot change the saved total | API test with tampered payload |
| MET-002 | A Cashier cannot sell a hidden or other-Stall Product | API tests for hidden and cross-Stall Product IDs |
| MET-003 | Underpaid cash cannot mark an Order paid | Cash confirmation API test |
| MET-004 | Correct cash confirmation saves trusted cash received and change | Cash checkout and database/receipt check |
| MET-005 | Cashier cannot open management APIs | Authenticated `403` test |
| MET-006 | Manager cannot create Owner or Manager users | User-management API tests |
| MET-007 | Revoking one terminal logs it out without revoking another | Two-terminal manual test |
| MET-008 | Paid Order routes to the connected Stall group only | Multi-Stall Telegram test |
| MET-009 | Unauthorized Telegram identity cannot complete a ticket | Callback authorization test |
| MET-010 | Owner/Manager Today report includes business-local paid Orders | Report/API test using `REPORT_TIMEZONE_OFFSET` |
| MET-011 | Clearing browser storage does not delete Products, Stalls, users, or Orders from MySQL | Clear storage, log in, and reload data |
| MET-012 | Frontend lint/build and backend lint/tests pass before final demonstration | Project verification commands |

## 15. Risks And Mitigations

| ID | Risk | Impact | Current mitigation |
| --- | --- | --- | --- |
| RISK-001 | XSS uses or steals the current in-memory access JWT | Attacker may act as the user until the short JWT expires | 15-minute access JWT, HttpOnly rotating refresh token, backend RBAC, no unsafe HTML |
| RISK-002 | Cross-business or cross-Stall data leakage | Serious privacy and transaction exposure | Owner-scoped and Stall-scoped backend queries; do not trust client IDs |
| RISK-003 | Shared Cashier PIN brute force | Unauthorized terminal use | Registered device requirement, bcrypt PIN, stricter PIN rate limit |
| RISK-004 | Telegram delivery failure | Kitchen misses a paid Order | Separate ticket state, live failure status, scoped manual retry |
| RISK-005 | Unauthorized Telegram completion | Incorrect kitchen status | Webhook secret, exact ticket context, active Stall Cook allowlist |
| RISK-006 | External service outage | Images, kitchen delivery, or live updates degrade | Preserve payment state and provide error/refetch/retry behavior |
| RISK-007 | Re-enabling KHQR without a suitable provider contract | Payment mismatch, throttling, or unreliable confirmation | Disabled-by-default frontend/backend feature flags |
| RISK-008 | Documentation drift | Team presents outdated behavior | Fact sheet, stable requirement IDs, evidence map, and consistency review |
| RISK-009 | Manager operational permissions are broader than expected | Manager may perform destructive catalog/Stall actions | Document current behavior; approve any stricter policy before changing code |
| RISK-010 | Development schema synchronization differs from production migration practice | Deployment schema drift | Keep Sequelize/SQL parity and add formal migrations before production |

## 16. Release Boundaries

### 16.1 Current Demonstration Release

The current final-project demonstration should focus on:

1. Owner/Manager login and RBAC.
2. Terminal registration and Cashier PIN login.
3. Stall-scoped catalog.
4. Cash Order creation and change calculation.
5. Receipt and Order history.
6. Telegram kitchen dispatch and authorized completion.
7. Device revocation and real-time updates.
8. Sales dashboard, report filtering, receipt inspection, CSV, and PDF.

### 16.2 Features Not To Demonstrate As Active

- New KHQR payment processing.
- Platform Admin web portal.
- Multiple Owners for one business.
- Order cancellation/refund.
- Offline checkout.
- Automatic Telegram retry.

## 17. Open Product Questions

| ID | Question | Decision needed before |
| --- | --- | --- |
| OQ-001 | Which approved merchant QR provider and confirmation contract should replace suspended KHQR polling? | Any QR payment reactivation |
| OQ-002 | Should Manager retain delete permission for Products, Categories, and Stalls, or should those become Owner-only? | Permission-policy hardening |
| OQ-003 | Should the product use a configurable KHR exchange rate, manually entered KHR prices, or both? | Pricing redesign |
| OQ-004 | Should TouB POS add a controlled cancellation/refund workflow and who may perform it? | Order lifecycle expansion |
| OQ-005 | Is manual Telegram retry sufficient, or does the final deployment require an automatic retry queue? | Production reliability work |
| OQ-006 | When should Owner scope be replaced by a dedicated Business/Tenant entity? | SaaS/platform expansion |

## 18. Traceability Summary

The later documentation suite should reuse these requirement IDs:

- Functional design: describe user/business behavior for each requirement group.
- Technical design: map requirements to routes, services, integrations, and
  security controls.
- User flows: label diagrams with relevant `IAM`, `DEV`, `ORD`, `PAY`, `KIT`,
  and `REP` IDs.
- UI/UX design brief: reference `NFR-UX` and Cashier/management user stories.
- Database schema document: map tables, constraints, and indexes to `IAM`,
  `RBAC`, `CAT`, `ORD`, `PAY`, `KIT`, and `NFR-DAT`.
- Test plan: map automated and manual cases to requirement and metric IDs.

## 19. PRD Approval Checklist

- [ ] Product team agrees that one customer business has one Owner.
- [ ] Product team agrees that `platform_admin` remains API/bootstrap-only.
- [ ] Product team confirms the current Owner/Manager permission matrix.
- [ ] Product team confirms cash as the only active checkout method.
- [ ] Product team confirms KHQR is suspended rather than removed.
- [ ] Product team confirms Cook remains Telegram-only.
- [ ] Product team reviews open questions and assigns owners.
- [ ] Technical team confirms the requirement statuses match the code baseline.
- [ ] Course team confirms the PRD contains the required academic deliverables.
