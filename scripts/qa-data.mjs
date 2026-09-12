// QA data-integrity checks — run: node scripts/qa-data.mjs
import { laCasaMenu } from '../src/data/laCasaMenu.js';
import { seedInventory, seedCustomers, defaultTables, defaultSettings } from '../src/data/seedData.js';
import { ACCESS } from '../src/lib/roles.js';

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + extra}`);
  ok ? pass++ : fail++;
};

// Menu integrity
const ids = laCasaMenu.map((i) => i.id);
const dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
check('Menu has 183 items', laCasaMenu.length === 183, `got ${laCasaMenu.length}`);
check('All menu IDs unique', dupIds.length === 0, dupIds.join(','));
check('All prices are positive numbers', laCasaMenu.every((i) => typeof i.price === 'number' && i.price > 0),
  laCasaMenu.filter((i) => !(typeof i.price === 'number' && i.price > 0)).map((i) => `${i.id}:${i.price}`).join(','));
check('All items have names', laCasaMenu.every((i) => i.name && i.name.trim().length > 0));
check('All items have images', laCasaMenu.every((i) => i.image && i.image.startsWith('http')));
check('All items available flag set', laCasaMenu.every((i) => i.available === true));
check('Category count = 20', new Set(laCasaMenu.map((i) => i.category)).size === 20, `got ${new Set(laCasaMenu.map((i) => i.category)).size}`);
check('Every item has recipe/variants/addons arrays', laCasaMenu.every((i) => Array.isArray(i.recipe) && Array.isArray(i.variants) && Array.isArray(i.addons)));

// Other seeds
check('Inventory seed = 5 items', seedInventory.length === 5);
check('Inventory IDs unique', new Set(seedInventory.map((i) => i.id)).size === 5);
check('Customers seed = 2', seedCustomers.length === 2);
check('Tables seed = 8, numbers unique', defaultTables.length === 8 && new Set(defaultTables.map((t) => t.number)).size === 8);
check('Settings have no taxRate (GST removed)', !('taxRate' in defaultSettings));

// Role access matrix consistency
const ROUTE_KEYS = ['index', 'take-order', 'kitchen', 'todays-orders', 'history', 'tables', 'menu', 'inventory', 'customers', 'analytics', 'settings'];
check('Every route key has an access rule', ROUTE_KEYS.every((k) => Object.values(ACCESS).some((a) => a.includes(k))));
check('Admin can access everything', ROUTE_KEYS.every((k) => ACCESS.admin.includes(k)));
check('Kitchen role is locked to kitchen only', ACCESS.kitchen.length === 1 && ACCESS.kitchen[0] === 'kitchen');
check('Waiter cannot access billing-sensitive pages', !ACCESS.waiter.includes('settings') && !ACCESS.waiter.includes('analytics') && !ACCESS.waiter.includes('inventory'));
check('Reception cannot access settings/analytics/menu-edit', !ACCESS.reception.includes('settings') && !ACCESS.reception.includes('analytics') && !ACCESS.reception.includes('inventory'));

console.log(`\nRESULT: ${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail > 0 ? 1 : 0);
