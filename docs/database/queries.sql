-- ============================================================
-- Toub POS — Raw SQL Reference Queries (MySQL Workbench)
-- WARNING: Any modifications to Sequelize repositories or models
-- must also be reflected in this file to maintain 100% database query parity.
-- ============================================================

-- ── 1. USERS / STAFF CRUD (user.repository.js) ──────────────

-- Find platform_admin/owner/manager by username (used for password login authentication)
SELECT id, username, password AS password_hash, role, owner_id, is_active 
FROM users 
WHERE username = 'owner';

-- Find user by ID (excluding password and PIN)
SELECT id, owner_id, username, role, is_active, created_at, updated_at
FROM users 
WHERE id = 1;

-- Find user by ID including PIN hash (PIN login only)
SELECT id, username, role, pin, owner_id, is_active
FROM users
WHERE id = 2;

-- List all users (excluding password and PIN)
SELECT id, owner_id, username, role, is_active, created_at, updated_at
FROM users 
ORDER BY created_at DESC;

-- List all users belonging to a specific owner (excluding password and PIN)
SELECT id, owner_id, username, role, is_active, created_at, updated_at
FROM users 
WHERE owner_id = 1
ORDER BY created_at DESC;

-- List business owner accounts visible to the temporary platform admin
SELECT id, owner_id, username, role, is_active, created_at, updated_at
FROM users
WHERE role = 'owner'
ORDER BY created_at DESC;

-- Insert a new business owner account from platform_admin
INSERT INTO users (username, password, pin, role, owner_id, is_active)
VALUES ('owner_new', '$2b$10$hashedpasswordstring...', NULL, 'owner', NULL, TRUE);

-- Insert a new user account
INSERT INTO users (username, password, pin, role, owner_id, is_active)
VALUES ('manager1', '$2b$10$hashedpasswordstring...', NULL, 'manager', 1, TRUE);

-- Insert a cashier account
INSERT INTO users (username, password, pin, role, owner_id, is_active)
VALUES ('cashier1', NULL, '$2b$10$hashedpinstring...', 'cashier', 1, TRUE);

-- Update owner/manager credentials by ID
UPDATE users
SET username = 'manager1_updated', password = '$2b$10$newhashedpassword...', pin = NULL, role = 'manager', owner_id = 1, is_active = TRUE
WHERE id = 2;

-- Update cashier details/PIN by ID
UPDATE users 
SET username = 'cashier1_updated', password = NULL, pin = '$2b$10$newhashedpinstring...', role = 'cashier', owner_id = 1, is_active = TRUE
WHERE id = 2;

-- Development-only credential storage migration
ALTER TABLE users
MODIFY password VARCHAR(255) DEFAULT NULL;

ALTER TABLE users
MODIFY pin VARCHAR(255) DEFAULT NULL;

-- Allow PIN-only cashier accounts to keep password NULL
ALTER TABLE users
MODIFY password VARCHAR(255) DEFAULT NULL;

-- Delete user account by ID
DELETE FROM users 
WHERE id = 2;


-- ── 2. STALLS CRUD (stall.repository.js) ───────────────────

-- List all stalls
SELECT id, owner_id, name, location, device_token, telegram_chat_id, created_at, updated_at 
FROM stalls 
ORDER BY created_at DESC;

-- List all stalls owned by a specific owner
SELECT id, owner_id, name, location, device_token, telegram_chat_id, created_at, updated_at 
FROM stalls 
WHERE owner_id = 1
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

-- List all global categories
SELECT id, name, tone, created_at, updated_at
FROM categories
ORDER BY created_at DESC;

-- Find a category by ID
SELECT id, name, tone, created_at, updated_at
FROM categories
WHERE id = 1;

-- Create a new category
INSERT INTO categories (name, tone)
VALUES ('Coffee', 'gold');

-- Update an existing category by ID
UPDATE categories 
SET name = 'Iced Coffee', tone = 'rose'
WHERE id = 1;

-- Delete a category by ID
DELETE FROM categories 
WHERE id = 1;


