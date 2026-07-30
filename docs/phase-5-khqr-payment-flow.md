# Phase 5 KHQR Individual Payment Flow

> **Current status:** Phase 5 records what was implemented and tested. The integration is now suspended behind disabled-by-default backend and frontend feature flags pending an approved merchant payment solution.

## 1. Goal

Phase 5 makes KHQR checkout backend-owned and production Bakong-backed.

The browser does not decide prices, totals, payment status, cashier ID, or stall ID. The backend calculates the order total, creates a `pending_payment` order, generates an Individual KHQR payload, and checks Bakong Open API by QR md5/hash before marking the order as `paid`.

## 2. Why Individual KHQR

TouB POS uses **Generate KHQR (Individual)**.

Reason:

- Individual KHQR can use an owner/stall Bakong account ID.
- It fits the current project scope while still using real Bakong status checking.
- Backend-owned payment status prevents the frontend from faking paid orders.

## 3. Environment Variables

Add these to `backend/.env`:

```env
BAKONG_ACCOUNT_ID=owner_or_stall_account@bakong
KHQR_MERCHANT_NAME=Toub POS
KHQR_MERCHANT_CITY=PHNOM PENH
KHQR_EXPIRATION_MINUTES=10

# Testing/SIT: https://sit-api-bakong.nbc.org.kh
# Production:  https://api-bakong.nbc.gov.kh
BAKONG_OPEN_API_BASE_URL=https://api-bakong.nbc.gov.kh
BAKONG_OPEN_API_TOKEN=replace_with_bakong_open_api_token
```

Important:

- `BAKONG_OPEN_API_TOKEN` belongs only to the backend.
- The frontend must never receive or store the Bakong token.
- `BAKONG_ACCOUNT_ID` must match the receiving account used in the generated QR.

## 4. Backend Order Flow

1. Cashier sends `POST /api/orders` with `paymentMethod: "KHQR"` and item data only.
2. Backend derives cashier ID from JWT.
3. Backend derives stall ID from the cashier's assignment.
4. Backend loads product prices from MySQL.
5. Backend validates product visibility, stall scope, and quantity.
6. Backend creates the order as `pending_payment`.
7. Backend generates Individual KHQR data using `bakong-khqr`.
8. Backend stores:
   - `qr_payload`
   - `qr_md5`
   - `payment_reference`
   - `payment_expires_at`
9. Backend returns the order and QR data to the frontend.

## 5. Bakong Status Check

Frontend polling calls:

```http
POST /api/orders/:id/check-khqr-status
```

This route is protected by JWT. It can be triggered by:

- the cashier who created the order
- owner
- manager

The backend calls:

```http
POST {BAKONG_OPEN_API_BASE_URL}/v1/check_transaction_by_md5
Authorization: Bearer <BAKONG_OPEN_API_TOKEN>
Content-Type: application/json
```

With body:

```json
{
  "md5": "<order.qr_md5>"
}
```

If Bakong reports payment success, the backend validates amount and currency before marking the order as `paid`.

## 6. Frontend Flow

1. Cashier chooses KHQR checkout.
2. Frontend calls `POST /api/orders`.
3. Frontend displays QR from backend `qr_payload`.
4. Modal shows:
   - order number
   - amount
   - status
   - payment reference
   - QR md5
   - expiry time
5. Frontend polls `POST /api/orders/:id/check-khqr-status` every 2.5 seconds while the modal is open.
6. If backend status becomes `paid`, the modal closes and the receipt opens.
7. If order is cancelled or modal closes, polling stops.
8. The backend background checker can still detect payment for unexpired pending KHQR orders after the modal closes.

Frontend does not have a "mark paid" button for KHQR.

## 7. Manual API Test

1. Log in as cashier and copy the JWT.
2. Create a KHQR order:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <cashier_jwt>" \
  -H "Content-Type: application/json" \
  -d "{\"paymentMethod\":\"KHQR\",\"items\":[{\"product_id\":1,\"quantity\":1}]}"
```

3. Confirm response contains:
   - `status: "pending_payment"`
   - `qr_payload`
   - `qr_md5`
   - `payment_reference`

4. Pay by scanning the QR before expiry.
5. Check status:

```bash
curl -X POST http://localhost:3000/api/orders/<order_id>/check-khqr-status \
  -H "Authorization: Bearer <cashier_jwt>"
```

Expected after Bakong finds the transaction:

- `paymentStatus: "paid"`
- order status becomes `paid`
- `completed_at` is set
- one `khqr_payment_confirmed` audit log is created
- the creating cashier receives a Socket.IO `payment_confirmed` event if their cashier screen is connected
- the paid order is dispatched to the stall's Telegram kitchen chat

## 8. Remaining Work

- Add payment monitoring and operational alerting.
- Strengthen Telegram cook identity/authorization before production.
