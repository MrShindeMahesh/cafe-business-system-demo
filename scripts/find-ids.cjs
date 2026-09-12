'use strict';
const fs = require('fs');
const m = require('./src/data/laCasaMenu.js').laCasaMenu;
const want = [
  'Black Tea','Green Tea','Korean Tea','Masala Chai','Ginger Tea','Lemon Tea','Peppermint Tea','Butter Tea','Kashmiri Tea','Cinnamon Tea',
  'Mango Lassi','Sweet Lassi','Salted Lassi','Banana Lassi','Avocado Smoothie','Chikoo Shake','Badam Milk','Kesar Badam Milk','Mango Smoothie',
  'Fresh Lime Soda','Cold Coffee','Cappuccino','Latte','Espresso','Flat White','Mocha','Cold Brew','Iced Tea','Lemon Iced Tea',
  'Milkshake - Chocolate','Milkshake - Strawberry','Milkshake - Vanilla','Milkshake - Mango',
  'Lemon Coriander','Manchow Soup','Sweet Corn Soup','Tomato Soup','Palak Soup','Mixed Vegetable',
  'Thecha','Green Salad','Caesar Salad','Russian Salad','Fruit Salad','Sweet Corn Chaat','Paneer Tikka Chaat',
  'Aloo Tikki','Kachori','Samosa','Dahi Batata Puri','Vada Pav','Medu Vada','Poha','Aloo Paratha','Makki Rotla',
  'Kadi Pakora','Handvo','Dhokla',
  'Plain Dal','Dal Tadka','Dal Makhani','Dal Fry','Dal Lahbori','Dal Kairi Masala','Dal Gosht','Dal Bukhara','Kadai Dal',
  'Kadai Paneer','Kadai Chicken','Kadai Mushroom','Kadai Shimla Mirch','Kadai Beans','Kadai Bhindi','Kadai Baingan',
  'Kadai Tinda','Kadai Lauki','Kadai Kheema',
  'Paneer Kadai','Paneer Saoji','Paneer Masala','Palak Paneer','Paneer Butter Masala','Paneer Tikka Masala',
  'Matar Paneer','Paneer Hyderabadi','Paneer Mumtaz'
];
const map = {};
m.forEach(i => { map[i.name.trim().toLowerCase()] = i; });
console.log('=== FOUND ===');
want.forEach(name => {
  const key = name.trim().toLowerCase();
  const item = map[key];
  if (item) console.log(item.id, '|', item.name, '| cat:', item.category);
  else console.log('MISSING:', name);
});
console.log('\n=== DRINKS CATEGORY ITEMS (lc_100+) ===');
m.filter(i => parseInt(i.id.slice(3)) >= 100 && parseInt(i.id.slice(3)) < 200).forEach(i => console.log(i.id, '|', i.name, '|', i.category));
console.log('\n=== ITEMS 200-299 ===');
m.filter(i => parseInt(i.id.slice(3)) >= 200 && parseInt(i.id.slice(3)) < 300).forEach(i => console.log(i.id, '|', i.name, '|', i.category));
console.log('\n=== ITEMS 300+ ===');
m.filter(i => parseInt(i.id.slice(3)) >= 300).slice(0,5).forEach(i => console.log(i.id, '|', i.name, '|', i.category));
