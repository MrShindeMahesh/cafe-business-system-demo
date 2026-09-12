// ============================================================
// print.js — thermal receipt / kitchen-ticket printing
//
// Two modes:
//   1) LAN/WiFi thermal printer (ESC/POS over TCP port 9100)
//      Configure via settings: printerIp, printerPort, autoPrintKitchen
//   2) If no printer configured → logs the ticket to /logs/print.log
//      (so the flow still "works" and you can test without hardware)
// ============================================================
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getSettings = () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
};

const ensureLogDir = () => {
  const dir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ESC/POS helpers
const ESC = '\x1b';
const init = `${ESC}@`;                       // reset printer
const alignCenter = `${ESC}a\x01`;
const alignLeft = `${ESC}a\x00`;
const boldOn = `${ESC}E\x01`;
const boldOff = `${ESC}E\x00`;
const doubleH = `${ESC}d\x01`;                // double height
const normalSize = `${ESC}d\x00`;
const cut = `${ESC}i`;
const feed = (n) => `${ESC}d${String.fromCharCode(n)}`;

function escpos(text, opts = {}) {
  const { center = false, bold = false, big = false } = opts;
  let out = '';
  if (center) out += alignCenter;
  if (bold) out += boldOn;
  if (big) out += doubleH;
  out += text + '\n';
  if (big) out += normalSize;
  if (bold) out += boldOff;
  if (center) out += alignLeft;
  return out;
}

function buildKitchenTicket({ id, tableId, items = [], createdAt, title = 'KITCHEN ORDER TICKET' }) {
  const settings = getSettings();
  const cafe = settings.cafeName || 'La Casa';
  const tNum = String(tableId || '').replace(/\D/g, '') || tableId || '?';
  const when = createdAt ? new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let out = init + alignCenter + boldOn + doubleH + cafe + normalSize + boldOff + '\n';
  out += (title || 'KITCHEN ORDER TICKET') + '\n';
  out += '==========================\n';
  out += alignLeft + `TABLE: ${tNum}        TIME: ${when}\n`;
  out += `ORDER #: ${id}\n`;
  out += '--------------------------\n';
  for (const it of items) {
    out += `${it.quantity || 1} x ${it.name}\n`;
    const cust = it.customizationString || (it.customizations && it.customizations.instructions) || '';
    if (cust) out += `   [${cust}]\n`;
  }
  out += '--------------------------\n';
  out += alignCenter + 'PLEASE SERVE FRESH & HOT\n';
  out += feed(3) + cut;
  return out;
}

// Send raw bytes to a network printer (port 9100 is the standard for
// Epson/Star thermal receipt printers on LAN/WiFi).
function sendToPrinter(ip, port, data) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ip, port: port || 9100 }, () => {
      socket.write(data);
      socket.end();
    });
    socket.on('error', (err) => reject(err));
    socket.setTimeout(5000, () => { socket.destroy(); reject(new Error('printer timeout')); });
    socket.on('close', () => resolve());
  });
}

export async function printKitchenTicket(order) {
  const settings = getSettings();
  const ip = settings.printerIp;

  if (!ip) {
    // No printer configured — log it so the flow is testable.
    const dir = ensureLogDir();
    const line = `[${new Date().toISOString()}] KITCHEN TICKET #${order.id} Table ${order.tableId}\n`;
    fs.appendFileSync(path.join(dir, 'print.log'), line);
    console.log('ℹ no printer configured — ticket logged to logs/print.log');
    return { logged: true };
  }

  const data = Buffer.from(buildKitchenTicket(order), 'latin1');
  await sendToPrinter(ip, Number(settings.printerPort || 9100), data);
  console.log(`✔ kitchen ticket #${order.id} sent to ${ip}`);
  return { ok: true };
}

export async function printReceipt({ table, orders: tableOrders, settings: customSettings }) {
  const settings = customSettings || getSettings();
  const ip = settings.printerIp;
  const cafe = settings.cafeName || 'La Casa';
  const tNum = String(table?.number || table?.id || '').replace(/\D/g, '') || '?';
  const now = new Date().toLocaleString('en-IN');

  const combinedSubtotal = tableOrders.reduce((s, o) => s + (Number(o.subtotal) || 0), 0);
  const combinedTotal = tableOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  // ---- 32-column bill layout helpers (standard 80mm thermal width) ----
  const W = 32;
  const wrap = (text, width) => {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + (cur ? ' ' : '') + w).length <= width) cur += (cur ? ' ' : '') + w;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };
  const row = (l, r) => {
    l = String(l); r = String(r);
    const avail = Math.max(1, W - r.length);
    return (l.length > avail ? l.slice(0, avail) : l.padEnd(avail)) + r;
  };
  const line = '-'.repeat(W);

  // ---- header ----
  let out = init + alignCenter + boldOn + doubleH + cafe + normalSize + boldOff + '\n';
  out += alignCenter + boldOn + '*** CASH BILL ***' + boldOff + '\n';
  out += alignLeft + `Table: ${tNum}\n`;
  out += `Date: ${now}\n`;
  out += `Tickets: ${tableOrders.length}\n`;
  out += line + '\n';

  // ---- items (consolidated, each with its amount) ----
  for (const ord of tableOrders) {
    for (const it of (ord.items || [])) {
      const qty = Number(it.quantity) || 1;
      const amount = Number(it.calculatedPrice ?? qty * (Number(it.price) || 0));
      const lines = wrap(`${qty} x ${it.name}`, W - `Rs.${amount}`.length - 1);
      lines.forEach((ln, i) => {
        out += (i === lines.length - 1 ? row(ln, `Rs.${amount}`) : ln) + '\n';
      });
      const cust = it.customizationString || (it.customizations && it.customizations.instructions) || '';
      if (cust) out += `   [${cust}]\n`;
    }
  }

  // ---- totals (skip Subtotal when it's identical to Grand Total) ----
  out += line + '\n';
  if (combinedSubtotal !== combinedTotal) {
    out += boldOn + row('Subtotal', `Rs.${combinedSubtotal}`) + boldOff + '\n';
  }
  out += boldOn + doubleH + row('GRAND TOTAL', `Rs.${combinedTotal}`) + normalSize + boldOff + '\n';
  out += line + '\n';
  out += alignCenter + 'Thank you! Visit again :)\n';
  out += feed(3) + cut;

  if (!ip) {
    const dir = ensureLogDir();
    fs.appendFileSync(path.join(dir, 'print.log'), `[${new Date().toISOString()}] BILL Table ${tNum} Rs.${combinedTotal} (${tableOrders.length} tickets)\n`);
    console.log('ℹ no printer configured — bill logged to logs/print.log');
    return { logged: true };
  }

  await sendToPrinter(ip, Number(settings.printerPort || 9100), Buffer.from(out, 'latin1'));
  console.log(`✔ bill Table ${tNum} sent to ${ip}`);
  return { ok: true };
}

export async function printSample({ text = 'Café POS — test print OK' } = {}) {
  const settings = getSettings();
  const ip = settings.printerIp;
  if (!ip) {
    const dir = ensureLogDir();
    fs.appendFileSync(path.join(dir, 'print.log'), `[${new Date().toISOString()}] SAMPLE: ${text}\n`);
    console.log('ℹ no printer configured — sample logged to logs/print.log');
    return { logged: true };
  }
  const out = init + alignCenter + boldOn + text + boldOff + '\n' + feed(3) + cut;
  await sendToPrinter(ip, Number(settings.printerPort || 9100), Buffer.from(out, 'latin1'));
  return { ok: true };
}