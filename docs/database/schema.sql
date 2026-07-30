-- ============================================================
-- Toub POS — Canonical MySQL Schema
-- WARNING: Any modifications to Sequelize models must also
-- be reflected in this file to maintain 100% database schema parity.
-- ============================================================

CREATE DATABASE IF NOT EXISTS toub_pos;
USE toub_pos;

-- ── Users / Staff ─────────────────────────────────────────
-- Credential rules:
--   platform_admin/owner/manager: password stores bcrypt hash, pin must be NULL
--   cashier: password must be NULL, pin stores bcrypt hash of 4-digit PIN
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  owner_id   INT DEFAULT NULL,                         -- NULL for platform_admin/owner; owner ID for manager/cashier
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) DEFAULT NULL,                -- bcrypt hash for platform_admin/owner/manager login
  pin        VARCHAR(255) DEFAULT NULL,                -- bcrypt hash for cashier PIN login
  role       ENUM('platform_admin', 'owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Stalls (Physical Booth Locations) ─────────────────────
CREATE TABLE stalls (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT DEFAULT NULL,                    -- business owner responsible for the stall
  name            VARCHAR(100) NOT NULL,               -- e.g., "Stall A - Drinks"
  location        VARCHAR(150) DEFAULT NULL,           -- physical location label
  device_token    VARCHAR(255) DEFAULT NULL,           -- deprecated one-time migration source; active tokens live in stall_devices
  telegram_chat_id BIGINT DEFAULT NULL,               -- kitchen Telegram channel ID
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stalls_device_token (device_token),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Registered Cashier Terminals ────────────────────────
-- Raw tokens are returned once to the registering browser. Only a deterministic
-- SHA-256 hash is stored so individual devices can be looked up and revoked.
CREATE TABLE stall_devices (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  stall_id              INT NOT NULL,
  name                  VARCHAR(100) NOT NULL,
  token_hash            VARCHAR(64) NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  registered_by_user_id INT DEFAULT NULL,
  last_cashier_id       INT DEFAULT NULL,
  last_seen_at          DATETIME DEFAULT NULL,
  revoked_at            DATETIME DEFAULT NULL,
  revoked_by_user_id    INT DEFAULT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stall_devices_token_hash (token_hash),
  KEY idx_stall_devices_stall_active (stall_id, is_active),
  KEY idx_stall_devices_last_cashier (last_cashier_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE,
  FOREIGN KEY (registered_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (last_cashier_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (revoked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Telegram-Only Kitchen Identities ─────────────────────
-- Cooks are not web users and receive no password, PIN, JWT, or portal role.
-- A Telegram identity must be explicitly authorized for each stall it serves.
CREATE TABLE telegram_cooks (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  stall_id         INT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  display_name     VARCHAR(100) NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_telegram_cooks_stall_user (stall_id, telegram_user_id),
  KEY idx_telegram_cooks_stall_active (stall_id, is_active),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE
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
  owner_id   INT NOT NULL,                               -- business owner who manages this category
  name       VARCHAR(100) NOT NULL,
  tone       ENUM('gold', 'green', 'blue', 'rose') NOT NULL DEFAULT 'gold',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_category_owner_name (owner_id, name),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Products ──────────────────────────────────────────────
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  image_url   VARCHAR(500) DEFAULT NULL,
  default_price_usd DECIMAL(10, 2) DEFAULT NULL,       -- retained when no stall is assigned
  default_price_khr INT DEFAULT NULL,                  -- copied into new stall assignments
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
  cash_received_usd DECIMAL(10, 2) DEFAULT NULL,       -- cash handed over by customer; cash orders only
  change_due_usd DECIMAL(10, 2) DEFAULT NULL,          -- backend-calculated cash change; cash orders only
  qr_payload     TEXT DEFAULT NULL,                    -- raw KHQR string; NULL for cash
  qr_md5         VARCHAR(64) DEFAULT NULL,             -- KHQR md5 hash returned/generated by provider adapter
  payment_reference VARCHAR(100) DEFAULT NULL,         -- unique bill number/payment reference for KHQR
  payment_expires_at DATETIME DEFAULT NULL,            -- optional KHQR expiry timestamp
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at   DATETIME DEFAULT NULL,
  UNIQUE KEY uq_orders_payment_reference (payment_reference),
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
  action        ENUM('order_created', 'cash_payment_confirmed', 'khqr_payment_confirmed', 'order_cancelled') NOT NULL,
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
  completed_by_telegram_user_id BIGINT DEFAULT NULL,
  completed_by_name VARCHAR(100) DEFAULT NULL,
  KEY idx_telegram_tickets_order_id (order_id),
  KEY idx_telegram_tickets_chat_id (telegram_chat_id),
  KEY idx_telegram_tickets_status (status),
  UNIQUE KEY uq_telegram_ticket_message (telegram_chat_id, telegram_msg_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ── Seed: development bootstrap platform admin ────────────
-- Password: platform123 (replace bcrypt hash before production)
INSERT INTO users (username, password, pin, role) VALUES
  ('platform_admin', '$2b$10$examplehashreplaceme', NULL, 'platform_admin');

-- Business owner accounts are normally created by platform_admin.
-- Example owner password: owner123
INSERT INTO users (username, password, pin, role) VALUES
  ('owner', '$2b$10$examplehashreplaceme', NULL, 'owner');

-- ── Seed: example stall ───────────────────────────────────
INSERT INTO stalls (owner_id, name, location) VALUES (2, 'Stall A - Drinks', 'Main Booth');
