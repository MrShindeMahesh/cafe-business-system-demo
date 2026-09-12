'use strict';
const fs = require('fs');
const s = fs.readFileSync('./src/data/laCasaMenu.js', 'utf8');
// parse into items using regex on the export const laCasaMenu = [...];
const bodyMatch = s.match(/export const laCasaMenu = (\[[\s\S]*?\]);/);
if (!bodyMatch) { console.log('could not find export'); process.exit(1); }
const items = JSON.parse(bodyMatch[1]);
console.log('total items:', items.length);

// Show items that have variants — check they are beverages
const withVars = items.filter(i => i.variants && i.variants.length);
console.log('\n=== ITEMS WITH VARIANTS (' + withVars.length + ') ===');
withVars.forEach(i => {
  const optStr = (i.variants[0] && i.variants[0].options) ? i.variants[0].options.map(o => o.name + ':' + o.price).join(' ') : 'none';
  console.log(i.id, '|', i.name.padEnd(25), '| cat:', i.category.padEnd(18), '| opts:', optStr);
});

// Show items with addons that contain 'shot' or 'espresso' or 'syrup' — should be drinks
const shotAddons = items.filter(i => i.addons && i.addons.some(a => /shot|espresso|syrup|whipped|choc drizzle|drizzle/i.test(a.name)));
console.log('\n=== ITEMS WITH SHOT/SYRUP/DRIP ADDONS (' + shotAddons.length + ') ===');
shotAddons.forEach(i => console.log(i.id, '|', i.name.padEnd(25), '| cat:', i.category.padEnd(18), '| addons:', i.addons.map(a => a.name).join(', ')));

// Show items with 'Jalebi' or 'Malai' addons — should be lassis
const lassiAddons = items.filter(i => i.addons && i.addons.some(a => /jalebi|malai/i.test(a.name)));
console.log('\n=== ITEMS WITH JALEBI/MALAI ADDONS (' + lassiAddons.length + ') ===');
lassiAddons.forEach(i => console.log(i.id, '|', i.name.padEnd(25), '| cat:', i.category, '| addons:', i.addons.map(a => a.name + ':' + a.price).join(', ')));

// Show veg=false items
const nonVeg = items.filter(i => i.veg === false);
console.log('\n=== NON-VEG ITEMS (' + nonVeg.length + ') ===');
nonVeg.forEach(i => console.log(i.id, '|', i.name.padEnd(25), '| cat:', i.category, '| spice:', i.spiceLevel, '| cost:', i.costPrice));

// Items where costPrice > price (impossible — flag)
const badCost = items.filter(i => i.costPrice !== undefined && i.costPrice > i.price);
console.log('\n=== ITEMS WHERE COST > PRICE (' + badCost.length + ') ===');
badCost.forEach(i => console.log(i.id, '|', i.name, '| price:', i.price, '| cost:', i.costPrice));
