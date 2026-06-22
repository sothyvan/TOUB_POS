-- ============================================================
-- Toub POS — Raw SQL Reference Queries (MySQL Workbench)
-- WARNING: Any modifications to Sequelize repositories or models
-- must also be reflected in this file to maintain 100% database query parity.
-- ============================================================

-- ── 1. USERS / STAFF CRUD (user.repository.js) ──────────────

-- Find user by username (used for Login authentication)
SELECT id, username, password AS password_hash, role, is_active 
FROM users 
WHERE username = 'admin';

-- Find user by ID
SELECT id, username, pin, role, is_active, created_at, updated_at 
FROM users 
WHERE id = 1;

-- List all users (excluding passwords)
SELECT id, username, pin, role, is_active, created_at, updated_at 
FROM users 
ORDER BY created_at DESC;

-- Insert a new user account
INSERT INTO users (username, password, pin, role, is_active) 
VALUES ('cashier1', '$2b$10$hashedpasswordstring...', '1111', 'cashier', TRUE);

-- Update user details by ID
UPDATE users 
SET username = 'cashier1_updated', pin = '2222', role = 'cashier', is_active = TRUE
WHERE id = 2;

-- Delete user account by ID
DELETE FROM users 
WHERE id = 2;


-- ── 2. STALLS CRUD (stall.repository.js) ───────────────────

-- List all stalls
SELECT id, name, device_token, telegram_chat_id, created_at, updated_at 
FROM stalls 
ORDER BY created_at DESC;

-- Find a stall by ID
SELECT id, name, device_token, telegram_chat_id, created_at, updated_at 
FROM stalls 
WHERE id = 1;

-- Create a new stall
INSERT INTO stalls (name, device_token, telegram_chat_id) 
VALUES ('Stall A - Drinks', 'dev_tok_123', 987654321);

-- Update an existing stall by ID
UPDATE stalls 
SET name = 'Stall A - Hot Coffee', device_token = 'dev_tok_456', telegram_chat_id = 987654321
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
SELECT id, name, price_usd, price_khr 
FROM products 
WHERE id = 5;

-- Insert a new Order (status defaults to 'pending')
INSERT INTO orders (stall_id, cashier_id, payment_method, status, total_usd, kitchen_status, telegram_status)
VALUES (1, 2, 'khqr', 'pending', 15.75, 'pending', 'pending');

-- Insert Order Item details (linked to order)
INSERT INTO order_items (order_id, product_id, name, price_usd, price_khr, subtotal_usd, subtotal_khr, quantity, notes)
VALUES (1, 5, 'Latte', 2.50, 10000, 5.00, 20000, 2, 'No sugar');

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


-- ── 6. PAYMENT WEBHOOKS (payment.service.js) ───────────────

-- Lock and read order for confirmation validation (idempotency + amount match check)
SELECT id, status, total_usd, cashier_id 
FROM orders 
WHERE id = 1 
FOR UPDATE;

-- Complete order and store timestamp on successful webhook payment
UPDATE orders 
SET status = 'completed', completed_at = NOW() 
WHERE id = 1;


-- ── 7. DAILY REPORTING (report.controller.js) ─────────────

-- Fetch completed orders within date range (including stall names)
SELECT o.id, o.stall_id, o.payment_method, o.total_usd, o.created_at, s.name AS stall_name
FROM orders o
LEFT JOIN stalls s ON o.stall_id = s.id
WHERE o.status = 'completed' 
  AND o.created_at BETWEEN '2026-06-19 00:00:00' AND '2026-06-19 23:59:59';

