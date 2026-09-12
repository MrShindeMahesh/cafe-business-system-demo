#!/bin/sh
# print all item ids + names from laCasaMenu.js, one per line
cd /home/shaarx/Documents/Cafe
node -e '
const fs = require("fs");
const s = fs.readFileSync("./src/data/laCasaMenu.js","utf8");
const m = s.match(/export const laCasaMenu = (\[[\s\S]*?\]);/);
if(!m){process.exit(1);}
const items = JSON.parse(m[1]);
items.forEach(i => console.log(i.id + "|" + i.name + "|" + i.category));
' 2>/dev/null
