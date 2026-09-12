// ============================================================
// server.js — Express + SQLite API for the Café POS
// ============================================================
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { db } from './db.js';
import { printKitchenTicket, printSample, printReceipt } from './print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

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
});
const rowMenu = (r) => ({
  id: r.id, name: r.name, category: r.category, price: r.price, description: r.description,
  image: r.image, available: !!r.available,
  recipe: parseJson(r.recipe), variants: parseJson(r.variants), addons: parseJson(r.addons),
});
const rowBill = (r) => ({ id: r.id, tableId: r.table_id, status: r.status, requestedAt: r.requested_at });

const getSettings = () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
};

const snapshot = () => ({
  orders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(rowOrder),
  menu: db.prepare('SELECT * FROM menu ORDER BY category, price').all().map(rowMenu),
  tables: db.prepare('SELECT * FROM tables ORDER BY number').all().map(rowTable),
  inventory: db.prepare('SELECT * FROM inventory').all().map(rowInventory),
  customers: db.prepare('SELECT * FROM customers').all().map(rowCustomer),
  bills: db.prepare('SELECT * FROM bills ORDER BY requested_at DESC').all().map(rowBill),
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
  db.prepare(`INSERT INTO menu (id,name,category,price,description,image,available,recipe,variants,addons)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, m.name || 'Item', m.category || '', m.price || 0, m.description || '', m.image || '',
      m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons));
  res.status(201).json(rowMenu(db.prepare('SELECT * FROM menu WHERE id=?').get(id)));
});

app.patch('/api/menu/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM menu WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE menu SET name=?, category=?, price=?, description=?, image=?, available=?, recipe=?, variants=?, addons=? WHERE id=?`)
    .run(req.body.name ?? cur.name, req.body.category ?? cur.category, req.body.price ?? cur.price,
      req.body.description ?? cur.description, req.body.image ?? cur.image,
      req.body.available === undefined ? cur.available : (req.body.available ? 1 : 0),
      j(req.body.recipe ?? parseJson(cur.recipe)), j(req.body.variants ?? parseJson(cur.variants)),
      j(req.body.addons ?? parseJson(cur.addons)), cur.id);
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
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM menu').run();
    const ins = db.prepare('INSERT INTO menu (id,name,category,price,description,image,available,recipe,variants,addons) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const m of arr) ins.run(m.id, m.name, m.category || '', m.price || 0, m.description || '', m.image || '', m.available === false ? 0 : 1, j(m.recipe), j(m.variants), j(m.addons));
  });
  tx();
  res.json({ ok: true, count: arr.length });
});

app.put('/api/inventory/bulk', (req, res) => {
  const arr = req.body || [];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM inventory').run();
    const ins = db.prepare('INSERT INTO inventory (id,name,quantity,unit,status) VALUES (?,?,?,?,?)');
    for (const i of arr) ins.run(i.id, i.name, i.quantity || 0, i.unit || '', i.status || 'In Stock');
  });
  tx();
  res.json({ ok: true, count: arr.length });
});

app.put('/api/tables/bulk', (req, res) => {
  const arr = req.body || [];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM tables').run();
    const ins = db.prepare('INSERT INTO tables (id, number, status) VALUES (?,?,?)');
    for (const t of arr) ins.run(t.id, t.number, t.status || 'Available');
  });
  tx();
  res.json({ ok: true, count: arr.length });
});

app.put('/api/customers/bulk', (req, res) => {
  const arr = req.body || [];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM customers').run();
    const ins = db.prepare('INSERT INTO customers (id,name,phone,orders,total_spent,last_visit) VALUES (?,?,?,?,?,?)');
    for (const c of arr) ins.run(c.id, c.name, c.phone || '', c.orders || 0, c.totalSpent || 0, c.lastVisit || '');
  });
  tx();
  res.json({ ok: true, count: arr.length });
});

app.put('/api/bills/bulk', (req, res) => {
  const arr = req.body || [];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM bills').run();
    const ins = db.prepare('INSERT INTO bills (id, table_id, status, requested_at) VALUES (?,?,?,?)');
    for (const b of arr) ins.run(b.id, String(b.tableId || ''), b.status || 'REQUESTED', b.requestedAt || new Date().toISOString());
  });
  tx();
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

  const place = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, table_id, items, subtotal, total, customer_name, customer_phone, status, created_at)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, String(d.tableId || ''), j(items), subtotal, total, d.customerName || '', d.customerPhone || '', status, createdAt);

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
  place();

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

// -------- serve the built frontend (production / npm start) --------
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✔ Café API running → http://localhost:${PORT}`);
  console.log(`✔ Frontend ${fs.existsSync(DIST) ? 'served from dist' : 'run "npm run dev" for the dev dashboard'}`);
});