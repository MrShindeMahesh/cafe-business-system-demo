// Seed data for La Casa POS (stored in localStorage, no cloud).

// Empty on purpose — start fresh, add your own inventory as you go.
export const seedInventory = [];

// Empty on purpose — customers get added automatically when they place orders.
export const seedCustomers = [];

// 50 tables — enough for a full café floor.
export const defaultTables = Array.from({ length: 50 }, (_, i) => ({
  id: `table_${i + 1}`,
  number: String(i + 1).padStart(2, '0'),
  status: 'Available',
}));

export const defaultSettings = {
  cafeName: 'La Casa',
  contact: '+91 9876543210',
  address: 'Nagpur, Maharashtra',
  upiQr: '',
  // Tax & billing — Phase 1
  gstEnabled: false,
  gstRate: 18,
  gstIn: '',
  serviceChargeEnabled: false,
  serviceChargePercent: 5,
  tipEnabled: false,
  // Bill serial number configuration — numbering restarts at 1 every day
  // (first bill of the day = 1). Prefix/padding are optional cosmetics.
  billCounter: 0,
  billPrefix: '',
  billPadding: 0,
};
