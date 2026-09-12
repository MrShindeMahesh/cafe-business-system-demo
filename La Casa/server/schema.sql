-- ============================================
-- CAFE POS — SQLite Database Schema
-- Run:  sqlite3 cafe.db ".read schema.sql"
-- ============================================

-- ORDERS (items stored as JSON text)
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  table_id       TEXT NOT NULL,
  items          TEXT NOT NULL,          -- JSON: [{name, quantity, calculatedPrice, ...}]
  subtotal       REAL DEFAULT 0,
  total          REAL DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT DEFAULT 'NEW',     -- NEW | PREPARING | READY | SERVED
  created_at     TEXT NOT NULL
);

-- MENU
CREATE TABLE IF NOT EXISTS menu (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  price       REAL NOT NULL,
  description TEXT,
  image       TEXT,
  available   INTEGER DEFAULT 1,         -- 1 = yes, 0 = no
  recipe      TEXT,                      -- JSON
  variants    TEXT,                      -- JSON
  addons      TEXT                       -- JSON
);

-- TABLES
CREATE TABLE IF NOT EXISTS tables (
  id     TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  status TEXT DEFAULT 'Available'        -- Available | Occupied
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  unit     TEXT,
  status   TEXT DEFAULT 'In Stock'       -- In Stock | Low Stock | Critical
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  phone       TEXT UNIQUE,
  orders      INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  last_visit  TEXT
);

-- BILLS (bill requests from customers)
CREATE TABLE IF NOT EXISTS bills (
  id           TEXT PRIMARY KEY,
  table_id     TEXT,
  status       TEXT DEFAULT 'REQUESTED',
  requested_at TEXT
);

-- SETTINGS (simple key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ============ DEFAULT SEED DATA ============
INSERT OR IGNORE INTO tables (id, number, status) VALUES
  ('table_1', '01', 'Available'),
  ('table_2', '02', 'Available'),
  ('table_3', '03', 'Available'),
  ('table_4', '04', 'Available'),
  ('table_5', '05', 'Available'),
  ('table_6', '06', 'Available'),
  ('table_7', '07', 'Available'),
  ('table_8', '08', 'Available');

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('cafeName', 'La Casa'),
  ('contact',  '+91 9876543210'),
  ('address',  'Nagpur, Maharashtra');
