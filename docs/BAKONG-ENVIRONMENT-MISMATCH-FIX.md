# BAKONG Environment Mismatch - Root Cause & Fix

## 🔴 Critical Issue Identified

Your POS system is experiencing **real money deductions with pending payments** because:

### Root Cause

The BAKONG configuration has a **production ↔ staging mismatch**:

| Component                | Current Config                                               | Environment     | Problem                                        |
| ------------------------ | ------------------------------------------------------------ | --------------- | ---------------------------------------------- |
| **QR Generation**        | `BAKONG_ACCOUNT_ID=sothyvan_taing@bkrt`                      | **PRODUCTION**  | Generates QR pointing to real merchant account |
| **Payment Verification** | `BAKONG_OPEN_API_BASE_URL=https://sit-api-bakong.nbc.org.kh` | **SIT/STAGING** | Checks for transaction in test environment     |
| **Result**               | Money deducted from real accounts                            | ❌ Mismatch     | Backend never finds payment → stays pending    |

### What Happens on Each Transaction

```
1. Customer scans QR code
   ↓
2. QR points to: sothyvan_taing@bkrt (PRODUCTION account)
   ↓
3. Payment SUCCEEDS in production system
   ↓
4. Real money withdrawn from customer's account ✓
   ↓
5. Backend checks SIT environment for transaction
   ↓
6. Transaction NOT found in SIT (it's in PRODUCTION)
   ↓
7. Payment marked as PENDING (never confirmed) ✗
```

---

## ✅ Solution: Use Matching Credentials

### Step 1: Obtain SIT Test Credentials from NBC Bakong

Contact NBC Bakong support and request:

- **SIT test merchant account** (format: `test_account@bkrt` or similar)
- **SIT API Bearer token**
- Confirm both are for the **SIT environment**, NOT production

### Step 2: Update `.env` Configuration

**Current (Broken):**

```env
# Production merchant account
BAKONG_ACCOUNT_ID=sothyvan_taing@bkrt

# Staging verification
BAKONG_OPEN_API_BASE_URL=https://sit-api-bakong.nbc.org.kh
BAKONG_OPEN_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Fixed (Test Environment):**

```env
# SIT test merchant account (matching SIT environment)
BAKONG_ACCOUNT_ID=YOUR_SIT_TEST_ACCOUNT@bkrt

# SIT verification endpoint
BAKONG_OPEN_API_BASE_URL=https://sit-api-bakong.nbc.org.kh
BAKONG_OPEN_API_TOKEN=YOUR_SIT_API_TOKEN
```

### Step 3: Verify Both Credentials Are for SIT

Before and after updating, confirm:

```
SIT Environment Check:
├─ BAKONG_ACCOUNT_ID = Test account (starts with "test_" or similar)
├─ BAKONG_OPEN_API_BASE_URL = https://sit-api-bakong.nbc.org.kh ✓
├─ BAKONG_OPEN_API_TOKEN = SIT token (not production)
└─ Result: QR points to test merchant → test transactions ✓
```

### Step 4: Restart Backend & Test

```bash
# 1. Update .env with test credentials
# 2. Restart the backend server
npm restart

# 3. Test with a small transaction
# - Generate KHQR QR code
# - Scan with Bakong app
# - Payment should complete and show as "paid" immediately
```

---

## 📋 Future: Production Deployment Checklist

When deploying to production, **swap credentials only**:

```env
# Production merchant account
BAKONG_ACCOUNT_ID=sothyvan_taing@bkrt

# Production verification endpoint
BAKONG_OPEN_API_BASE_URL=https://api-bakong.nbc.gov.kh
BAKONG_OPEN_API_TOKEN=YOUR_PRODUCTION_API_TOKEN
```

**Important**:

- Change BOTH the account ID AND the API base URL and token
- Never use production account with SIT endpoint (or vice versa)
- Keep a `.env.example` with placeholder values for team reference

---

## 🔍 How to Verify the Fix

After updating credentials, check:

1. **New QR generated** points to your test account
2. **Backend logs** show `BAKONG_OPEN_API_BASE_URL = https://sit-api-bakong.nbc.org.kh`
3. **Test payment** completes and shows immediately as "paid" (not pending)
4. **No real money** deducted from test transactions

---

## 📞 Support & Escalation

If after fixing credentials you still see:

- ❌ Payments deducted but pending
- ❌ Backend config shows correct values but transactions fail
- ❌ API token expired errors

**Check**:

1. Backend logs for `BAKONG_OPEN_API_TOKEN` is valid (hasn't expired)
2. Test merchant account is active and not rate-limited
3. `KHQR_EXPIRATION_MINUTES` isn't too short (recommend ≥5 minutes)

---

## 🛠️ Files Modified

- `.env` — Updated `BAKONG_ACCOUNT_ID`, `BAKONG_OPEN_API_TOKEN`
- No code changes required (environment-driven)
