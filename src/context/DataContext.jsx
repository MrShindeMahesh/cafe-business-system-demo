import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [bills, setBills] = useState([]);

  // INVENTORY STATE STORED LOCALLY/CONTEXTUALLY
  const [inventory, setInventory] = useState([
    { id: 'inv1', name: 'Premium Coffee Beans', quantity: 12, unit: 'kg', status: 'In Stock' },
    { id: 'inv2', name: 'Whole Milk', quantity: 4, unit: 'Liters', status: 'Low Stock' },
    { id: 'inv3', name: 'Sugar Packets', quantity: 450, unit: 'pcs', status: 'In Stock' },
    { id: 'inv4', name: 'Paper Cups (Large)', quantity: 15, unit: 'pcs', status: 'Critical' },
    { id: 'inv5', name: 'Chocolate Syrup', quantity: 5, unit: 'Bottles', status: 'In Stock' }
  ]);

  // EXPANDED MENU WITH 10 ITEMS ACROSS MULTIPLE CATEGORIES
  const [menu, setMenu] = useState([
    {
      id: '1', name: 'Cappuccino', price: 149, category: 'Coffee',
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=80',
      description: 'Rich espresso with steamed milk foam.', available: true,
      recipe: [
        { inventoryId: 'inv1', name: 'Premium Coffee Beans', unit: 'kg', amount: 0.05 },
        { inventoryId: 'inv2', name: 'Whole Milk', unit: 'Liters', amount: 0.15 }
      ],
      variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
      addons: [{ name: 'Extra Shot', price: 50 }, { name: 'More Sugar / Sweet', price: 0 }]
    },
    {
      id: '2', name: 'Café Latte', price: 159, category: 'Coffee',
      image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=500&q=80',
      description: 'Smooth espresso with steamed milk and a light layer of foam.', available: true,
      recipe: [
        { inventoryId: 'inv1', name: 'Premium Coffee Beans', unit: 'kg', amount: 0.05 },
        { inventoryId: 'inv2', name: 'Whole Milk', unit: 'Liters', amount: 0.2 }
      ],
      variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
      addons: [{ name: 'Extra Shot', price: 50 }, { name: 'More Sugar / Sweet', price: 0 }]
    },
    {
      id: '3', name: 'French Fries', price: 129, category: 'Snacks',
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80',
      description: 'Crispy golden potato fries, salted to perfection.', available: true,
      recipe: [],
      variants: [],
      addons: [{ name: 'Extra Cheese', price: 40 }, { name: 'Cheese Dip', price: 30 }]
    },
    {
      id: '4', name: 'Peri Peri Fries', price: 159, category: 'Snacks',
      image: 'https://cookingwithparita.com/recipe/homemade-peri-peri-fries/',
      description: 'Spicy peri-peri seasoned french fries.', available: true,
      recipe: [],
      variants: [],
      addons: [{ name: 'Extra Cheese', price: 40 }, { name: 'Extra Spicy', price: 0 }]
    },
    {
      id: '5', name: 'Margherita Pizza', price: 249, category: 'Pizza',
      image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=500&q=80',
      description: 'Classic single cheese pizza with fresh basil and tomato base.', available: true,
      recipe: [],
      variants: [{ name: 'Crust', options: [{ name: 'Thin Crust', price: 0 }, { name: 'Cheese Burst', price: 60 }] }],
      addons: [{ name: 'Extra Mozzarella', price: 50 }, { name: 'Jalapenos', price: 25 }, { name: 'Black Olives', price: 25 }]
    },
    {
      id: '6', name: 'Farmhouse Veg Pizza', price: 299, category: 'Pizza',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80',
      description: 'Loaded with capsicum, onions, mushrooms, and sweet corn.', available: true,
      recipe: [],
      variants: [{ name: 'Crust', options: [{ name: 'Thin Crust', price: 0 }, { name: 'Cheese Burst', price: 60 }] }],
      addons: [{ name: 'Extra Mozzarella', price: 50 }, { name: 'Extra Spicy', price: 0 }]
    },
    {
      id: '7', name: 'Classic Veg Burger', price: 189, category: 'Burgers',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
      description: 'Crispy veggie patty with lettuce, tomatoes, and secret mayo.', available: true,
      recipe: [],
      variants: [],
      addons: [{ name: 'Extra Cheese Slice', price: 30 }, { name: 'Double Patty', price: 60 }]
    },
    {
      id: '8', name: 'Crispy Paneer Burger', price: 219, category: 'Burgers',
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=80',
      description: 'Spicy paneer patty layered with creamy coleslaw and cheese.', available: true,
      recipe: [],
      variants: [],
      addons: [{ name: 'Extra Cheese Slice', price: 30 }, { name: 'Jalapeno Poppers', price: 40 }]
    },
    {
      id: '9', name: 'Chocolate Lava Cake', price: 179, category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80',
      description: 'Warm chocolate cake with a gooey, flowing molten center.', available: true,
      recipe: [
        { inventoryId: 'inv5', name: 'Chocolate Syrup', unit: 'Bottles', amount: 0.1 }
      ],
      variants: [],
      addons: [{ name: 'Vanilla Ice Cream Scoop', price: 40 }, { name: 'Extra Choco Syrup', price: 20 }]
    },
    {
      id: '10', name: 'New York Cheesecake', price: 199, category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80',
      description: 'Creamy rich cheesecake slice with a buttery graham cracker crust.', available: true,
      recipe: [],
      variants: [],
      addons: [{ name: 'Strawberry Compote', price: 30 }, { name: 'Blueberry Compote', price: 30 }]
    }
  ]);

  const [customers, setCustomers] = useState([
    { id: '1', name: 'Shaarx', phone: '9876543210', orders: 15, totalSpent: 4250, lastVisit: '2026-08-29' },
    { id: '2', name: 'Priya Sharma', phone: '9123456789', orders: 8, totalSpent: 2100, lastVisit: '2026-08-28' }
  ]);

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('pos_settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      cafeName: 'Brew & Bite',
      contact: '+91 9876543210',
      address: 'Nagpur, Maharashtra',
      taxRate: 5
    };
  });

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubTables = onSnapshot(collection(db, 'tables'), (snapshot) => {
      const fetchedTables = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      if (fetchedTables.length === 0) {
        setTables(Array.from({ length: 8 }, (_, i) => ({ id: `table_${i + 1}`, number: String(i + 1).padStart(2, '0'), status: 'Available' })));
      } else {
        fetchedTables.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        setTables(fetchedTables);
      }
    });

    const unsubBills = onSnapshot(collection(db, 'bills'), (snapshot) => {
      setBills(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    return () => {
      unsubOrders();
      unsubTables();
      unsubBills();
    };
  }, []);

  const addOrder = async (orderData) => {
    const orderId = Math.floor(1000 + Math.random() * 9000).toString();
    const finalOrder = {
      ...orderData,
      id: orderId,
      status: 'NEW',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'orders', orderId), finalOrder);

    // AUTOMATICALLY DEDUCT ALL RECIPE INGREDIENTS FROM INVENTORY
    setInventory(prevInventory => {
      return prevInventory.map(invItem => {
        let totalDeduction = 0;

        orderData.items.forEach(orderedItem => {
          // 1. Check if the ordered item has a multi-item recipe array
          if (orderedItem.recipe && Array.isArray(orderedItem.recipe)) {
            orderedItem.recipe.forEach(recIngredient => {
              if (recIngredient.inventoryId === invItem.id) {
                totalDeduction += Number(recIngredient.amount) * orderedItem.quantity;
              }
            });
          }
          // 2. Fallback to single mapped stock if recipe isn't used
          else if (orderedItem.inventoryId === invItem.id) {
            totalDeduction += (Number(orderedItem.stockUsed) || 1) * orderedItem.quantity;
          }
        });

        if (totalDeduction > 0) {
          const newQty = Math.max(0, Number((invItem.quantity - totalDeduction).toFixed(2)));
          let newStatus = 'In Stock';
          if (newQty <= 2) newStatus = 'Critical';
          else if (newQty <= 5) newStatus = 'Low Stock';

          return { ...invItem, quantity: newQty, status: newStatus };
        }
        return invItem;
      });
    });

    // Update customer stats
    setCustomers(prev => {
      const existing = prev.find(c => c.phone === orderData.customerPhone);
      if (existing) {
        return prev.map(c => c.phone === orderData.customerPhone ? {
          ...c,
          orders: c.orders + 1,
          totalSpent: c.totalSpent + orderData.total,
          lastVisit: new Date().toISOString()
        } : c);
      }
      return [...prev, {
        id: 'c' + Date.now(),
        name: orderData.customerName,
        phone: orderData.customerPhone,
        orders: 1,
        totalSpent: orderData.total,
        lastVisit: new Date().toISOString()
      }];
    });

    return finalOrder;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
  };

  const requestBill = async (tableNumber) => {
    const billId = `bill_${Date.now()}`;
    await setDoc(doc(db, 'bills', billId), {
      tableId: String(tableNumber),
      status: 'REQUESTED',
      requestedAt: new Date().toISOString()
    });
  };

  const addTable = async () => {
    const nextNum = tables.length + 1;
    const tableId = `table_${nextNum}`;
    await setDoc(doc(db, 'tables', tableId), {
      id: tableId,
      number: String(nextNum).padStart(2, '0'),
      status: 'Available'
    });
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('pos_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    menu, setMenu,
    orders, setOrders,
    tables, setTables,
    bills, setBills,
    customers, setCustomers,
    inventory, setInventory,
    settings, updateSettings,
    addOrder,
    placeOrder: addOrder,
    updateOrderStatus,
    requestBill,
    addTable
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};