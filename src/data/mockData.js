export const initialMenu = [
  {
    id: 'm1',
    name: 'Cappuccino',
    category: 'Coffee',
    price: 149,
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80',
    description: 'Rich espresso with steamed milk and a deep layer of foam.',
    available: true,
    variants: [
      { name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }
    ],
    addons: [
      { name: 'Extra Shot', price: 50 },
      { name: 'Vanilla Syrup', price: 30 }
    ]
  },
  {
    id: 'm2',
    name: 'Café Latte',
    category: 'Coffee',
    price: 159,
    image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&q=80',
    description: 'Smooth espresso with steamed milk and a light layer of foam.',
    available: true,
    variants: [
      { name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }
    ],
    addons: [{ name: 'Extra Shot', price: 50 }, { name: 'Caramel Syrup', price: 30 }]
  },
  {
    id: 'm3',
    name: 'Americano',
    category: 'Coffee',
    price: 129,
    image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&q=80',
    description: 'Espresso with hot water, a true coffee lover\'s drink.',
    available: true,
    variants: [],
    addons: [{ name: 'Extra Shot', price: 50 }]
  },
  {
    id: 'm4',
    name: 'Cold Coffee',
    category: 'Cold Drinks',
    price: 179,
    image: 'https://images.unsplash.com/photo-1461023058943-0708e52150fe?w=500&q=80',
    description: 'Classic creamy iced blended coffee.',
    available: true,
    variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
    addons: [{ name: 'Ice Cream Scoop', price: 40 }, { name: 'Whipped Cream', price: 30 }]
  },
  {
    id: 'm5',
    name: 'French Fries',
    category: 'Snacks',
    price: 129,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
    description: 'Crispy golden potato fries, salted to perfection.',
    available: true,
    variants: [],
    addons: [{ name: 'Cheese Dip', price: 30 }, { name: 'Mayo', price: 20 }]
  },
  {
    id: 'm6',
    name: 'Peri Peri Fries',
    category: 'Snacks',
    price: 159,
    image: 'https://images.unsplash.com/photo-1630431341973-02e1b662cecb?w=500&q=80',
    description: 'Spicy peri-peri seasoned french fries.',
    available: true,
    variants: [],
    addons: [{ name: 'Cheese Dip', price: 30 }]
  },
  {
    id: 'm7',
    name: 'Cheese Sandwich',
    category: 'Snacks',
    price: 179,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80',
    description: 'Grilled sandwich loaded with melting cheese.',
    available: true,
    variants: [],
    addons: [{ name: 'Extra Cheese', price: 40 }]
  },
  {
    id: 'm8',
    name: 'Classic Veg Burger',
    category: 'Burgers',
    price: 199,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80',
    description: 'Crispy veggie patty with fresh lettuce and our signature sauce.',
    available: true,
    variants: [],
    addons: [{ name: 'Extra Cheese Slice', price: 30 }, { name: 'Fries on side', price: 60 }]
  },
  {
    id: 'm9',
    name: 'Chocolate Cake',
    category: 'Desserts',
    price: 169,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80',
    description: 'Rich, moist chocolate cake with dark chocolate ganache.',
    available: true,
    variants: [],
    addons: [{ name: 'Vanilla Ice Cream', price: 40 }]
  }
];

export const initialTables = Array.from({ length: 12 }, (_, i) => ({
  id: (i + 1).toString(),
  number: String(i + 1).padStart(2, '0'),
  status: 'Available', // 'Available', 'Occupied', 'Ordering'
}));

export const initialOrders = [
  {
    id: '1040',
    tableId: '3',
    items: [
      { ...initialMenu[3], quantity: 1, calculatedPrice: 179 },
      { ...initialMenu[4], quantity: 2, calculatedPrice: 258 }
    ],
    subtotal: 437,
    tax: 22,
    total: 459,
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    customerNote: 'Extra ketchup for fries'
  },
  {
    id: '1038',
    tableId: '11',
    items: [
      { ...initialMenu[1], quantity: 2, calculatedPrice: 318 },
      { ...initialMenu[8], quantity: 1, calculatedPrice: 169 }
    ],
    subtotal: 487,
    tax: 24,
    total: 511,
    status: 'READY',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    customerNote: ''
  }
];

export const initialCustomers = [
  { id: 'c1', name: 'Rahul', phone: '98XXXXXX21', orders: 8, totalSpent: 2840, lastVisit: '2023-10-24' },
  { id: 'c2', name: 'Priya', phone: '97XXXXXX55', orders: 3, totalSpent: 1250, lastVisit: '2023-10-25' },
];
