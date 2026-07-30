# Toub POS

## Overview

Toub POS is a lightweight POS system built for small merchant teams operating across multiple physical booth locations. It combines smart QR payment verification, real-time cashier-specific notifications, a Telegram-based kitchen display system, multi-stall staff coordination, and automated sales reporting — eliminating payment confusion and kitchen miscommunication during high-traffic sales periods.

## Goals

1. Keep cashier checkout totals and payment state backend-owned and auditable.
2. Support reliable cash checkout while an approved automated QR payment provider is evaluated.
3. Replace paper kitchen tickets with a real-time Telegram bot kitchen display.
4. Ensure accurate end-of-day sales reporting scoped per stall for owners.
5. Support dual-currency pricing (USD / KHR) for menu items.

## Core User Flow

1. Owner, or an authorized Manager, registers one or more named terminals to a specific **stall** (one-time provisioning per device).
2. Cashier taps their avatar from the stall's staff roster and enters a 4-digit PIN.
3. Cashier selects items from the stall-scoped menu (other stalls' items are hidden).
4. Cashier optionally adds **order modifiers** (e.g., "no ice", "extra spicy") per item.
5. Cashier selects **Cash** checkout.
   - Cash: confirmation dialog → backend validates the received amount and records the order as paid.
   - KHQR: temporarily unavailable while TouB POS evaluates an approved merchant payment provider.
6. On payment confirmation, the order payload is forwarded to the **Telegram kitchen bot**, which posts a structured order ticket to the stall's kitchen channel.
7. Cook taps "Done" in Telegram → bot edits the message to mark it complete.
8. Transaction is recorded to the central database under the stall and cashier.

## Features

### Authentication & Device Provisioning

- Sub-path routing: `/owner-portal` (owner/manager portal) vs `/` (cashier terminal)
- Multi-device, stall-locked terminal registration with individual real-time revocation
- Avatar-based staff quick-switching per stall roster
- 4-digit PIN pad for shift unlock

### Cashier Workspace

- Stall-scoped menu (only that stall's items/categories visible)
- Order modifiers per item (notes: "no ice", "extra spicy", etc.)
- Floating order summary with quantity adjustments
- Cash checkout with received-amount and change calculation
- Cash confirmation dialog guardrail
- "Park" transaction for later *(Future)*

### Payment Integration

- Backend-owned cash confirmation and audit logging
- Retained KHQR provider code and historical order metadata behind disabled-by-default feature flags
- Future approved merchant QR provider integration without trusting frontend payment status

### Kitchen Display (Telegram Bot)

- Real-time order relay to stall's Telegram kitchen channel
- Guided Owner-only connection of one Telegram kitchen group per stall using a short-lived one-time link
- Structured digital order tickets (items, qty, modifiers, stall label)
- Chronological queue by payment timestamp
- Authorized stall cook taps "Done" → bot edits message state in real time
- Telegram-only cook allowlist; cooks do not receive web-app credentials or roles

### Owner & Manager Portal

- Multi-stall management (add stalls, assign staff to stalls)
- Role-based staff management:
  - Platform Admin can create Owner users only as a temporary bootstrap role.
  - Owner can create and manage Manager and Cashier users only.
  - Manager can create and manage Cashier users only.
- Menu management with dual-currency pricing (USD / KHR)
- Stall-scoped menu profile assignment
- Analytical dashboards: Revenue trends, top products, staff performance
- Report filters: Daily / Monthly / Yearly

### Offline Resilience *(Future)*

- Current checkout is intentionally online-only. If the TouB POS API is unreachable, payment actions are disabled and the cashier is told to keep the cart open until reconnection.
- Client-side order caching when offline
- Background sync queue on reconnect

### Platform Administration *(Temporary Bootstrap Now / Future SaaS Mode)*

- `platform_admin` exists as a temporary TouB POS team role for creating customer business Owner accounts.
- It is API/bootstrap-only in the current project and does not have a frontend platform console.
- Full customer-business administration, subscriptions/licenses, owner recovery, and audited support access remain future work.
- Platform Admin must not be mixed with customer store roles (`owner`, `manager`, `cashier`).

## Scope

### In Scope

- Core POS UI for tablet/mobile web browsers.
- Multi-stall architecture with stall-isolated data.
- Real-time WebSocket notification routing (cashier-specific).
- JWT Authentication and RBAC (Owner / Manager / Cashier).
- Menu management with dual-currency pricing (USD / KHR).
- Order modifiers/notes per item.
- Service Fee (3%) and Estimated Tax (8%) calculation.
- Cash payment confirmation and change calculation.
- Historical KHQR data remains readable; new KHQR payment processing is temporarily out of active scope.
- Telegram kitchen display bot.

### Out of Scope (Current Phase)

- Complex inventory tracking (raw material depletion).
- Hardware integrations (receipt printers, cash drawers).
- Credit card or non-QR digital payment processing.
- Offline-first caching and background sync *(Future)*.
- Transaction parking *(Future)*.
- Full multi-customer SaaS administration and `platform_admin` UI/tooling *(Future)*.

## Success Criteria

1. A cashier can process a cash payment with backend-validated totals, received amount, and change.
2. A confirmed order is relayed to the Telegram kitchen channel within 2 seconds of payment.
3. An owner/manager can view a consolidated financial report filtered by stall, cashier, and time window, according to their assigned permissions.
4. A device can only access the menu and staff roster of its registered stall.
