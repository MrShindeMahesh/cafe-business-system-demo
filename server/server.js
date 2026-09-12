// ============================================================
// server.js — Express + SQLite API for the Café POS
// ============================================================
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { db } from './db.js';
import { printKitchenTicket, printSample, printReceipt } from './print.js';

// node:sqlite DatabaseSync has no .transaction() (that's better-sqlite3's API).
// Minimal equivalent so multi-statement writes are atomic.
const withTransaction = (fn) => {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 4000;

const parseJson = (txt, fallback = []) => {
  try { return txt ? JSON.parse(txt) : fallback; } catch { return fallback; }
};
const j = (v) => JSON.stringify(v ?? []);

const rowTable = (r) => ({ id: r.id, number: r.number, status: r.status });
const rowInventory = (r) => ({ id: r.id, name: r.name, quantity: r.quantity, unit: r.unit, status: r.status });
const rowCustomer = (r) => ({ id: r.id, name: r.name, phone: r.phone, orders: r.orders, totalSpent: r.total_spent, lastVisit: r.last_visit });
const rowOrder = (r) => ({
  id: r.id, tableId: r.table_id, items: parseJson(r.items),
  subtotal: r.subtotal, total: r.total,
  customerName: r.customer_name, customerPhone: r.customer_phone,
  status: r.status, createdAt: r.created_at,
  staffName: r.staff_name || '',
});
const rowMenu = (r) => ({
  id: r.id, name: r.name, category: r.category, price: r.price, description: r.description,
  image: r.image, available: !!r.available,
  recipe: parseJson(r.recipe), variants: parseJson(r.variants), addons: parseJson(r.addons),
  veg: r.veg, spiceLevel: r.spiceLevel, costPrice: r.costPrice,
});
const rowBill = (r) => ({ id: r.id, tableId: r.table_id, status: r.status, requestedAt: r.requested_at });
const rowPayment = (r) => ({
  id: r.id, tableId: r.table_id, amount: r.amount, discount: r.discount,
  paymentMode: r.payment_mode, orderIds: parseJson(r.order_ids),
  itemCount: r.item_count, settledAt: r.settled_at,
});
const rowAttendance = (r) => ({
  id: r.id, staffName: r.staff_name, role: r.role,
  checkIn: r.check_in, checkOut: r.check_out, date: r.date,
});

const rowExpense = (r) => ({
  id: r.id, title: r.title, category: r.category || '', amount: r.amount,
  note: r.note || '', createdAt: r.created_at,
});

const rowBooking = (r) => ({
  id: r.id, name: r.name, phone: r.phone || '', bookingDate: r.booking_date,
  bookingTime: r.booking_time || '', guests: r.guests, note: r.note || '',
  status: r.status || 'CONFIRMED', createdAt: r.created_at,
});

const rowStaff = (r) => ({
  id: r.id, name: r.name, role: r.role || 'waiter', phone: r.phone || '',
  active: !!r.active, createdAt: r.created_at,
});

const getSettings = () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of rows) {
    if (r.key.startsWith('_')) continue; // internal keys are not exposed to the frontend
    s[r.key] = r.value;
  }
  return s;
};

const snapshot = () => ({
  orders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(rowOrder),
  menu: db.prepare('SELECT * FROM menu ORDER BY category, price').all().map(rowMenu),
  tables: db.prepare('SELECT * FROM tables ORDER BY number').all().map(rowTable),
  inventory: db.prepare('SELECT * FROM inventory').all().map(rowInventory),
  customers: db.prepare('SELECT * FROM customers').all().map(rowCustomer),
  bills: db.prepare('SELECT * FROM bills ORDER BY requested_at DESC').all().map(rowBill),
  payments: db.prepare('SELECT * FROM payments ORDER BY settled_at DESC').all().map(rowPayment),
  expenses: db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all().map(rowExpense),
  bookings: db.prepare("SELECT * FROM bookings WHERE status != 'CANCELLED' ORDER BY booking_date, booking_time").all().map(rowBooking),
  staff: db.prepare('SELECT * FROM staff WHERE active = 1 ORDER BY name').all().map(rowStaff),
  attendance: db.prepare('SELECT * FROM attendance ORDER BY date DESC, check_in DESC').all().map(rowAttendance),
  settings: getSettings(),
});

// ============================== state ====================================
app.get('/api/state', (req, res) => res.json(snapshot()));

// ============================== menu =====================================
app.get('/api/menu', (req, res) =>
  res.json(db.prepare('SELECT * FROM menu ORDER BY id').all().map(rowMenu)));

