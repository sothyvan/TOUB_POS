# ToubPOS — Backend Completion Roadmap (Sprint Plan)

> **Payment update:** Completed KHQR milestones below are retained as implementation history. KHQR is currently disabled by default while the team evaluates an approved merchant payment provider; cash remains active.

**Stack confirmed from your code:** Node.js + Express, Sequelize (MySQL), JWT auth, Controller→Service→Repository pattern.

**Team:** Thang Saoly, Taing Sothyvan, Tiek Chhunhour — "Group 9: The Small Three".

---

## 1. Audit — What's Already Done vs. What's Missing

### ✅ Already solid (Completed & Pushed)
| Area | Files | Notes |
|---|---|---|
| Express app skeleton | `src/app.js`, `src/index.js` | Boots, auto-creates DB, seeds default admin |
| Sequelize models | `src/models/*.js` | User, Stall, StallStaff, Category, Product, Order, OrderItem, TelegramSession |
| Auth (login) | `auth.controller.js`, `auth.service.js` | bcrypt + JWT, fully working |
| JWT middleware | `middleware/auth.middleware.js` | `authenticate` + `authorize(...roles)` |
| Product & Category CRUD | `product.*`, `category.*` | Fully implemented (Sequelize) |
| Stall & User CRUD | `stall.*`, `user.*` | Fully implemented |
| Error & Logging | `middleware/error.middleware.js`, `logger.middleware.js` | Standard `{success, message}` shape |
| **Orders** | `order.controller.js`, `order.service.js` | **Completed:** DB transactions, validation, insert items |
| **Reports** | `report.controller.js`, `report.service.js` | **Completed:** Sales statistics, daily revenue summaries |
| **KHQR status verification** | `services/orders/khqr-payment.service.js`, `startup/khqr-background-checker.js` | **Completed:** Bakong MD5 checking, row-lock idempotency, trusted paid transition |
| Swagger Docs | `src/config/swagger.js` | **Completed:** API documentation |

### 🔴 Stubbed / not implemented at all
| Area | Files | Current state |
|---|---|---|
| Stall ↔ Staff assignment | — | Model `StallStaff` exists, but **no repository/controller/route** to assign a cashier to a stall |
| Telegram kitchen bot | — | **No `telegram.service.js` exists at all** |
| WebSocket service | — | **No `websocket.service.js` exists at all** |
| KHQR payment generation | — | No QR generation logic anywhere |
| Device provisioning | — | No endpoint to register/revoke a stall's device token, and **no middleware enforces stall isolation** |
| Server-side PIN login | — | PIN is still validated **client-side only** |

### 🐛 Bugs found in current code
1. **`user.routes.js` RBAC bug:** `router.use(authenticate, authorize(['admin', 'manager']))` passes an *array* into `authorize(...roles)`. Fix this to `authorize('admin', 'manager')`.
3. **CORS wide open** (`app.use(cors())`) — fine for dev, must be restricted before production.
4. **Seed admin password is a placeholder string** in `schema.sql`. Delete the fake one.
5. **Database synchronization invariant:** Any changes to Sequelize models must be ported back to `docs/database/schema.sql` and `queries.sql`.

---

## 2. Day 0 — Setup (≈1 hour)
- [ ] Fix bug #1 — in `user.routes.js`, change `authorize(['admin', 'manager'])` → `authorize('admin', 'manager')`.
- [ ] Install new packages: `npm install socket.io bakong-khqr qrcode express-rate-limit express-validator uuid`
- [ ] Set up Bakong Developer Sandbox credentials for KHQR generation.

---

## 3. Week 1 — Core Domain: Staff-to-Stall, Device Isolation, Auth

**Goal by end of week:** Admins can assign staff to stalls, provision terminals, and cashiers can log in securely using the backend.

### 3.1 Stall ↔ Staff Assignment
New files:
- **`src/repositories/stall-staff.repository.js`**: `assignStaffToStall`, `unassignStaffFromStall`, `findRosterByStallId`.
- **`src/controllers/stall-staff.controller.js`**: `getRoster`, `assignStaff`, `unassignStaff`.
- Add routes inside `stall.routes.js`:
  ```js
  router.get('/:id/staff', getRoster);              // used by cashier login screen
  router.post('/:id/staff', assignStaff);            // body: { user_id }
  router.delete('/:id/staff/:userId', unassignStaff);
  ```

### 3.2 Device Provisioning & Stall Data Isolation

