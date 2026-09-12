// Generic CSV / JSON export helpers for the admin dashboard reports.

const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// columns: array of { label, get: (row) => value }
export function downloadCsv(filename, rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = (rows || []).map((row) => columns.map((c) => csvEscape(c.get(row))).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ordersCsvColumns = [
  { label: 'Order ID', get: (o) => o.id },
  { label: 'Date', get: (o) => (o.createdAt ? new Date(o.createdAt).toLocaleString() : '') },
  { label: 'Table', get: (o) => o.tableId },
  { label: 'Customer', get: (o) => o.customerName || '' },
  { label: 'Phone', get: (o) => o.customerPhone || '' },
  { label: 'Items', get: (o) => (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join('; ') },
  { label: 'Subtotal', get: (o) => o.subtotal ?? 0 },
  { label: 'Total', get: (o) => o.total ?? 0 },
  { label: 'Status', get: (o) => o.status },
];

export const menuCsvColumns = [
  { label: 'ID', get: (m) => m.id },
  { label: 'Name', get: (m) => m.name },
  { label: 'Category', get: (m) => m.category },
  { label: 'Price', get: (m) => m.price },
  { label: 'Available', get: (m) => (m.available ? 'Yes' : 'No') },
  { label: 'Description', get: (m) => m.description || '' },
  { label: 'Recipe', get: (m) => (m.recipe || []).map((r) => `${r.name}: ${r.amount} ${r.unit}`).join('; ') },
];

export const inventoryCsvColumns = [
  { label: 'ID', get: (i) => i.id },
  { label: 'Item', get: (i) => i.name },
  { label: 'Quantity', get: (i) => i.quantity },
  { label: 'Unit', get: (i) => i.unit },
  { label: 'Status', get: (i) => i.status },
];

export const customersCsvColumns = [
  { label: 'ID', get: (c) => c.id },
  { label: 'Name', get: (c) => c.name },
  { label: 'Phone', get: (c) => c.phone },
  { label: 'Total Orders', get: (c) => c.orders },
  { label: 'Total Spent', get: (c) => c.totalSpent },
  { label: 'Last Visit', get: (c) => (c.lastVisit ? new Date(c.lastVisit).toLocaleString() : '') },
];