app.post('/api/menu', (req, res) => {
  const m = req.body || {};
  const id = m.id || `lc_${Date.now()}`;
  db.prepare(`INSERT INTO menu (id,name,category,price,description,image,available,recipe,variants,addons,veg,spiceLevel,costPrice)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, m.name || 'Item', m.category || '', m.price || 0, m.description || '', m.image || '',
      m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons),
      m.veg || 'V', m.spiceLevel || 'Mild', Number(m.costPrice) || 0);
  res.status(201).json(rowMenu(db.prepare('SELECT * FROM menu WHERE id=?').get(id)));
});

app.patch('/api/menu/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM menu WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE menu SET name=?, category=?, price=?, description=?, image=?, available=?, recipe=?, variants=?, addons=?, veg=?, spiceLevel=?, costPrice=? WHERE id=?`)
    .run(req.body.name ?? cur.name, req.body.category ?? cur.category, req.body.price ?? cur.price,
      req.body.description ?? cur.description, req.body.image ?? cur.image,
      req.body.available === undefined ? cur.available : (req.body.available ? 1 : 0),
      j(req.body.recipe ?? parseJson(cur.recipe)), j(req.body.variants ?? parseJson(cur.variants)),
      j(req.body.addons ?? parseJson(cur.addons)),
      req.body.veg ?? cur.veg, req.body.spiceLevel ?? cur.spiceLevel, Number(req.body.costPrice) ?? cur.costPrice,
      cur.id);
  res.json(rowMenu(db.prepare('SELECT * FROM menu WHERE id=?').get(cur.id)));
});