New file: **`src/middleware/device.middleware.js`**

```js
import { Stall } from '../models/index.js';

export async function resolveDevice(req, res, next) {
  try {
    const deviceToken = req.headers['x-device-token'];
    if (!deviceToken) {
      return res.status(401).json({ success: false, message: 'Missing X-Device-Token header' });
    }

    const stall = await Stall.findOne({ where: { device_token: deviceToken } });
    if (!stall) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked device token' });
    }

    req.stall = { id: stall.id, name: stall.name };
    next();
  } catch (err) {
    next(err);
  }
}
```

Extend `stall.controller.js` & `stall.routes.js`:
- `POST /api/stalls/:id/register` → generates UUID for `device_token` and saves it. Returns `{ deviceToken, stall }`.
```js
import { v4 as uuidv4 } from 'uuid';

export async function registerDevice(req, res, next) {
  const stall = await Stall.findByPk(req.params.id);
  if (!stall) return res.status(404).json({ success: false, message: 'Stall not found' });
  
  const token = uuidv4();
  await stall.update({ device_token: token });
  res.json({ success: true, data: { deviceToken: token, stall: { id: stall.id, name: stall.name } } });
}
```
- `POST /api/stalls/:id/revoke` → sets `device_token = NULL`.

**Apply isolation:**
- Update `product.repository.findAllProducts()` and `category.repository.findAllCategories()` to optionally filter `WHERE stall_id = :stallId`.
- Update `product.routes.js` / `category.routes.js` GET endpoints to support dual access (Admin gets all, Device gets stall-scoped).
- Add `GET /api/users/roster` (Device-authenticated) to return active staff associated with the current stall.

### 3.3 Server-Side PIN Login
New endpoint in `auth.controller.js` / `auth.service.js`:
- `POST /api/auth/pin-login`
- Body: `{ userId, pin }`
- **Validation**: Per `implementation_plan.md`, validate using plaintext comparison for simplicity (no bcrypt hashing for PINs).
```js
export async function pinLogin(req, res, next) {
  const { userId, pin } = req.body;
  const user = await User.findByPk(userId);
  
  // Must exist, be active, be a cashier/manager, and pin must match exactly
  if (!user || !user.is_active || !['cashier', 'manager'].includes(user.role) || user.pin !== pin) {
    return res.status(401).json({ success: false, message: 'Invalid PIN or unauthorized role' });
  }
  
  // Generate JWT scoped to the device's stall if coming from a registered device
  const token = generateToken({ id: user.id, role: user.role, stallId: req.stall?.id });
  res.json({ success: true, data: { token, user: { id: user.id, role: user.role } } });
}
```

---

## 4. Week 2 — Real-Time Payments & Kitchen Bot

**Goal by end of week:** KHQR payments generate a real QR, confirmation reaches the cashier's browser via WebSocket, and the order is relayed to the Telegram kitchen channel.

### 4.1 KHQR Generation
New file: **`src/services/khqr.service.js`**
```js
import { BakongKHQR, khqrData, IndividualInfo } from 'bakong-khqr';

export function generateKhqrPayload(amountUsd, billNumber) {
  const individualInfo = new IndividualInfo(
    process.env.BAKONG_ACCOUNT_ID, 
    process.env.MERCHANT_NAME, 
    process.env.MERCHANT_CITY
  );
  
  const khqr = new khqrData();
  const result = BakongKHQR.generateIndividual(individualInfo, khqr, { 
    amount: amountUsd, 
    currency: 'USD', 
    billNumber 
  });
  
  return { qr: result.data.qr, md5: result.data.md5 };
}
```
Wire into existing `order.service.createOrder()` for the `khqr` branch.

### 4.2 WebSocket Service (cashier-isolated push)
New file: **`src/services/websocket.service.js`**
```js
import { Server } from 'socket.io';

const cashierSockets = new Map();

export function initWebSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN } });
  
  io.on('connection', (socket) => {
    socket.on('register', (cashierId) => {
      cashierSockets.set(cashierId, socket.id);
    });
    socket.on('disconnect', () => {
      // Logic to remove disconnected sockets from cashierSockets
    });
  });
}

export function emitPaymentConfirmed(cashierId, orderId) {
  const socketId = cashierSockets.get(cashierId);
  if (socketId) {
    io.to(socketId).emit('payment_confirmed', { orderId });
  }
}
```
- Wire `initWebSocket` into `index.js` `http.createServer`.
- `emitPaymentConfirmed` is called by `khqr-payment.service.js` after Bakong verification succeeds.

