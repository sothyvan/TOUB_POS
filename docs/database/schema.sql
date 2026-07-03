-- ============================================================
-- Toub POS — Canonical MySQL Schema
-- WARNING: Any modifications to Sequelize models must also
-- be reflected in this file to maintain 100% database schema parity.
-- ============================================================

CREATE DATABASE IF NOT EXISTS toub_pos;
USE toub_pos;

-- ── Users / Staff ─────────────────────────────────────────
-- Credential rules:
--   owner/manager: password stores bcrypt hash, pin must be NULL
--   cashier: password must be NULL, pin stores bcrypt hash of 4-digit PIN
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) DEFAULT NULL,                -- bcrypt hash for owner/manager login
  pin        VARCHAR(255) DEFAULT NULL,                -- bcrypt hash for cashier PIN login
  role       ENUM('owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Stalls (Physical Booth Locations) ─────────────────────
CREATE TABLE stalls (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT DEFAULT NULL,                    -- business owner responsible for the stall
  name            VARCHAR(100) NOT NULL,               -- e.g., "Stall A - Drinks"
  location        VARCHAR(150) DEFAULT NULL,           -- physical location label
  device_token    VARCHAR(255) DEFAULT NULL UNIQUE,    -- registered terminal token
  telegram_chat_id BIGINT DEFAULT NULL,               -- kitchen Telegram channel ID
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Stall ↔ Staff Assignment ──────────────────────────────
CREATE TABLE stall_staff (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  stall_id  INT NOT NULL,
  user_id   INT NOT NULL,
  UNIQUE KEY uq_stall_user (stall_id, user_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- ── Categories ────────────────────────────────────────────
CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  tone       ENUM('gold', 'green', 'blue', 'rose') NOT NULL DEFAULT 'gold',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Products ──────────────────────────────────────────────
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  image_url   VARCHAR(500) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ── Stall Products (Per-Stall Catalog Assignment) ─────────
CREATE TABLE stall_products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  stall_id    INT NOT NULL,
  product_id  INT NOT NULL,
  price_usd   DECIMAL(10, 2) NOT NULL,
  price_khr   INT NOT NULL,                            -- KHR stored as integer (no decimals)
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_stall_product (stall_id, product_id),
  KEY idx_stall_products_product_id (product_id),
  FOREIGN KEY (stall_id)    REFERENCES stalls(id)     ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)   ON DELETE CASCADE
);

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  stall_id       INT NOT NULL,                         -- which stall processed this order
  cashier_id     INT NOT NULL,                         -- which cashier
  payment_method ENUM('cash', 'khqr') NOT NULL,
  status         ENUM('pending_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending_payment',
  subtotal_usd   DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- sum of line totals before promos
  total_usd      DECIMAL(10, 2) NOT NULL,              -- final total after promos
  qr_payload     TEXT DEFAULT NULL,                    -- raw KHQR string; NULL for cash
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at   DATETIME DEFAULT NULL,
  FOREIGN KEY (stall_id)   REFERENCES stalls(id),
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- ── Order Items ───────────────────────────────────────────
CREATE TABLE order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT DEFAULT NULL,                         -- nullable: product may be deleted later
  name       VARCHAR(150) NOT NULL,                    -- snapshot at time of sale
  price_usd      DECIMAL(10, 2) NOT NULL,                  -- snapshot at time of sale
  price_khr      INT NOT NULL,                             -- snapshot at time of sale
  line_total_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  line_total_khr INT NOT NULL DEFAULT 0,
  quantity       INT NOT NULL DEFAULT 1,
  notes          VARCHAR(500) DEFAULT NULL,                -- modifiers: "no ice", "extra spicy"
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ── Audit Logs ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT DEFAULT NULL,
  action        ENUM('order_created', 'cash_payment_confirmed', 'order_cancelled') NOT NULL,
  order_id      INT DEFAULT NULL,
  details       JSON DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_logs_actor_user_id (actor_user_id),
  KEY idx_audit_logs_order_id (order_id),
  KEY idx_audit_logs_action (action),
  KEY idx_audit_logs_created_at (created_at),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ── Telegram Tickets ──────────────────────────────────────
-- Telegram kitchen ticket state is tracked independently from payment order state
CREATE TABLE telegram_tickets (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_id         INT NOT NULL,
  telegram_msg_id  BIGINT DEFAULT NULL,
  telegram_chat_id BIGINT DEFAULT NULL,
  status           ENUM('pending', 'sent', 'failed', 'done') NOT NULL DEFAULT 'pending',
  sent_at          DATETIME DEFAULT NULL,
  completed_at     DATETIME DEFAULT NULL,
  KEY idx_telegram_tickets_order_id (order_id),
  KEY idx_telegram_tickets_chat_id (telegram_chat_id),
  KEY idx_telegram_tickets_status (status),
  UNIQUE KEY uq_telegram_ticket_message (telegram_chat_id, telegram_msg_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ── Seed: default owner account ───────────────────────────
-- Password: owner123 (replace bcrypt hash before production)
INSERT INTO users (username, password, pin, role) VALUES
  ('owner', '$2b$10$examplehashreplaceme', NULL, 'owner');

-- ── Seed: example stall ───────────────────────────────────
INSERT INTO stalls (owner_id, name, location) VALUES (1, 'Stall A - Drinks', 'Main Booth');
