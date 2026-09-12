'use strict';
const fs = require('fs');
const s = fs.readFileSync('./src/data/laCasaMenu.js', 'utf8');
const body = s.match(/\[([\s\S]*)\];/)[1];
const blocks = body.split(/},\n  \{/).filter(Boolean);
function show(id) {
  const b = blocks.find(c => '"id": "' + id + '"' === c.slice(c.indexOf('"id":'), c.indexOf('"id":') + 20));
  if (!b) { console.log(id, 'NOT FOUND'); return; }
  // naive parse: extract fields we care about
  const name = (b.match(/"name":\s*"([^"]+)"/) || [])[1];
  const veg = (b.match(/"veg":\s*(true|false)/) || [])[1];
  const spice = (b.match(/"spiceLevel":\s*"([^"]+)"/) || [])[1];
  const cost = (b.match(/"costPrice":\s*(\d+)/) || [])[1];
  const vCount = (b.match(/"variants":\s*\[[^\]]*"name"/g) || []).length;
  const aCount = (b.match(/"addons":\s*\[[^\]]*"name"/g) || []).length;
  console.log(id, '|', name, '| veg:', veg, '| spice:', spice, '| cost:', cost, '| vars:', vCount, '| addons:', aCount);
}
['lc_303','lc_301','lc_014','lc_002','lc_008','lc_009','lc_201','lc_305','lc_113','lc_021'].forEach(show);