app.delete('/api/menu/:id', (req, res) => {
  db.prepare('DELETE FROM menu WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ============================== tables ===================================
app.get('/api/tables', (req, res) =>
  res.json(db.prepare('SELECT * FROM tables ORDER BY number').all().map(rowTable)));

app.post('/api/tables', (req, res) => {
  const t = req.body || {};
  const id = t.id || `table_${Date.now()}`;
  const n = db.prepare('SELECT COUNT(*) n FROM tables').get().n;
  db.prepare('INSERT INTO tables (id, number, status) VALUES (?,?,?)')
    .run(id, t.number || String(n + 1).padStart(2, '0'), t.status || 'Available');
  res.json(rowTable(db.prepare('SELECT * FROM tables WHERE id=?').get(id)));
});

app.patch('/api/tables/:id', (req, res) => {
  db.prepare('UPDATE tables SET number=?, status=? WHERE id=?')
    .run(req.body.number, req.body.status, req.params.id);
  res.json(rowTable(db.prepare('SELECT * FROM tables WHERE id=?').get(req.params.id)));
});

app.delete('/api/tables/:id', (req, res) => {
  db.prepare('DELETE FROM tables WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ============================== inventory ================================
app.get('/api/inventory', (req, res) =>
  res.json(db.prepare('SELECT * FROM inventory').all().map(rowInventory)));

app.post('/api/inventory', (req, res) => {
  const i = req.body || {};
  const id = i.id || `inv_${Date.now()}`;
  let status = i.status || 'In Stock';
  if (!req.body.status) {
    if ((i.quantity || 0) <= 2) status = 'Critical';
    else if ((i.quantity || 0) <= 5) status = 'Low Stock';
  }
  db.prepare('INSERT INTO inventory (id,name,quantity,unit,status) VALUES (?,?,?,?,?)')
    .run(id, i.name || 'Stock', i.quantity || 0, i.unit || '', status);
  res.json(rowInventory(db.prepare('SELECT * FROM inventory WHERE id=?').get(id)));
});

app.patch('/api/inventory/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM inventory WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  const quantity = Number(req.body.quantity ?? cur.quantity);
  let status = req.body.status;
  if (!status) status = quantity <= 2 ? 'Critical' : quantity <= 5 ? 'Low Stock' : 'In Stock';
  db.prepare('UPDATE inventory SET name=?, quantity=?, unit=?, status=? WHERE id=?')
    .run(req.body.name ?? cur.name, quantity, req.body.unit ?? cur.unit, status, cur.id);
  res.json(rowInventory(db.prepare('SELECT * FROM inventory WHERE id=?').get(cur.id)));
});

app.delete('/api/inventory/:id', (req, res) => {
  db.prepare('DELETE FROM inventory WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ============================== customers ================================
app.get('/api/customers', (req, res) =>
  res.json(db.prepare('SELECT * FROM customers ORDER BY total_spent DESC').all().map(rowCustomer)));

app.patch('/api/customers/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE customers SET name=?, phone=?, orders=?, total_spent=?, last_visit=? WHERE id=?')
    .run(req.body.name ?? cur.name, req.body.phone ?? cur.phone, req.body.orders ?? cur.orders,
      req.body.totalSpent ?? cur.total_spent, req.body.lastVisit ?? cur.last_visit, cur.id);
  res.json(rowCustomer(db.prepare('SELECT * FROM customers WHERE id=?').get(cur.id)));
});

// ============================== bills ====================================
app.get('/api/bills', (req, res) =>
  res.json(db.prepare('SELECT * FROM bills ORDER BY requested_at DESC').all().map(rowBill)));

app.post('/api/bills', (req, res) => {
  const b = req.body || {};
  const id = b.id || `bill_${Date.now()}`;
  db.prepare('INSERT INTO bills (id, table_id, status, requested_at) VALUES (?,?,?,?)')
    .run(id, String(b.tableId || ''), b.status || 'REQUESTED', new Date().toISOString());
  res.json(rowBill(db.prepare('SELECT * FROM bills WHERE id=?').get(id)));
});

app.delete('/api/bills/:id', (req, res) => {
  db.prepare('DELETE FROM bills WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ============================ bulk mirror (whole-collection PUT) =========
// The app keeps local state authoritative for rendering and pushes the full
// collection here so SQLite stays in sync. Lightweight for a local café.

app.put('/api/menu/bulk', (req, res) => {
  const arr = req.body || [];
  withTransaction(() => {
    db.prepare('DELETE FROM menu').run();
    const ins = db.prepare('INSERT INTO menu (id,name,category,price,description,image,available,recipe,variants,addons) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const m of arr) ins.run(m.id, m.name, m.category || '', m.price || 0, m.description || '', m.image || '', m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons));
  });
  res.json({ ok: true, count: arr.length });
});

app.put('/api/inventory/bulk', (req, res) => {
  const arr = req.body || [];
  withTransaction(() => {
    db.prepare('DELETE FROM inventory').run();
    const ins = db.prepare('INSERT INTO inventory (id,name,quantity,unit,status) VALUES (?,?,?,?,?)');
    for (const i of arr) ins.run(i.id, i.name, i.quantity || 0, i.unit || '', i.status || 'In Stock');
  });
  res.json({ ok: true, count: arr.length });
});

app.put('/api/tables/bulk', (req, res) => {
  const arr = req.body || [];
  withTransaction(() => {
    db.prepare('DELETE FROM tables').run();
    const ins = db.prepare('INSERT INTO tables (id, number, status) VALUES (?,?,?)');
    for (const t of arr) ins.run(t.id, t.number, t.status || 'Available');
  });
  res.json({ ok: true, count: arr.length });
});

app.put('/api/customers/bulk', (req, res) => {
  const arr = req.body || [];
  withTransaction(() => {
    db.prepare('DELETE FROM customers').run();
    const ins = db.prepare('INSERT INTO customers (id,name,phone,orders,total_spent,last_visit) VALUES (?,?,?,?,?,?)');
    for (const c of arr) ins.run(c.id, c.name, c.phone || '', c.orders || 0, c.totalSpent || 0, c.lastVisit || '');
  });
  res.json({ ok: true, count: arr.length });
});

app.put('/api/bills/bulk', (req, res) => {
  const arr = req.body || [];
  withTransaction(() => {
    db.prepare('DELETE FROM bills').run();
    const ins = db.prepare('INSERT INTO bills (id, table_id, status, requested_at) VALUES (?,?,?,?)');
    for (const b of arr) ins.run(b.id, String(b.tableId || ''), b.status || 'REQUESTED', b.requestedAt || new Date().toISOString());
  });
  res.json({ ok: true, count: arr.length });
});

// ============================== settings =================================
app.get('/api/settings', (req, res) => res.json(getSettings()));

// PATCH /api/settings — merge partial update (used by frontend updateSettings)
app.patch('/api/settings', (req, res) => {
  const s = req.body || {};
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries(s)) upsert.run(k, typeof v === 'string' ? v : JSON.stringify(v));
  res.json(getSettings());
});

app.put('/api/settings', (req, res) => {
  const ups = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const body = req.body || {};
  for (const [k, v] of Object.entries(body)) ups.run(k, String(v));
  res.json(getSettings());
});

// ============================== orders ===================================
// place an order + all the business side-effects in ONE transaction
app.post('/api/orders', async (req, res) => {
  const d = req.body || {};
  const id = d.id || String(Math.floor(1000 + Math.random() * 9000));
  const createdAt = d.createdAt || new Date().toISOString();
  const status = d.status || 'NEW';
  const items = d.items || [];
  const tax = d.tax || 0;
  const subtotal = Number(d.subtotal || items.reduce((s, it) => s + (it.calculatedPrice || it.price * (it.quantity || 1) || it.price || 0), 0));
  const total = Number(d.total ?? (subtotal + tax));

  withTransaction(() => {
    db.prepare(`INSERT INTO orders (id, table_id, items, subtotal, total, customer_name, customer_phone, status, created_at, staff_name)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, String(d.tableId || ''), j(items), subtotal, total, d.customerName || '', d.customerPhone || '', status, createdAt, d.staffName || '');

    // 1) deduct inventory via recipes
    if (items.length) {
      const upd = db.prepare('UPDATE inventory SET quantity=?, status=? WHERE id=?');
      const rows = db.prepare('SELECT * FROM inventory').all();
      const stock = new Map(rows.map((r) => [r.id, r]));
      const deltas = new Map();
      for (const it of items) {
        const qty = it.quantity || 1;
        (it.recipe || []).forEach((rec) => {
          if (rec.inventoryId) deltas.set(rec.inventoryId, (deltas.get(rec.inventoryId) || 0) + Number(rec.amount || 0) * qty);
        });
        if (it.inventoryId) deltas.set(it.inventoryId, (deltas.get(it.inventoryId) || 0) + Number(it.stockUsed || 1) * qty);
      }
      for (const [id2, amt] of deltas) {
        const cur = stock.get(id2);
        if (!cur) continue;
        const q = Math.max(0, Number((cur.quantity - amt).toFixed(2)));
        const st = q <= 2 ? 'Critical' : q <= 5 ? 'Low Stock' : 'In Stock';
        upd.run(q, st, id2);
      }
    }

    // 2) create / bump customer loyalty
    if (d.customerPhone) {
      const c = db.prepare('SELECT * FROM customers WHERE phone=?').get(String(d.customerPhone));
      if (c) {
        db.prepare('UPDATE customers SET orders=?, total_spent=?, last_visit=? WHERE id=?')
          .run(c.orders + 1, c.total_spent + total, createdAt, c.id);
      } else {
        db.prepare('INSERT INTO customers (id,name,phone,orders,total_spent,last_visit) VALUES (?,?,?,1,?,?)')
          .run('c' + Date.now(), d.customerName || 'Guest', String(d.customerPhone), total, createdAt);
      }
    }

    // 3) mark the table occupied
    const tNum = parseInt(String(d.tableId).replace(/\D/g, ''), 10);
    if (!isNaN(tNum)) {
      const trow = db.prepare('SELECT * FROM tables').all().find((t) => parseInt(String(t.number || t.id).replace(/\D/g, ''), 10) === tNum);
      if (trow) db.prepare('UPDATE tables SET status=? WHERE id=?').run('Occupied', trow.id);
    }
  });

  // auto-print kitchen ticket (if enabled in settings)
  const s = getSettings();
  if (s.autoPrintKitchen === 'true') {
    printKitchenTicket({ id, tableId: d.tableId, items, createdAt })
      .catch((e) => console.error('print failed:', e.message));
  }

  res.status(201).json({ order: rowOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(id)), snapshot: snapshot() });
});

// status change — also broadcast a fresh snapshot so all screens stay in sync
app.patch('/api/orders/:id/status', (req, res) => {
  const cur = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  const ns = req.body.status || cur.status;
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(ns, cur.id);
  res.json(snapshot());
});

// edit an existing order (Phase 1) — full replacement item list.
// Inventory is deducted ONLY for the added quantity vs the previous ticket, so
// editing never double-deducts stock. Decreases/removals are NOT re-stocked
// (the kitchen may have already started — void-with-reason comes later).
app.put('/api/orders/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  if (String(cur.status).toUpperCase() === 'SERVED') {
    return res.status(409).json({ error: 'Order already settled — cannot edit' });
  }

  const d = req.body || {};
  const newItems = Array.isArray(d.items) ? d.items : parseJson(cur.items);
  const oldItems = parseJson(cur.items);

  // previous quantities — legacy orders have no menuId, so match menuId first, then name
  const oldByMenu = new Map(), oldByName = new Map();
  for (const it of oldItems) {
    const q = it.quantity || 1;
    if (it.menuId) oldByMenu.set(it.menuId, (oldByMenu.get(it.menuId) || 0) + q);
    oldByName.set(it.name, (oldByName.get(it.name) || 0) + q);
  }
  const prevQty = (it) =>
    (it.menuId && oldByMenu.has(it.menuId)) ? (oldByMenu.get(it.menuId) || 0) : (oldByName.get(it.name) || 0);

  // added quantity per line → inventory deduction + KOT print
  const deltas = new Map();
  const addedItems = [];
  for (const it of newItems) {
    const extra = (it.quantity || 1) - prevQty(it);
    if (extra <= 0) continue;
    addedItems.push({ ...it, quantity: extra });
    (it.recipe || []).forEach((rec) => {
      if (rec.inventoryId) deltas.set(rec.inventoryId, (deltas.get(rec.inventoryId) || 0) + Number(rec.amount || 0) * extra);
    });
    if (it.inventoryId) deltas.set(it.inventoryId, (deltas.get(it.inventoryId) || 0) + Number(it.stockUsed || 1) * extra);
  }

  const subtotal = Number(d.subtotal ?? newItems.reduce((s, it) => s + (it.calculatedPrice || it.price * (it.quantity || 1) || it.price || 0), 0));
  const total = Number(d.total ?? subtotal);

  withTransaction(() => {
    db.prepare('UPDATE orders SET items=?, subtotal=?, total=?, customer_name=?, customer_phone=? WHERE id=?')
      .run(j(newItems), subtotal, total, d.customerName ?? cur.customer_name ?? '', d.customerPhone ?? cur.customer_phone ?? '', cur.id);

    if (deltas.size) {
      const upd = db.prepare('UPDATE inventory SET quantity=?, status=? WHERE id=?');
      const rows = db.prepare('SELECT * FROM inventory').all();
      const stock = new Map(rows.map((r) => [r.id, r]));
      for (const [id2, amt] of deltas) {
        const c = stock.get(id2);
        if (!c) continue;
        const q = Math.max(0, Number((c.quantity - amt).toFixed(2)));
        const st = q <= 2 ? 'Critical' : q <= 5 ? 'Low Stock' : 'In Stock';
        upd.run(q, st, id2);
      }
    }
  });

  // auto-print KOT with only the added items (if enabled in settings)
  if (addedItems.length) {
    const s = getSettings();
    if (s.autoPrintKitchen === 'true') {
      printKitchenTicket({ id: cur.id, tableId: cur.table_id, items: addedItems, createdAt: new Date().toISOString(), title: 'ADDED ITEMS — KITCHEN' })
        .catch((e) => console.error('print failed:', e.message));
    }
  }

  res.json({ order: rowOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(cur.id)), addedItems, snapshot: snapshot() });
});

// ============================== print ====================================
app.post('/api/print-test', async (req, res) => {
  try {
    await printSample(req.body || {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================== print receipt ===================================
app.post('/api/print-receipt', async (req, res) => {
  try {
    const { table, orders } = req.body;
    const result = await printReceipt({ table, orders, settings: getSettings() });
    res.json(result || { ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================== print KOT (kitchen ticket) ===================================
// Prints the kitchen ticket on the MAIN machine's thermal printer (server-side),
// no matter which device (phone/tablet/POS) triggered it.
app.post('/api/print-kot', async (req, res) => {
  try {
    const result = await printKitchenTicket(req.body || {});
    res.json(result || { ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================== bulk sync (client → server) ====================================
// The frontend calls these after local state changes to persist the full array.
app.put('/api/menu', (req, res) => {
  db.prepare('DELETE FROM menu').run();
  const ins = db.prepare('INSERT INTO menu (id,name,category,price,description,image,available,recipe,variants,addons) VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (const m of req.body || []) {
    ins.run(m.id || `lc_${Date.now()}_${Math.random()}`, m.name || 'Item', m.category || '', m.price || 0, m.description || '', m.image || '', m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons));
  }
  res.json({ ok: true });
});

app.put('/api/inventory', (req, res) => {
  db.prepare('DELETE FROM inventory').run();
  const ins = db.prepare('INSERT INTO inventory (id,name,quantity,unit,status) VALUES (?,?,?,?,?)');
  for (const i of req.body || []) {
    ins.run(i.id || `inv_${Date.now()}_${Math.random()}`, i.name || 'Item', i.quantity || 0, i.unit || 'units', i.status || 'In Stock');
  }
  res.json({ ok: true });
});

app.put('/api/orders', (req, res) => {
  db.prepare('DELETE FROM orders').run();
  const ins = db.prepare('INSERT INTO orders (id,table_id,items,subtotal,total,customer_name,customer_phone,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const o of req.body || []) {
    ins.run(o.id || `ord_${Date.now()}_${Math.random()}`, String(o.tableId || ''), j(o.items || []), o.subtotal || 0, o.total || 0, o.customerName || '', o.customerPhone || '', o.status || 'NEW', o.createdAt || new Date().toISOString());
  }
  res.json({ ok: true });
});

app.put('/api/customers', (req, res) => {
  db.prepare('DELETE FROM customers').run();
  const ins = db.prepare('INSERT INTO customers (id,name,phone,orders,total_spent,last_visit) VALUES (?,?,?,?,?,?)');
  for (const c of req.body || []) {
    ins.run(c.id || `c_${Date.now()}_${Math.random()}`, c.name || 'Guest', c.phone || '', c.orders || 0, c.totalSpent || 0, c.lastVisit || '');
  }
  res.json({ ok: true });
});

app.put('/api/tables', (req, res) => {
  db.prepare('DELETE FROM tables').run();
  const ins = db.prepare('INSERT INTO tables (id,number,status) VALUES (?,?,?)');
  for (const t of req.body || []) {
    ins.run(t.id || `t_${Date.now()}_${Math.random()}`, String(t.number || ''), t.status || 'Available');
  }
  res.json({ ok: true });
});

app.put('/api/bills', (req, res) => {
  db.prepare('DELETE FROM bills').run();
  const ins = db.prepare('INSERT INTO bills (id,table_id,status,requested_at) VALUES (?,?,?,?)');
  for (const b of req.body || []) {
    ins.run(b.id || `b_${Date.now()}_${Math.random()}`, String(b.tableId || ''), b.status || 'REQUESTED', b.requestedAt || new Date().toISOString());
  }
  res.json({ ok: true });
});

// ================ payments (Phase 2/3: one record per settled bill) ================
app.post('/api/payments', (req, res) => {
  const p = req.body || {};
  const id = p.id || `pay_${Date.now()}`;
  withTransaction(() => {
    db.prepare('INSERT OR REPLACE INTO payments (id,table_id,amount,discount,payment_mode,order_ids,item_count,settled_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, String(p.tableId || ''), Number(p.amount || 0), Number(p.discount || 0), p.paymentMode || 'Cash', j(p.orderIds), Number(p.itemCount || 0), p.settledAt || new Date().toISOString());
  });
  res.json({ ok: true, snapshot: snapshot() });
});

app.put('/api/payments', (req, res) => {
  db.prepare('DELETE FROM payments').run();
  const ins = db.prepare('INSERT INTO payments (id,table_id,amount,discount,payment_mode,order_ids,item_count,settled_at) VALUES (?,?,?,?,?,?,?,?)');
  for (const p of req.body || []) {
    ins.run(p.id || `pay_${Date.now()}_${Math.random()}`, String(p.tableId || ''), Number(p.amount || 0), Number(p.discount || 0), p.paymentMode || 'Cash', j(p.orderIds), Number(p.itemCount || 0), p.settledAt || new Date().toISOString());
  }
  res.json({ ok: true });
});

// ================ attendance (staff check-in / check-out) ================
app.post('/api/attendance', (req, res) => {
  const a = req.body || {};
  const date = a.date || new Date().toISOString().slice(0, 10);
  const staffName = String(a.staffName || '');
  // idempotent — never create a second open record for the same person on the same day
  const open = db.prepare("SELECT * FROM attendance WHERE date=? AND staff_name=? AND (check_out IS NULL OR check_out='')").get(date, staffName);
  if (open) return res.json({ ok: true, attendance: rowAttendance(open), snapshot: snapshot() });
  const id = a.id || `att_${Date.now()}`;
  const checkIn = a.checkIn || new Date().toISOString();
  withTransaction(() => {
    db.prepare('INSERT INTO attendance (id,staff_name,role,check_in,check_out,date) VALUES (?,?,?,?,?,?)')
      .run(id, staffName, String(a.role || ''), checkIn, null, date);
  });
  res.status(201).json({ ok: true, attendance: rowAttendance(db.prepare('SELECT * FROM attendance WHERE id=?').get(id)), snapshot: snapshot() });
});

app.patch('/api/attendance/:id/checkout', (req, res) => {
  const cur = db.prepare('SELECT * FROM attendance WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  if (cur.check_out) return res.json({ ok: true, attendance: rowAttendance(cur), snapshot: snapshot() });
  const now = new Date().toISOString();
  db.prepare('UPDATE attendance SET check_out=? WHERE id=?').run(now, cur.id);
  res.json({ ok: true, attendance: rowAttendance(db.prepare('SELECT * FROM attendance WHERE id=?').get(cur.id)), snapshot: snapshot() });
});

app.put('/api/attendance', (req, res) => {
  db.prepare('DELETE FROM attendance').run();
  const ins = db.prepare('INSERT INTO attendance (id,staff_name,role,check_in,check_out,date) VALUES (?,?,?,?,?,?)');
  for (const a of req.body || []) {
    ins.run(a.id || `att_${Date.now()}_${Math.random()}`, String(a.staffName || ''), String(a.role || ''), a.checkIn || '', a.checkOut || null, a.date || '');
  }
  res.json({ ok: true });
});

// ================ expenses (reception daily expense tracking) ================
app.get('/api/expenses', (req, res) => {
  res.json(db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all().map(rowExpense));
});

app.post('/api/expenses', (req, res) => {
  const e = req.body || {};
  if (!String(e.title || '').trim()) return res.status(400).json({ error: 'Title is required' });
  const id = e.id || `exp_${Date.now()}`;
  withTransaction(() => {
    db.prepare('INSERT OR REPLACE INTO expenses (id,title,category,amount,note,created_at) VALUES (?,?,?,?,?,?)')
      .run(id, String(e.title).trim(), String(e.category || ''), Number(e.amount || 0), String(e.note || ''), e.createdAt || new Date().toISOString());
  });
  res.status(201).json({ ok: true, expense: rowExpense(db.prepare('SELECT * FROM expenses WHERE id=?').get(id)), snapshot: snapshot() });
});

app.delete('/api/expenses/:id', (req, res) => {
  withTransaction(() => { db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id); });
  res.json({ ok: true, snapshot: snapshot() });
});

// ================ bookings (table reservations — calendar) ================
app.get('/api/bookings', (req, res) => {
  res.json(snapshot().bookings);
});

app.post('/api/bookings', (req, res) => {
  const b = req.body || {};
  if (!String(b.name || '').trim()) return res.status(400).json({ error: 'Name is required' });
  if (!b.bookingDate) return res.status(400).json({ error: 'Booking date is required' });
  const id = b.id || `bkg_${Date.now()}`;
  withTransaction(() => {
    db.prepare('INSERT OR REPLACE INTO bookings (id,name,phone,booking_date,booking_time,guests,note,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, String(b.name).trim(), String(b.phone || ''), b.bookingDate, String(b.bookingTime || ''), Number(b.guests || 2), String(b.note || ''), b.status || 'CONFIRMED', b.createdAt || new Date().toISOString());
  });
  res.status(201).json({ ok: true, booking: rowBooking(db.prepare('SELECT * FROM bookings WHERE id=?').get(id)), snapshot: snapshot() });
});

app.patch('/api/bookings/:id/cancel', (req, res) => {
  db.prepare("UPDATE bookings SET status='CANCELLED' WHERE id=?").run(req.params.id);
  res.json({ ok: true, snapshot: snapshot() });
});

// ================ staff (roster for the Staff panel + attendance) ================
app.get('/api/staff', (req, res) => {
  res.json(snapshot().staff);
});

app.post('/api/staff', (req, res) => {
  const s = req.body || {};
  if (!String(s.name || '').trim()) return res.status(400).json({ error: 'Name is required' });
  const id = s.id || `stf_${Date.now()}`;
  withTransaction(() => {
    db.prepare('INSERT OR REPLACE INTO staff (id,name,role,phone,active,created_at) VALUES (?,?,?,?,?,?)')
      .run(id, String(s.name).trim(), String(s.role || 'waiter'), String(s.phone || ''), 1, s.createdAt || new Date().toISOString());
  });
  res.status(201).json({ ok: true, staff: rowStaff(db.prepare('SELECT * FROM staff WHERE id=?').get(id)), snapshot: snapshot() });
});

app.delete('/api/staff/:id', (req, res) => {
  withTransaction(() => { db.prepare('UPDATE staff SET active = 0 WHERE id=?').run(req.params.id); });
  res.json({ ok: true, snapshot: snapshot() });
});

// ================ attendance extras (manual entry + delete) ================
app.post('/api/attendance/manual', (req, res) => {
  const a = req.body || {};
  if (!String(a.staffName || '').trim()) return res.status(400).json({ error: 'Staff name is required' });
  if (!a.date) return res.status(400).json({ error: 'Date is required' });
  const id = a.id || `att_${Date.now()}`;
  withTransaction(() => {
    db.prepare('INSERT OR REPLACE INTO attendance (id,staff_name,role,check_in,check_out,date) VALUES (?,?,?,?,?,?)')
      .run(id, String(a.staffName).trim(), String(a.role || ''), a.checkIn || null, a.checkOut || null, a.date);
  });
  res.status(201).json({ ok: true, attendance: rowAttendance(db.prepare('SELECT * FROM attendance WHERE id=?').get(id)), snapshot: snapshot() });
});

app.delete('/api/attendance/:id', (req, res) => {
  withTransaction(() => { db.prepare('DELETE FROM attendance WHERE id=?').run(req.params.id); });
  res.json({ ok: true, snapshot: snapshot() });
});

// ================ logo upload ====================================
app.post('/api/logo', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Extract base64 data from data URL
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid image format' });

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Save to public/logo.ext
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // Remove old logo files
    fs.readdirSync(publicDir).forEach(f => {
      if (/^logo\.(png|jpg|jpeg|gif|webp)$/i.test(f)) fs.unlinkSync(path.join(publicDir, f));
    });

    const logoPath = path.join(publicDir, `logo.${ext}`);
    fs.writeFileSync(logoPath, buffer);

    // Store just the path in settings
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cafeLogo', `/logo.${ext}`);
    res.json({ ok: true, path: `/logo.${ext}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/logo', (req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    fs.readdirSync(publicDir).forEach(f => {
      if (/^logo\.(png|jpg|jpeg|gif|webp)$/i.test(f)) fs.unlinkSync(path.join(publicDir, f));
    });
    db.prepare('DELETE FROM settings WHERE key = ?').run('cafeLogo');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================ UPI QR codes (multiple — one per bank/app) ================
// Each upload appends to the `upiQrs` JSON setting: [{"id","label","path"}, ...]
// The legacy single `upiQr` setting always mirrors the FIRST QR so old clients keep working.
const readQrList = () => {
  try {
    const parsed = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='upiQrs'").get()?.value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

app.post('/api/upi-qr', (req, res) => {
  try {
    const { image, label } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid image format' });

    const ext = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // Deterministic id: qr1, qr2, … (reuses a freed slot if one was deleted)
    const qrs = readQrList();
    const used = new Set(qrs.map(q => String(q.id)));
    let n = 1;
    while (used.has(String(n))) n++;
    const id = String(n);
    const qrPath = path.join(publicDir, `upi-qr-${id}.${ext}`);
    fs.writeFileSync(qrPath, buffer);

    const entry = { id, label: String(label || '').trim() || `Bank ${n}`, path: `/upi-qr-${id}.${ext}` };
    const nextQrs = [...qrs, entry];
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('upiQrs', JSON.stringify(nextQrs));
    if (nextQrs[0]) db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('upiQr', nextQrs[0].path);
    res.json({ ok: true, path: entry.path, qr: entry, qrs: nextQrs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/upi-qr', (req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const qrs = readQrList();
    const id = req.query.id ? String(req.query.id) : '';
    if (id) {
      // remove one QR (by id) and its file
      const victim = qrs.find(q => String(q.id) === id);
      if (victim && fs.existsSync(path.join(publicDir, victim.path.replace(/^\//, '')))) {
        fs.unlinkSync(path.join(publicDir, victim.path.replace(/^\//, '')));
      }
      const nextQrs = qrs.filter(q => String(q.id) !== id);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('upiQrs', JSON.stringify(nextQrs));
      if (nextQrs[0]) db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('upiQr', nextQrs[0].path);
      else db.prepare('DELETE FROM settings WHERE key = ?').run('upiQr');
    } else {
      // remove all
      fs.readdirSync(publicDir).forEach(f => {
        if (/^upi-qr-\d*\.(png|jpg|jpeg|gif|webp)$/i.test(f) || /^upi-qr\.(png|jpg|jpeg|gif|webp)$/i.test(f)) fs.unlinkSync(path.join(publicDir, f));
      });
      db.prepare('DELETE FROM settings WHERE key IN (?, ?)').run('upiQrs', 'upiQr');
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================ database backups (auto daily + manual) ================
const BACKUP_DIR = path.join(__dirname, 'backups');
const todayStamp = () => new Date().toISOString().slice(0, 10);

const doBackup = () => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `cafe-backup-${todayStamp()}.db`);
  if (fs.existsSync(file)) fs.rmSync(file);
  // VACUUM INTO writes a consistent snapshot (safe while WAL is active)
  db.exec(`VACUUM INTO '${file.split('\\').join('/')}'`);
  // keep only the last 7 dated backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^cafe-backup-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort();
  while (files.length > 7) {
    try { fs.rmSync(path.join(BACKUP_DIR, files.shift())); } catch { /* ignore */ }
  }
  console.log('✔ DB backup created:', file);
  return file;
};

app.get('/api/backups', (req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const list = fs.readdirSync(BACKUP_DIR)
      .filter((f) => /^cafe-backup-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort()
      .reverse()
      .map((f) => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, sizeKB: Math.max(1, Math.round(st.size / 1024)), modified: st.mtime.toISOString() };
      });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/backup', (req, res) => {
  try {
    res.json({ ok: true, path: doBackup() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------- extract: download a backup file (data as a single .db file) --------
app.get('/api/backups/:name/download', (req, res) => {
  const name = String(req.params.name || '');
  if (!/^cafe-backup-\d{4}-\d{2}-\d{2}\.db$/.test(name)) return res.status(400).json({ error: 'invalid backup name' });
  const file = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'backup not found' });
  res.download(file);
});

// -------- restore: upload a .db data file and replace live data --------
// Accepts raw bytes (application/octet-stream). Validates the SQLite header,
// snapshots the current DB first (safety), then copies every table from the
// uploaded file into the live database inside one transaction.
app.post('/api/restore-db', (req, res) => {
  const chunks = [];
  let size = 0;
  req.on('data', (ch) => {
    size += ch.length;
    if (size > 200 * 1024 * 1024) { req.destroy(); return; } // 200MB hard cap
    chunks.push(ch);
  });
  req.on('error', () => res.status(500).json({ error: 'upload failed' }));
  req.on('end', () => {
    try {
      const buf = Buffer.concat(chunks);
      if (buf.length < 100 || buf.slice(0, 15).toString('latin1') !== 'SQLite format 3') {
        return res.status(400).json({ error: 'Not a SQLite database file' });
      }
      // safety snapshot of current data before overwriting
      try { doBackup(); } catch { /* keep going even if snapshot fails */ }
      const tmp = path.join(BACKUP_DIR, `restore-upload-${Date.now()}.db`);
      fs.writeFileSync(tmp, buf);
      try {
        const up = new DatabaseSync(tmp, { readOnly: true });
        const tables = up.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name);
        const restored = [];
        withTransaction(() => {
          for (const t of tables) {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) continue; // sanity
            const liveCols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
            if (!liveCols.length) continue; // table doesn't exist in live schema — skip
            const upCols = up.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
            const cols = upCols.filter((c) => liveCols.includes(c));
            if (!cols.length) continue;
            const rows = up.prepare(`SELECT ${cols.map((c) => `[${c}]`).join(',')} FROM [${t}]`).all();
            if (!rows.length) { restored.push({ table: t, rows: 0 }); continue; }
            db.prepare(`DELETE FROM [${t}]`).run();
            const ins = db.prepare(`INSERT INTO [${t}] (${cols.map((c) => `[${c}]`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
            for (const r of rows) ins.run(...cols.map((c) => r[c]));
            restored.push({ table: t, rows: rows.length });
          }
        });
        up.close();
        console.log('✔ DB restored from uploaded file:', restored.map((r) => `${r.table}(${r.rows})`).join(', '));
        res.json({ ok: true, restored });
      } finally {
        try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('restore-db failed:', e.message);
      res.status(500).json({ error: e.message });
    }
  });
});

// auto-backup: on startup, then refresh today's snapshot every 30 minutes
try { doBackup(); } catch (e) { console.error('startup backup failed:', e.message); }
setInterval(() => {
  try { doBackup(); } catch (e) { console.error('auto-backup failed:', e.message); }
}, 30 * 60 * 1000);

// -------- serve the built frontend (production / npm start) --------
// Serve uploaded assets (logo, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✔ Café API running → http://localhost:${PORT}`);
  console.log(`✔ Frontend ${fs.existsSync(DIST) ? 'served from dist' : 'run "npm run dev" for the dev dashboard'}`);
});