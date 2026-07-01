-- ============================================================
-- Toub POS — Raw SQL Reference Queries (MySQL Workbench)
-- WARNING: Any modifications to Sequelize repositories or models
-- must also be reflected in this file to maintain 100% database query parity.
-- ============================================================

-- ── 1. USERS / STAFF CRUD (user.repository.js) ──────────────

-- Find owner/manager by username (used for password login authentication)
SELECT id, username, password AS password_hash, role, is_active 
FROM users 
WHERE username = 'owner';

-- Find user by ID (excluding password and PIN)
SELECT id, username, role, is_active, created_at, updated_at
FROM users 
WHERE id = 1;

-- Find user by ID including PIN hash (PIN login only)
SELECT id, username, role, pin, is_active
FROM users
WHERE id = 2;

-- List all users (excluding password and PIN)
SELECT id, username, role, is_active, created_at, updated_at
FROM users 
ORDER BY created_at DESC;

-- Insert a new user account
INSERT INTO users (username, password, pin, role, is_active)
VALUES ('manager1', '$2b$10$hashedpasswordstring...', NULL, 'manager', TRUE);

-- Insert a cashier account
INSERT INTO users (username, password, pin, role, is_active)
VALUES ('cashier1', NULL, '$2b$10$hashedpinstring...', 'cashier', TRUE);

-- Update owner/manager credentials by ID
UPDATE users
SET username = 'manager1_updated', password = '$2b$10$newhashedpassword...', pin = NULL, role = 'manager', is_active = TRUE
WHERE id = 2;

-- Update cashier details/PIN by ID
UPDATE users 
SET username = 'cashier1_updated', password = NULL, pin = '$2b$10$newhashedpinstring...', role = 'cashier', is_active = TRUE
WHERE id = 2;

-- Development-only credential storage migration
ALTER TABLE users
MODIFY password VARCHAR(255) DEFAULT NULL;

ALTER TABLE users
MODIFY pin VARCHAR(255) DEFAULT NULL;

