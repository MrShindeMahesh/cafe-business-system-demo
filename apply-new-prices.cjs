// apply-new-prices.cjs — one-shot price updater
// Usage:  node apply-new-prices.cjs
// Updates menu prices in server/cafe.db to the current rate card.
// Order history is NOT touched — old bills keep the prices actually charged.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.argv[2] || path.join(__dirname, 'server', 'cafe.db');

const PRICES = {
  'paneer kadai': 330, 'paneer saoji': 300, 'paneer masala': 300, 'palak paneer': 300,
  'paneer butter masala': 320, 'paneer tikka masala': 320, 'matar paneer': 300,
  'paneer hyderabadi': 320, 'paneer mumtaz': 320, 'korma paneer': 320, 'paneer bhurji': 320,
  'kaju paneer masala': 340, 'tawa paneer': 320, 'paneer angara': 320, 'paneer makhanwala': 320,
  'paneer shahi karma': 320, 'paneer lahori': 320, 'paneer kali mirch': 320, 'paneer lababdar': 320,
  'paneer pasanda': 320, 'paneer patiala': 320, 'paneer maharaja': 320,
  'manchurian dry/gravy': 240, 'saya kentucky': 240, 'mushroom 65': 330,
  'mushroom chilli dry/gravy': 330, 'veg 65': 240, 'veg crispy': 240,
  'paneer chilli-dry/gravy': 290, 'paneer 65': 290, 'paneer kentucky': 290,
  'hakka noodles': 230, 'schezwan noodles': 240, 'soya noodles': 240, 'manchurian noodles': 260,
  'chinese bhel': 220, 'mushroom noodles': 340, 'paneer noodles': 280,
  'aglio olio': 260, 'marinara pasta': 280, 'alfreda pasta': 290, 'mac & cheese': 320,
  'veg fried rice': 240, 'schezwan fried rice': 260, 'soya fried rice': 240,
  'manchurian fried rice': 250, 'burnt garlic rice': 260, 'mushroom fried rice': 310,
  'paneer fried rice': 320, 'triple schezwan fried rice': 290,
  'classic nachos': 240, 'cheese chilli nachos': 260, 'nachos chaat': 250,
  'loaded nachos': 260, 'mexican veg tacos': 260,
  'margherita': 340, 'mexican pizza': 350, 'mushroom pizza': 380, 'green garden pizza': 380,
  'paneer tikka pizza': 390, 'salted fries': 220, 'peri peri fries': 220,
  'cheesy fries': 260, 'loaded fries': 240, 'honey chilli fries': 260,
  "grilled onion & mushroom s'wich": 290, 'paneer tikka sandwich': 300,
  'peppy paneer sandwich': 380, 'paneer tikka burger': 300,
  'shev bhaji': 220, 'chana masala': 220, 'bhindi fry': 220, 'bhindi masala': 220,
  'tawa besan': 220, 'baingan masala': 220, 'soyabean masala': 220, 'veg bhuna': 220,
  'jeera aloo': 250, 'veg kofta': 300, 'aloo matar': 240, 'methi masala': 250,
  'veg kolhapuri': 250, 'kaju karara': 350, 'methi matar masala': 280, 'kaju masala': 350,
  'mix veg hyderabadi': 220, 'kaju malai': 350, 'mushroom masala': 320, 'mushroom kadhai': 320,
  'soya achari tikka': 260, 'afghani soya chaap': 280, 'banjara soya chaap': 280,
  'veg seekh kabab': 280, 'hara bhara kabab': 280, 'mushroom tikka': 330,
  'paneer achari tikka': 330, 'banjara paneer tikka': 340, 'paneer afgani tikka': 340,
  'paneer tikka': 340, 'hara bhara paneer tikka': 340, 'paneer guljari': 340,
};

const norm = (s) => String(s).toLowerCase()
  .replace(/mashroom/g, 'mushroom')
  .replace(/chiense/g, 'chinese')
  .replace(/\s+/g, ' ')
  .trim();

const db = new DatabaseSync(dbPath);
const items = db.prepare('SELECT id, name, price FROM menu').all();
const upd = db.prepare('UPDATE menu SET price=? WHERE id=?');

let updated = 0, same = 0;
const missing = [];
db.exec('BEGIN');
for (const [name, price] of Object.entries(PRICES)) {
  const it = items.find(i => norm(i.name) === name);
  if (!it) { missing.push(name); continue; }
  if (it.price !== price) { upd.run(price, it.id); updated++; }
  else same++;
}
db.exec('COMMIT');
console.log('✔ Prices updated :', updated);
console.log('✔ Already correct:', same);
if (missing.length) console.log('⚠ Not found in menu:', missing.join(', '));
console.log('Done. Old order history untouched.');
