// Local storage keys used by the app + force-restore marker for SQLite restore flow.
const KEYS = ['pos_orders', 'pos_tables', 'pos_bills', 'pos_menu', 'pos_menu_version', 'pos_inventory', 'pos_customers', 'pos_settings'];
export const FORCE_RESTORE_KEY = 'pos_force_restore';

export function clearLocalDb() {
  KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem(FORCE_RESTORE_KEY);
}

export function setForceRestore() {
  localStorage.setItem(FORCE_RESTORE_KEY, '1');
}

export function getForceRestore() {
  return localStorage.getItem(FORCE_RESTORE_KEY) === '1';
}

export function clearForceRestore() {
  localStorage.removeItem(FORCE_RESTORE_KEY);
}

export function backupAll() {
  const data = {};
  KEYS.forEach((k) => {
    const raw = localStorage.getItem(k);
    if (raw !== null) data[k] = raw;
  });
  return data;
}

export function restoreAll(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup payload');
  Object.entries(data).forEach(([k, v]) => {
        if (KEYS.includes(k) && (typeof v === 'string' || v === null)) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
  });
}