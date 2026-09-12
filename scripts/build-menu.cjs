// Converts src/data/la_casa_menu.csv → src/data/laCasaMenu.js
// Run: node scripts/build-menu.js
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../src/data/la_casa_menu.csv');
const outPath = path.join(__dirname, '../src/data/laCasaMenu.js');

// Category → placeholder image (staff can change images later in Menu Management)
const IMAGES = {
  "Soup": 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=500&q=80',
  "Salad's": 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80',
  "Snack Stories": 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80',
  "Golden Crunch": 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=500&q=80',
  "Sizzler's": 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=500&q=80',
  "Sushi": 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80',
  "Casa Pizzeria": 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80',
  "Fries": 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80',
  "Between The Breads": 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80',
  "Noodle's Affair": 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=500&q=80',
  "Papad": 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
  "Pasta di Casa": 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=500&q=80',
  "Chinese Rice": 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=500&q=80',
  "Indian Rice": 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80',
  "Rice Bowl": 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=500&q=80',
  "Paneer Main Course": 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
  "Veg Main Course": 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
  "Dal Classic's": 'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=500&q=80',
  "Roti": 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80',
  "Kebab Corner": 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80',
  "Hot Drinks": 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=80',
  "Cold Coffees": 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=500&q=80',
  "Cookies": 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80',
  "Ice Cream": 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=500&q=80',
  "Coffee Add-ons": 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=500&q=80',
  "Mocktails": 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=500&q=80',
  "Indian Classics": 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80',
  "Dessert": 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=500&q=80',
};
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length >= 3 && r[0] && r[0].trim() && r[0].trim() !== 'Category');
}

const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
const items = rows.map((r, i) => {
  const [category, name, price, description] = r.map(s => (s || '').trim());
  return {
    id: `lc_${String(i + 1).padStart(3, '0')}`,
    name,
    category,
    price: Number(price) || 0,
    description: description || '',
    image: IMAGES[category] || FALLBACK_IMG,
    available: true,
    recipe: [],
    variants: [],
    addons: [],
  };
});

const out = `// AUTO-GENERATED from la_casa_menu.csv — do not edit by hand.
// Re-generate with:  node scripts/build-menu.js

export const laCasaMenu = ${JSON.stringify(items, null, 2)};
`;

fs.writeFileSync(outPath, out);
console.log(`Generated ${items.length} menu items across ${new Set(items.map(i => i.category)).size} categories → ${outPath}`);