### 4.3 Telegram Kitchen Bot
New file: **`src/services/telegram.service.js`**
```js
const BOT_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendOrderTicket(stallChatId, order) {
  const text = `🍽 **New Order #${order.id}**\nTotal: $${order.total_usd}`;
  // ... format items logic
  
  const payload = {
    chat_id: stallChatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[ { text: "✅ Mark Done", callback_data: `done_${order.id}` } ]]
    }
  };
  
  const res = await fetch(`${BOT_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
```
- `handleCallback(callbackQuery)` to mark ticket "✅ Done".
- Telegram callback endpoint: `POST /api/telegram/callback` in `telegram.routes.js`.

### 4.4 TelegramSession Management
New: `src/repositories/telegram-session.repository.js` + minimal controller/routes under `/api/stalls/:id/telegram-sessions` for cooks identity locking.

---

## 5. Week 3 — Security Hardening & Deployment

### 5.1 Security Middleware & Hardening
- **CORS Lockdown:**
  ```js
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  ```
- **Rate Limiting:** Protect authentication routes from brute force attacks.
  ```js
  import rateLimit from 'express-rate-limit';
  
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login requests per windowMs
    message: { success: false, message: 'Too many login attempts, please try again later.' }
  });
  
  router.post('/login', loginLimiter, login);
  router.post('/pin-login', loginLimiter, resolveDevice, pinLogin);
  ```
- **Input Validation:** Use `express-validator` to enforce rules on incoming bodies (e.g., `order_items.notes`).
  ```js
  import { body, validationResult } from 'express-validator';
  
  router.post('/orders', [
    body('payment_method').isIn(['cash', 'khqr']),
    body('items.*.notes').optional().isLength({ max: 200 }).trim().escape(),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      next();
    }
  ], createOrder);
  ```

### 5.2 Deployment Prep
- [ ] Test deployment (Railway/Render) with `NODE_ENV=production`. Ensure `sequelize.sync({ alter: true })` is **disabled** in production to prevent accidental schema changes.
- [ ] Validate Swagger docs against final API endpoints.

---

## 6. Suggested Task Split (Updated)
| Person | Primary backend ownership |
|---|---|
| **Tiek Chhunhour** (Auth & Device) | §3.2 Device provisioning + isolation middleware, §3.3 server-side PIN login, §5 security hardening |
| **Thang Saoly** (Cashier & KHQR) | §4.1 KHQR generation (integration with existing orders) |
| **Taing Sothyvan** (Kitchen Bot) | §4.2 WebSocket service, §4.3/§4.4 Telegram bot + session management |
*(Orders and Reports are already completed!)*

---

## 7. Full Target Endpoint Reference (Updated)
| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/health` | No | ✅ done |
| POST | `/api/auth/login` | No | ✅ done |
| POST | `/api/auth/pin-login` | Device token | 🔴 Week 1 |
| GET/POST/PUT/DELETE | `/api/users` | JWT | ✅ done (fix bug #1) |
| GET | `/api/users/roster` | Device token | 🔴 Week 1 |
| GET/POST/PUT/DELETE | `/api/stalls` | JWT | ✅ done |
| GET/POST/DELETE | `/api/stalls/:id/staff` | JWT | 🔴 Week 1 |
| POST | `/api/stalls/:id/register` | JWT | 🔴 Week 1 |
| POST | `/api/stalls/:id/revoke` | JWT | 🔴 Week 1 |
| GET/POST/PUT/DELETE | `/api/categories` | JWT | ✅ done |
| GET/POST/PUT/DELETE | `/api/products` | JWT + device token | ✅ done, 🔴 add stall scoping |
| POST | `/api/orders` | JWT | ✅ done |
| GET | `/api/orders/mine` | JWT | ✅ done |
| GET | `/api/orders/:id` | JWT | ✅ done |
| PATCH | `/api/orders/:id/cancel` | JWT | ✅ done |
| POST | `/api/orders/:id/check-khqr-status` | JWT | ✅ done |
| POST | `/api/telegram/callback` | Telegram secret header | ✅ done |
| GET | `/api/reports/daily` | JWT | ✅ done |
| GET | `/api/reports/trend` | JWT | ✅ done |
| GET | `/api/reports/top-products` | JWT | ✅ done |
| GET | `/api/reports/staff-performance` | JWT | ✅ done |