-- ── 4. PRODUCTS CRUD (product.repository.js) ───────────────

-- List all products with global category and stall-specific price/visibility assignments
SELECT p.id, p.category_id, p.name, p.image_url, p.created_at, p.updated_at,
       sp.id AS stall_product_id,
       sp.stall_id,
       sp.price_usd,
       sp.price_khr,
       sp.is_visible,
       s.name AS stall_name,
       s.location AS stall_location,
       c.name AS category_name,
       c.tone AS category_tone
FROM products p
LEFT JOIN stall_products sp ON sp.product_id = p.id
LEFT JOIN stalls s ON sp.stall_id = s.id
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at DESC;

-- List all products assigned to a specific owner's stalls
SELECT p.id, p.category_id, p.name, p.image_url, p.created_at, p.updated_at
FROM products p
INNER JOIN stall_products sp ON sp.product_id = p.id
INNER JOIN stalls s ON sp.stall_id = s.id
WHERE s.owner_id = 1
GROUP BY p.id
ORDER BY p.created_at DESC;

-- List visible products sold by a cashier's assigned stall
SELECT p.id, p.category_id, p.name, p.image_url, p.created_at, p.updated_at,
       sp.id AS stall_product_id,
       sp.stall_id,
       sp.price_usd,
       sp.price_khr,
       sp.is_visible,
       c.name AS category_name,
       c.tone AS category_tone
FROM products p
INNER JOIN stall_products sp ON sp.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE sp.stall_id = 1
  AND sp.is_visible = TRUE
ORDER BY p.created_at DESC;

-- Find a single product by ID with all stall-specific assignments
SELECT p.id, p.category_id, p.name, p.image_url, p.created_at, p.updated_at,
       sp.id AS stall_product_id,
       sp.stall_id,
       sp.price_usd,
       sp.price_khr,
       sp.is_visible,
       s.name AS stall_name,
       s.location AS stall_location,
       c.name AS category_name,
       c.tone AS category_tone
FROM products p
LEFT JOIN stall_products sp ON sp.product_id = p.id
LEFT JOIN stalls s ON sp.stall_id = s.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.id = 1;

-- Create a new product
INSERT INTO products (category_id, name, image_url)
VALUES (1, 'Latte', '/images/latte.png');

-- Assign product to a stall with stall-specific prices and visibility
INSERT INTO stall_products (stall_id, product_id, price_usd, price_khr, is_visible)
VALUES (1, LAST_INSERT_ID(), 2.50, 10000, TRUE);

-- Update a product by ID
UPDATE products 
SET category_id = 1, name = 'Iced Latte', image_url = '/images/iced_latte.png'
WHERE id = 1;

-- Update the product's stall-specific prices and visibility
UPDATE stall_products
SET price_usd = 2.75, price_khr = 11000, is_visible = TRUE
WHERE product_id = 1
  AND stall_id = 1;

-- Replace product stall assignments during management updates
DELETE FROM stall_products
WHERE product_id = 1;

INSERT INTO stall_products (stall_id, product_id, price_usd, price_khr, is_visible)
VALUES
  (1, 1, 2.75, 11000, TRUE),
  (2, 1, 2.75, 11000, TRUE);

-- Delete a product by ID
DELETE FROM products 
WHERE id = 1;


-- ── 5. ORDERS & ITEMS (order.service.js) ───────────────────

-- Resolve stall assigned to a cashier
SELECT id, stall_id, user_id 
FROM stall_staff 
WHERE user_id = 2 
LIMIT 1;

-- Get stall-specific product details for transaction snapshots
SELECT p.id, p.category_id, p.name, sp.stall_id, sp.price_usd, sp.price_khr, sp.is_visible
FROM stall_products sp
INNER JOIN products p ON p.id = sp.product_id
WHERE sp.product_id = 5
  AND sp.stall_id = 1;

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
SET qr_payload = '000201010212...',
    qr_md5 = 'b8fb54c15be1759f0e25770f1737b41c',
    payment_reference = 'TOUB-1-ABC123',
    payment_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
