// ============================================================
// db.js — SQLite connection + schema + seed for the Café POS
// Uses node:sqlite (built into Node.js 22.5+, zero dependencies).
// ============================================================
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { laCasaMenu } from '../src/data/laCasaMenu.js';
import { seedInventory, seedCustomers, defaultTables, defaultSettings } from '../src/data/seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'cafe.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

// -------- schema (idempotent) --------
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  table_id       TEXT NOT NULL,
  items          TEXT NOT NULL,
  subtotal       REAL DEFAULT 0,
  total          REAL DEFAULT 0,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT DEFAULT 'NEW',
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  price       REAL NOT NULL,
  description TEXT,
  image       TEXT,
  available   INTEGER DEFAULT 1,
  recipe      TEXT,
  variants    TEXT,
  addons      TEXT
);

CREATE TABLE IF NOT EXISTS tables (
  id     TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  status TEXT DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS inventory (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  unit     TEXT,
  status   TEXT DEFAULT 'In Stock'
);

CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  phone       TEXT UNIQUE,
  orders      INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  last_visit  TEXT
);

CREATE TABLE IF NOT EXISTS bills (
  id           TEXT PRIMARY KEY,
  table_id     TEXT,
  status       TEXT DEFAULT 'REQUESTED',
  requested_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  table_id     TEXT,
  amount       REAL DEFAULT 0,
  discount     REAL DEFAULT 0,
  payment_mode TEXT DEFAULT 'Cash',
  order_ids    TEXT,
  item_count   INTEGER DEFAULT 0,
  settled_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id         TEXT PRIMARY KEY,
  staff_name TEXT,
  role       TEXT,
  check_in   TEXT,
  check_out  TEXT,
  date       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  category   TEXT DEFAULT '',
  amount     REAL DEFAULT 0,
  note       TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT,
  booking_date TEXT NOT NULL,
  booking_time TEXT,
  guests       INTEGER DEFAULT 2,
  note         TEXT,
  status       TEXT DEFAULT 'CONFIRMED',
  created_at   TEXT
);

CREATE TABLE IF NOT EXISTS staff (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT DEFAULT 'waiter',
  phone      TEXT,
  active     INTEGER DEFAULT 1,
  created_at TEXT
);
`);

// -------- seed (only if empty) --------
const j = (v) => JSON.stringify(v ?? []);

const tableCount = db.prepare('SELECT COUNT(*) AS n FROM tables').get().n;
if (tableCount === 0) {
  const ins = db.prepare('INSERT INTO tables (id, number, status) VALUES (?,?,?)');
  for (const t of defaultTables) ins.run(t.id, t.number, t.status);
}

// Default floor size: top the tables up to 50 on startup (never removes tables).
const MIN_TABLES = 50;
if (db.prepare('SELECT COUNT(*) AS n FROM tables').get().n < MIN_TABLES) {
  const existingNums = new Set(db.prepare('SELECT number FROM tables').all().map((r) => String(r.number)));
  const ins = db.prepare('INSERT OR IGNORE INTO tables (id, number, status) VALUES (?,?,?)');
  let num = 1;
  while (db.prepare('SELECT COUNT(*) AS n FROM tables').get().n < MIN_TABLES) {
    const numStr = String(num).padStart(2, '0');
    if (!existingNums.has(numStr)) ins.run(`table_${numStr}`, numStr, 'Available');
    num++;
  }
  console.log(`✔ Tables topped up to the default ${MIN_TABLES}`);
}

// Menu seed versioning: bump MENU_SEED_VERSION when the seed menu grows/changes.
// On startup, if the stored version is lower, missing seed items are merged in
// (INSERT OR IGNORE — existing data, edits and staff deletions are preserved).
const MENU_SEED_VERSION = 2;

const menuCount = db.prepare('SELECT COUNT(*) AS n FROM menu').get().n;
const storedMenuVersion = Number(
  db.prepare("SELECT value FROM settings WHERE key = '_menu_seed_version'").get()?.value || 0
);
if (menuCount === 0 || storedMenuVersion < MENU_SEED_VERSION) {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO menu (id,name,category,price,description,image,available,recipe,variants,addons) VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  db.exec('BEGIN');
  try {
    for (const m of laCasaMenu) {
      ins.run(m.id, m.name, m.category || '', m.price, m.description || '', m.image || '', m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  if (menuCount > 0) {
    console.log(`✔ Menu updated: merged missing seed items (v${storedMenuVersion} → v${MENU_SEED_VERSION})`);
  }
}

const invCount = db.prepare('SELECT COUNT(*) AS n FROM inventory').get().n;
if (invCount === 0) {
  const ins = db.prepare('INSERT INTO inventory (id,name,quantity,unit,status) VALUES (?,?,?,?,?)');
  for (const i of seedInventory) ins.run(i.id, i.name, i.quantity, i.unit || '', i.status || 'In Stock');
}

const custCount = db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;
if (custCount === 0) {
  const ins = db.prepare('INSERT INTO customers (id,name,phone,orders,total_spent,last_visit) VALUES (?,?,?,?,?,?)');
  for (const c of seedCustomers) ins.run(c.id, c.name, c.phone, c.orders || 0, c.totalSpent || 0, c.lastVisit || '');
}

const setCount = db.prepare('SELECT COUNT(*) AS n FROM settings').get().n;
if (setCount === 0) {
  const ins = db.prepare('INSERT INTO settings (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries(defaultSettings)) ins.run(k, String(v));
}

// Record the menu seed version (idempotent, runs every startup).
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('_menu_seed_version', ?)").run(String(MENU_SEED_VERSION));

// -------- lightweight column migrations (safe on existing databases) --------
// orders.staff_name — who took the order (staff tagging, sales-by-staff report)
const orderCols = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
if (!orderCols.includes('staff_name')) {
  db.exec('ALTER TABLE orders ADD COLUMN staff_name TEXT');
  console.log('✔ orders table: added staff_name column');
}

console.log('✔ SQLite database ready:', dbPath);
