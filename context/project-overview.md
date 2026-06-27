# Toub POS

## Overview

Toub POS is a lightweight POS system built for small merchant teams operating across multiple physical booth locations. It combines smart QR payment verification, real-time cashier-specific notifications, a Telegram-based kitchen display system, multi-stall staff coordination, and automated sales reporting — eliminating payment confusion and kitchen miscommunication during high-traffic sales periods.

## Goals

1. Eliminate manual payment verification bottlenecks for cashiers.
2. Provide real-time payment confirmation routed exclusively to the cashier who generated that QR session.
3. Replace paper kitchen tickets with a real-time Telegram bot kitchen display.
4. Ensure accurate end-of-day sales reporting scoped per stall for owners.
5. Support dual-currency pricing (USD / KHR) for menu items.

## Core User Flow

1. Admin registers a terminal to a specific **stall** (one-time device provisioning).
2. Cashier taps their avatar from the stall's staff roster and enters a 4-digit PIN.
3. Cashier selects items from the stall-scoped menu (other stalls' items are hidden).
4. Cashier optionally adds **order modifiers** (e.g., "no ice", "extra spicy") per item.
5. Cashier selects **Cash** or **KHQR** checkout.
   - Cash: confirmation dialog → order recorded as complete.
   - KHQR: dynamic QR generated → backend webhook detects payment → WebSocket pushes confirmation **only to that cashier's screen**.
6. On payment confirmation, the order payload is forwarded to the **Telegram kitchen bot**, which posts a structured order ticket to the stall's kitchen channel.
7. Cook taps "Done" in Telegram → bot edits the message to mark it complete.
8. Transaction is recorded to the central database under the stall and cashier.

## Features

### Authentication & Device Provisioning

- Sub-path routing: `/admin-portal` (admin) vs `/` (cashier terminal)
- Stall-locked device registration (admin one-time setup)
- Avatar-based staff quick-switching per stall roster
- 4-digit PIN pad for shift unlock

### Cashier Workspace

- Stall-scoped menu (only that stall's items/categories visible)
- Order modifiers per item (notes: "no ice", "extra spicy", etc.)
- Floating order summary with quantity adjustments
- Dual checkout: Cash (green) / KHQR (blue)
- Cash confirmation dialog guardrail
- "Park" transaction for later *(Future)*

### Payment Integration

- Dynamic KHQR generation (Bakong-compliant)
- Backend webhook listener (ABA PayWay / Bakong)
- WebSocket isolated notification routing → specific cashier only

### Kitchen Display (Telegram Bot)

- Real-time order relay to stall's Telegram kitchen channel
- Structured digital order tickets (items, qty, modifiers, stall label)
- Chronological queue by payment timestamp
- Cook taps "Done" → bot edits message state in real time
- Identity-locked: only authorized cook accounts can interact

### Admin & Owner Portal

- Multi-stall management (add stalls, assign staff to stalls)
- Menu management with dual-currency pricing (USD / KHR)
- Stall-scoped menu profile assignment
- Analytical dashboards: Revenue trends, top products, staff performance
- Report filters: Daily / Monthly / Yearly

### Offline Resilience *(Future)*

- Client-side order caching when offline
- Background sync queue on reconnect

## Scope

### In Scope

- Core POS UI for tablet/mobile web browsers.
- Multi-stall architecture with stall-isolated data.
- Real-time WebSocket notification routing (cashier-specific).
- JWT Authentication and RBAC (Cashier / Admin).
- Menu management with dual-currency pricing (USD / KHR).
- Order modifiers/notes per item.
- Service Fee (3%) and Estimated Tax (8%) calculation.
- KHQR payment integration via backend webhook.
- Telegram kitchen display bot.

### Out of Scope (Current Phase)

- Complex inventory tracking (raw material depletion).
- Hardware integrations (receipt printers, cash drawers).
- Credit card or non-QR digital payment processing.
- Offline-first caching and background sync *(Future)*.
- Transaction parking *(Future)*.

## Success Criteria

1. A cashier can process a KHQR payment and receive automated confirmation **on their screen only**, without checking a separate bank app.
2. A confirmed order is relayed to the Telegram kitchen channel within 2 seconds of payment.
3. An admin/owner can view a consolidated financial report filtered by stall, cashier, and time window.
4. A device can only access the menu and staff roster of its registered stall.
