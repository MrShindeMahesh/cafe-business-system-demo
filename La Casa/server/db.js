// ============================================================
// db.js — SQLite connection + schema + seed for the Café POS
// Uses better-sqlite3 (fast, synchronous, single-file database).
// ============================================================
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { laCasaMenu } from '../src/data/laCasaMenu.js';
import { seedInventory, seedCustomers, defaultTables, defaultSettings } from '../src/data/seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'cafe.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

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
`);

// -------- seed (only if empty) --------
const j = (v) => JSON.stringify(v ?? []);
const tableCount = db.prepare('SELECT COUNT(*) AS n FROM tables').get().n;
if (tableCount === 0) {
  const ins = db.prepare('INSERT INTO tables (id, number, status) VALUES (?,?,?)');
  for (const t of defaultTables) ins.run(t.id, t.number, t.status);
}

const menuCount = db.prepare('SELECT COUNT(*) AS n FROM menu').get().n;
if (menuCount === 0) {
  const ins = db.prepare(
    'INSERT INTO menu (id,name,category,price,description,image,available,recipe,variants,addons) VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  for (const m of laCasaMenu) {
    ins.run(m.id, m.name, m.category || '', m.price, m.description || '', m.image || '', m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons));
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

console.log('✔ SQLite database ready:', dbPath);