WHERE id = 1;

-- Fetch one order for frontend polling; cashiers must also match cashier_id in service logic
SELECT o.*, i.name AS item_name, i.price_usd, i.quantity
FROM orders o
LEFT JOIN order_items i ON o.id = i.order_id
WHERE o.id = 1;

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


-- ── 6. KHQR PAYMENT CHECKING (order.service.js) ────────────

-- Read a KHQR order before calling Bakong Open API by qr_md5
-- Service logic enforces that only the creating cashier, owner, or manager can check it.
SELECT id, status, payment_method, total_usd, cashier_id, payment_reference, qr_md5, payment_expires_at
FROM orders
WHERE id = 1;

-- After Bakong Open API returns paid by md5/hash, lock the order before marking it paid.
SELECT id, status, payment_method, total_usd, cashier_id, payment_reference, qr_md5, payment_expires_at
FROM orders
WHERE id = 1
FOR UPDATE;

-- Complete KHQR order and store timestamp after Bakong amount/currency validation
UPDATE orders
SET status = 'paid', completed_at = NOW()
WHERE id = 1
  AND payment_method = 'khqr'
  AND status = 'pending_payment';

-- Audit real Bakong status-check confirmation once
INSERT INTO audit_logs (actor_user_id, action, order_id, details)
VALUES (
  2,
  'khqr_payment_confirmed',
  1,
  JSON_OBJECT('payment_reference', 'TOUB-1-ABC123', 'qr_md5', 'b8fb54c15be1759f0e25770f1737b41c', 'amount', 15.75, 'currency', 'USD', 'source', 'bakong_status_check')
);

-- ── 6b. FUTURE TELEGRAM TICKETS ───────────────────────────

-- Mark a kitchen ticket sent once Telegram returns a message ID
UPDATE telegram_tickets
SET status = 'sent', telegram_msg_id = 123456789, sent_at = NOW()
WHERE id = 1;

-- Mark a kitchen ticket done from an authorized Telegram callback
UPDATE telegram_tickets
SET status = 'done', completed_at = NOW()
WHERE id = 1;


-- ── 7. DAILY REPORTING (report.controller.js) ─────────────

-- Fetch paid orders within date range (including stall names) for a specific owner
SELECT o.id, o.stall_id, o.payment_method, o.total_usd, o.created_at, s.name AS stall_name
FROM orders o
LEFT JOIN stalls s ON o.stall_id = s.id
WHERE o.status = 'paid'
  AND s.owner_id = 1
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

-- Development-only product/category ERD migration used before Sequelize sync
INSERT INTO categories (name, tone)
SELECT 'Uncategorized', 'gold'
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

ALTER TABLE products
ADD COLUMN category_id INT NULL;

UPDATE products p
LEFT JOIN categories c ON c.id = p.category_id
SET p.category_id = (SELECT id FROM categories ORDER BY id ASC LIMIT 1)
WHERE p.category_id IS NULL
   OR c.id IS NULL;

ALTER TABLE products
MODIFY category_id INT NOT NULL;

-- Development-only duplicate unique-index cleanup for repeated Sequelize alter sync
SELECT INDEX_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'stalls'
  AND COLUMN_NAME = 'device_token'
  AND NON_UNIQUE = 0
  AND INDEX_NAME <> 'PRIMARY';

ALTER TABLE stalls
DROP INDEX device_token_2;
-- Development-only Phase 5 KHQR metadata migration
ALTER TABLE orders
ADD COLUMN qr_md5 VARCHAR(64) DEFAULT NULL AFTER qr_payload,
ADD COLUMN payment_reference VARCHAR(100) DEFAULT NULL UNIQUE AFTER qr_md5,
ADD COLUMN payment_expires_at DATETIME DEFAULT NULL AFTER payment_reference;

ALTER TABLE audit_logs
MODIFY action ENUM('order_created', 'cash_payment_confirmed', 'khqr_payment_confirmed', 'order_cancelled') NOT NULL;
