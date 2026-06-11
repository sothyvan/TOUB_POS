# Toub POS

## Overview

Toub POS is a lightweight POS system designed for small merchant teams that combines smart QR payment verification, real-time cashier-specific notifications, multi-cashier coordination, and automatic sales reporting to reduce payment confusion during busy sales periods.

## Goals

1. Eliminate manual payment verification bottlenecks for cashiers.
2. Provide real-time payment confirmation directly to the specific cashier's device.
3. Ensure accurate end-of-day sales reporting for booth managers.

## Core User Flow

1. Cashier logs into their assigned device/account.
2. Cashier selects items or inputs the order total, and the system generates a dynamic QR code.
3. Customer scans the QR code and transfers the payment.
4. The system's real-time listener detects the payment and pushes an instant notification to the specific cashier.
5. The system automatically records the transaction to the central sales history.

## Features

### Payment Verification

- Dynamic QR Generation
- Real-Time Payment Listener
- Auto-confirmation UI/Audio feedback

### Multi-Cashier Coordination

- Device/Cashier assignment
- Cashier-specific notification routing

### Management & Reporting

- Central sales history database
- Daily summary report generation

## Scope

### In Scope

- Core POS UI for tablet/mobile web browsers.
- Real-time notification system (WebSockets/Polling).
- JWT Authentication and Role management (Cashier vs. Manager).
- Basic product/preset item management.
- Service Fee (3%) and Estimated Tax (8%) calculation on orders.

### Out of Scope

- Complex inventory tracking (e.g., raw material depletion).
- Hardware integrations (e.g., physical receipt printers, cash drawers).
- Credit card or non-QR digital payment processing.

## Success Criteria

1. A cashier can process a QR payment and receive automated confirmation without checking a separate bank app.
2. A manager can view a consolidated report of all transactions tied to specific cashiers.
