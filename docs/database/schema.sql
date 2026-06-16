-- ============================================================
-- Toub POS — Canonical MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS toub_pos;
USE toub_pos;

-- ── Users / Staff ─────────────────────────────────────────
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,                    -- bcrypt hash
  pin        VARCHAR(10)  DEFAULT NULL,                -- 4-digit cashier PIN
  role       ENUM('admin', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Stalls (Physical Booth Locations) ─────────────────────
CREATE TABLE stalls (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,               -- e.g., "Stall A - Drinks"
  device_token    VARCHAR(255) DEFAULT NULL UNIQUE,    -- registered terminal token
  telegram_chat_id BIGINT DEFAULT NULL,               -- kitchen Telegram channel ID
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  stall_id   INT DEFAULT NULL,                         -- NULL = shared across stalls
  name       VARCHAR(100) NOT NULL,
  tone       ENUM('gold', 'green', 'blue', 'rose') NOT NULL DEFAULT 'gold',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE SET NULL
);

-- ── Products ──────────────────────────────────────────────
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  stall_id    INT DEFAULT NULL,                        -- scoped to stall; NULL = global
  category_id INT DEFAULT NULL,
  name        VARCHAR(150) NOT NULL,
  price_usd   DECIMAL(10, 2) NOT NULL,
  price_khr   INT NOT NULL,                            -- KHR stored as integer (no decimals)
  image_url   VARCHAR(500) DEFAULT NULL,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stall_id)    REFERENCES stalls(id)      ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE SET NULL
);

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  stall_id       INT NOT NULL,                         -- which stall processed this order
  cashier_id     INT NOT NULL,                         -- which cashier
  payment_method ENUM('cash', 'khqr') NOT NULL,
  status         ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  subtotal_usd   DECIMAL(10, 2) NOT NULL,
  service_fee    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  tax            DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_usd      DECIMAL(10, 2) NOT NULL,
  qr_payload     TEXT DEFAULT NULL,                    -- raw KHQR string; NULL for cash
  kitchen_status   ENUM('pending', 'done') NOT NULL DEFAULT 'pending',
  telegram_status  ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  telegram_msg_id  BIGINT DEFAULT NULL,                 -- Telegram message ID for edits
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  price_usd  DECIMAL(10, 2) NOT NULL,                  -- snapshot at time of sale
  price_khr  INT NOT NULL,                             -- snapshot at time of sale
  quantity   INT NOT NULL DEFAULT 1,
  notes      VARCHAR(500) DEFAULT NULL,                -- modifiers: "no ice", "extra spicy"
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ── Telegram Kitchen Sessions ─────────────────────────────
-- Authorized Telegram user IDs allowed to interact with kitchen bot per stall
CREATE TABLE telegram_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  stall_id        INT NOT NULL,
  telegram_user_id BIGINT NOT NULL,                    -- Telegram from.id
  name            VARCHAR(100) DEFAULT NULL,           -- cook display name
  UNIQUE KEY uq_stall_tg (stall_id, telegram_user_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE
);

-- ── Seed: default admin account ───────────────────────────
-- Password: admin123 (replace bcrypt hash before production)
INSERT INTO users (username, password, role) VALUES
  ('admin', '$2b$10$examplehashreplaceme', 'admin');

-- ── Seed: example stall ───────────────────────────────────
INSERT INTO stalls (name) VALUES ('Stall A - Drinks');
