'use strict';
const fs = require('fs');
const path = require('path');

const MENU = path.join(__dirname, '..', 'src', 'data', 'laCasaMenu.js');
const OVERRIDES = require('./menu-overrides-phase1.json').items;

let src = fs.readFileSync(MENU, 'utf8');
let applied = 0;

for (const [id, ov] of Object.entries(OVERRIDES)) {
  const anchor = `"id": "${id}"`;
  const pos = src.indexOf(anchor);
  if (pos === -1) { console.warn('WARN: item', id, 'not found'); continue; }

  // find end of this item block: next item or closing bracket
  const nextItem = src.indexOf(',\n  {\n    "id":', pos + anchor.length);
  const closeBracket = src.indexOf('\n];', pos);
  const blockEnd = nextItem !== -1 ? nextItem : closeBracket;
  if (blockEnd === -1) { console.warn('WARN: end of', id, 'not found'); continue; }

  let block = src.slice(pos, blockEnd);

  // --- inject veg after "available": true/false ---
  block = block.replace(/"available":\s*(true|false)/, (m, v) => {
    return `${m}, "veg": ${ov.veg}`;
  });

  // --- spiceLevel after veg line ---
  block = block.replace(/"veg":\s*true|"veg":\s*false/, (m) => {
    return `${m},\n    "spiceLevel": "${ov.spiceLevel}"`;
  });

  // --- costPrice after spiceLevel line ---
  block = block.replace(/"spiceLevel":\s*"[^"]*"/, (m) => {
    return `${m},\n    "costPrice": ${ov.costPrice}`;
  });

  // --- variants ---
  if (ov.variants && ov.variants.length) {
    const vInner = ov.variants.map((o) => {
      const opts = (o.options || []).map((x) => `      { "name": "${x.name}", "price": ${x.price || 0} }`).join(',\n');
      return `    {\n      "name": "${o.name}",\n      "options": [\n${opts}\n      ]\n    }`;
    }).join(',\n');
    block = block.replace(/"variants":\s*\[[^\]]*\]/, `"variants": [\n${vInner}\n  ]`);
  }

  // --- addons ---
  if (ov.addons && ov.addons.length) {
    const aInner = ov.addons.map((a) => `    { "name": "${a.name}", "price": ${a.price || 0} }`).join(',\n');
    block = block.replace(/"addons":\s*\[[^\]]*\]/, `"addons": [\n${aInner}\n  ]`);
  }

  src = src.slice(0, pos) + block + src.slice(blockEnd);
  applied++;
}

fs.writeFileSync(MENU, src, 'utf8');
console.log(`✔ patched ${applied} items in laCasaMenu.js`);