-- Development-only legacy RBAC migration used before Sequelize sync
ALTER TABLE users
MODIFY role ENUM('admin', 'owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier';

UPDATE users
SET role = 'owner'
WHERE role = 'admin';

ALTER TABLE users
MODIFY role ENUM('owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier';

-- Delete user account by ID
DELETE FROM users 
WHERE id = 2;


-- ── 2. STALLS CRUD (stall.repository.js) ───────────────────

-- List all stalls
SELECT id, owner_id, name, location, device_token, telegram_chat_id, created_at, updated_at 
FROM stalls 
ORDER BY created_at DESC;

-- Find a stall by ID
SELECT id, owner_id, name, location, device_token, telegram_chat_id, created_at, updated_at 
FROM stalls 
WHERE id = 1;

-- Create a new stall
INSERT INTO stalls (owner_id, name, location, device_token, telegram_chat_id) 
VALUES (1, 'Stall A - Drinks', 'AEON Mall', 'dev_tok_123', 987654321);

-- Update an existing stall by ID
UPDATE stalls 
SET owner_id = 1, name = 'Stall A - Hot Coffee', location = 'Night Market', device_token = 'dev_tok_456', telegram_chat_id = 987654321
WHERE id = 1;

-- Delete a stall by ID
DELETE FROM stalls 
WHERE id = 1;


-- ── 3. CATEGORIES CRUD (category.repository.js) ────────────

-- List all categories (with associated stall details)
SELECT c.id, c.name, c.tone, c.stall_id, c.created_at, c.updated_at, s.name AS stall_name 
FROM categories c
LEFT JOIN stalls s ON c.stall_id = s.id
ORDER BY c.created_at DESC;

-- Find a category by ID (with associated stall details)
SELECT c.id, c.name, c.tone, c.stall_id, c.created_at, c.updated_at, s.name AS stall_name 
FROM categories c
LEFT JOIN stalls s ON c.stall_id = s.id
WHERE c.id = 1;

-- Create a new category
INSERT INTO categories (name, tone, stall_id) 
VALUES ('Coffee', 'gold', 1);

-- Update an existing category by ID
UPDATE categories 
SET name = 'Iced Coffee', tone = 'rose', stall_id = 1 
WHERE id = 1;

-- Delete a category by ID
DELETE FROM categories 
WHERE id = 1;


-- ── 4. PRODUCTS CRUD (product.repository.js) ───────────────

-- List all products (with category tone/name details)
SELECT p.id, p.name, p.price_usd, p.price_khr, p.image_url, p.is_visible, p.stall_id, p.category_id, p.created_at, p.updated_at, 
       c.name AS category_name, c.tone AS category_tone
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at DESC;

-- Find a single product by ID (with category details)
SELECT p.id, p.name, p.price_usd, p.price_khr, p.image_url, p.is_visible, p.stall_id, p.category_id, p.created_at, p.updated_at, 
       c.name AS category_name, c.tone AS category_tone
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.id = 1;

-- Create a new product
INSERT INTO products (name, price_usd, price_khr, image_url, is_visible, stall_id, category_id) 
VALUES ('Latte', 2.50, 10000, '/images/latte.png', TRUE, 1, 1);

-- Update a product by ID
UPDATE products 
SET name = 'Iced Latte', price_usd = 2.75, price_khr = 11000, image_url = '/images/iced_latte.png', is_visible = TRUE, stall_id = 1, category_id = 1
WHERE id = 1;

-- Delete a product by ID
DELETE FROM products 
WHERE id = 1;


-- ── 5. ORDERS & ITEMS (order.service.js) ───────────────────

-- Resolve stall assigned to a cashier
SELECT id, stall_id, user_id 
FROM stall_staff 
WHERE user_id = 2 
LIMIT 1;

-- Get product details for transaction snapshots
SELECT id, stall_id, name, price_usd, price_khr, is_visible
FROM products
WHERE id = 5;

-- Insert a new Order (status defaults to 'pending_payment')
INSERT INTO orders (stall_id, cashier_id, payment_method, status, subtotal_usd, total_usd)
VALUES (1, 2, 'cash', 'pending_payment', 15.75, 15.75);

-- Insert Order Item details (linked to order)
INSERT INTO order_items (order_id, product_id, name, price_usd, price_khr, line_total_usd, line_total_khr, quantity, notes)
VALUES (1, 5, 'Latte', 2.50, 10000, 5.00, 20000, 2, 'No sugar');

-- Audit order creation
INSERT INTO audit_logs (actor_user_id, action, order_id, details)
VALUES (2, 'order_created', 1, JSON_OBJECT('payment_method', 'cash', 'stall_id', 1, 'total_usd', 15.75));

-- Confirm a cash order after physical cash is received
UPDATE orders
SET status = 'paid', completed_at = NOW()
WHERE id = 1
  AND payment_method = 'cash'
  AND status = 'pending_payment';

-- Audit cash confirmation
INSERT INTO audit_logs (actor_user_id, action, order_id, details)
VALUES (2, 'cash_payment_confirmed', 1, JSON_OBJECT('confirmed_by_role', 'cashier', 'total_usd', 15.75));

-- Set KHQR payload after generating order
UPDATE orders 
SET qr_payload = 'MOCK_KHQR_ORDER_1_AMOUNT_15.75' 
WHERE id = 1;

-- Fetch all orders created by a specific cashier (with details)
SELECT o.*, i.name AS item_name, i.price_usd, i.quantity 
FROM orders o
LEFT JOIN order_items i ON o.id = i.order_id
WHERE o.cashier_id = 2
ORDER BY o.created_at DESC;

-- Fetch Telegram tickets for an order
SELECT id, order_id, telegram_msg_id, telegram_chat_id, status, sent_at, completed_at
FROM telegram_tickets
WHERE order_id = 1
ORDER BY id DESC;


-- ── 6. PAYMENT WEBHOOKS (payment.service.js) ───────────────

-- Lock and read order for confirmation validation (idempotency + amount match check)
SELECT id, status, total_usd, cashier_id 
FROM orders 
WHERE id = 1 
FOR UPDATE;

-- Complete order and store timestamp on successful webhook payment
UPDATE orders
SET status = 'paid', completed_at = NOW()
WHERE id = 1;

-- Queue a Telegram ticket after payment confirmation
INSERT INTO telegram_tickets (order_id, telegram_chat_id, status)
SELECT 1, s.telegram_chat_id, 'pending'
FROM orders o
LEFT JOIN stalls s ON o.stall_id = s.id
WHERE o.id = 1;

-- Mark a kitchen ticket sent once Telegram returns a message ID
UPDATE telegram_tickets
SET status = 'sent', telegram_msg_id = 123456789, sent_at = NOW()
WHERE id = 1;

-- Mark a kitchen ticket done from an authorized Telegram callback
UPDATE telegram_tickets
SET status = 'done', completed_at = NOW()
WHERE id = 1;


-- ── 7. DAILY REPORTING (report.controller.js) ─────────────

-- Fetch paid orders within date range (including stall names)
SELECT o.id, o.stall_id, o.payment_method, o.total_usd, o.created_at, s.name AS stall_name
FROM orders o
LEFT JOIN stalls s ON o.stall_id = s.id
WHERE o.status = 'paid'
  AND o.created_at BETWEEN '2026-06-19 00:00:00' AND '2026-06-19 23:59:59';

-- Development-only legacy order status migration used before Sequelize sync
ALTER TABLE orders
MODIFY status ENUM('pending', 'completed', 'pending_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending';

UPDATE orders
SET status = 'pending_payment'
WHERE status = 'pending';

UPDATE orders
SET status = 'paid'
WHERE status = 'completed';

ALTER TABLE orders
MODIFY status ENUM('pending_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending_payment';

