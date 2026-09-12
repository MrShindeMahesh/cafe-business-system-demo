// Role definitions + access control for the 4 staff panels.

export const ROLES = {
  admin: { key: 'admin', label: 'Admin', tagline: 'Full control', home: '/admin' },
  reception: { key: 'reception', label: 'Reception', tagline: 'Orders, tables & bills', home: '/admin' },
  waiter: { key: 'waiter', label: 'Waiter', tagline: 'Serve & table status', home: '/admin' },
  kitchen: { key: 'kitchen', label: 'Kitchen', tagline: 'KOT screen', home: '/admin/kitchen' },
};

// Which nav/route keys each role can access.
export const ACCESS = {
  admin: ['index', 'take-order', 'kitchen', 'todays-orders', 'history', 'tables', 'menu', 'inventory', 'customers', 'analytics', 'settings'],
  reception: ['index', 'take-order', 'todays-orders', 'tables', 'customers'],
  waiter: ['index', 'take-order', 'tables', 'menu'],
  kitchen: ['kitchen'],
};

export const canAccess = (role, key) => (ACCESS[role] || []).includes(key);
