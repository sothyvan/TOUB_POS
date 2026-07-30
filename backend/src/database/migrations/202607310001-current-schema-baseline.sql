CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT DEFAULT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) DEFAULT NULL,
  pin VARCHAR(255) DEFAULT NULL,
  role ENUM('platform_admin', 'owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  session_version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE stalls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT DEFAULT NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(150) DEFAULT NULL,
  device_token VARCHAR(255) DEFAULT NULL,
  telegram_chat_id BIGINT DEFAULT NULL,
  telegram_chat_title VARCHAR(255) DEFAULT NULL,
  telegram_connected_at DATETIME DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stalls_device_token (device_token),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE stall_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stall_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  registered_by_user_id INT DEFAULT NULL,
  last_cashier_id INT DEFAULT NULL,
  last_seen_at DATETIME DEFAULT NULL,
  revoked_at DATETIME DEFAULT NULL,
  revoked_by_user_id INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stall_devices_token_hash (token_hash),
  KEY idx_stall_devices_stall_active (stall_id, is_active),
  KEY idx_stall_devices_last_cashier (last_cashier_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE,
  FOREIGN KEY (registered_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (last_cashier_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (revoked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE refresh_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_id INT DEFAULT NULL,
  token_hash VARCHAR(64) NOT NULL,
  csrf_token_hash VARCHAR(64) NOT NULL,
  family_id VARCHAR(36) NOT NULL,
  session_version INT NOT NULL,
  expires_at DATETIME NOT NULL,
  last_used_at DATETIME DEFAULT NULL,
  revoked_at DATETIME DEFAULT NULL,
  replaced_by_token_hash VARCHAR(64) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_sessions_token_hash (token_hash),
  KEY idx_refresh_sessions_user_active_expiry (user_id, revoked_at, expires_at),
  KEY idx_refresh_sessions_family (family_id),
  KEY idx_refresh_sessions_device (device_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES stall_devices(id) ON DELETE CASCADE
);

CREATE TABLE telegram_cooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stall_id INT NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_telegram_cooks_stall_user (stall_id, telegram_user_id),
  KEY idx_telegram_cooks_stall_active (stall_id, is_active),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE
);

CREATE TABLE telegram_group_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stall_id INT NOT NULL,
  created_by_user_id INT DEFAULT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME DEFAULT NULL,
  connected_chat_id BIGINT DEFAULT NULL,
  connected_chat_title VARCHAR(255) DEFAULT NULL,
  connected_by_telegram_user_id BIGINT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_telegram_group_connections_token_hash (token_hash),
  KEY idx_telegram_group_connections_stall_expiry (stall_id, expires_at),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE stall_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stall_id INT NOT NULL,
  user_id INT NOT NULL,
  UNIQUE KEY uq_stall_staff_user (user_id),
  KEY idx_stall_staff_stall_id (stall_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  tone ENUM('gold', 'green', 'blue', 'rose') NOT NULL DEFAULT 'gold',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_category_owner_name (owner_id, name),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  default_price_usd DECIMAL(10, 2) DEFAULT NULL,
  default_price_khr INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE stall_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stall_id INT NOT NULL,
  product_id INT NOT NULL,
  price_usd DECIMAL(10, 2) NOT NULL,
  price_khr INT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_stall_product (stall_id, product_id),
  KEY idx_stall_products_product_id (product_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stall_id INT NOT NULL,
  cashier_id INT NOT NULL,
  idempotency_key VARCHAR(64) DEFAULT NULL,
  idempotency_fingerprint VARCHAR(64) DEFAULT NULL,
  payment_method ENUM('cash', 'khqr') NOT NULL,
  status ENUM('pending_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending_payment',
  subtotal_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_usd DECIMAL(10, 2) NOT NULL,
  cash_received_usd DECIMAL(10, 2) DEFAULT NULL,
  change_due_usd DECIMAL(10, 2) DEFAULT NULL,
  qr_payload TEXT DEFAULT NULL,
  qr_md5 VARCHAR(64) DEFAULT NULL,
  payment_reference VARCHAR(100) DEFAULT NULL,
  payment_expires_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  UNIQUE KEY uq_orders_payment_reference (payment_reference),
  UNIQUE KEY uq_orders_cashier_idempotency (cashier_id, idempotency_key),
  FOREIGN KEY (stall_id) REFERENCES stalls(id),
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  price_usd DECIMAL(10, 2) NOT NULL,
  price_khr INT NOT NULL,
  line_total_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  line_total_khr INT NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  notes VARCHAR(500) DEFAULT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT DEFAULT NULL,
  action ENUM('order_created', 'cash_payment_confirmed', 'khqr_payment_confirmed', 'order_cancelled') NOT NULL,
  order_id INT DEFAULT NULL,
  details JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_logs_actor_user_id (actor_user_id),
  KEY idx_audit_logs_order_id (order_id),
  KEY idx_audit_logs_action (action),
  KEY idx_audit_logs_created_at (created_at),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE telegram_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  telegram_msg_id BIGINT DEFAULT NULL,
  telegram_chat_id BIGINT DEFAULT NULL,
  status ENUM('pending', 'sent', 'failed', 'done') NOT NULL DEFAULT 'pending',
  sent_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  completed_by_telegram_user_id BIGINT DEFAULT NULL,
  completed_by_name VARCHAR(100) DEFAULT NULL,
  KEY idx_telegram_tickets_order_id (order_id),
  KEY idx_telegram_tickets_chat_id (telegram_chat_id),
  KEY idx_telegram_tickets_status (status),
  UNIQUE KEY uq_telegram_ticket_message (telegram_chat_id, telegram_msg_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE telegram_dispatch_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status ENUM('pending', 'processing', 'retry', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at DATETIME DEFAULT NULL,
  locked_at DATETIME DEFAULT NULL,
  locked_by VARCHAR(64) DEFAULT NULL,
  last_error VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_telegram_dispatch_jobs_order (order_id),
  KEY idx_telegram_dispatch_jobs_due (status, next_attempt_at),
  KEY idx_telegram_dispatch_jobs_lock (status, locked_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
