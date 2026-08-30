import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [bills, setBills] = useState([]);

  // ENRICHED MENU WITH VARIANTS, ADD-ONS, AND SPECIAL INSTRUCTION SUPPORT FOR EVERY ITEM
  const [menu, setMenu] = useState([
    {
      id: '1', name: 'Cappuccino', price: 149, category: 'Coffee',
      image: 'https://images.unsplash.com/photo-1573852179836-8a03896580f5?auto=format&fit=crop&w=300&q=80',
      description: 'Rich espresso with steamed milk foam.', available: true,
      variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
      addons: [{ name: 'Extra Shot', price: 50 }, { name: 'More Sugar / Sweet', price: 0 }, { name: 'Vanilla Syrup', price: 30 }]
    },
    {
      id: '2', name: 'Café Latte', price: 159, category: 'Coffee',
      image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=300&q=80',
      description: 'Smooth espresso with steamed milk and a light layer of foam.', available: true,
      variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
      addons: [{ name: 'Extra Shot', price: 50 }, { name: 'More Sugar / Sweet', price: 0 }, { name: 'Caramel Syrup', price: 30 }]
    },
    {
      id: '3', name: 'Americano', price: 129, category: 'Coffee',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80',
      description: 'Classic espresso diluted with hot water.', available: true,
      variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
      addons: [{ name: 'Extra Shot', price: 50 }, { name: 'More Sugar / Sweet', price: 0 }]
    },
    {
      id: '4', name: 'Cold Coffee', price: 179, category: 'Cold Drinks',
      image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=300&q=80',
      description: 'Classic creamy iced blended coffee.', available: true,
      variants: [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }],
      addons: [{ name: 'Ice Cream Scoop', price: 40 }, { name: 'More Sugar / Sweet', price: 0 }, { name: 'Whipped Cream', price: 30 }]
    },
    {
      id: '5', name: 'French Fries', price: 129, category: 'Snacks',
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80',
      description: 'Crispy golden potato fries, salted to perfection.', available: true,
      variants: [],
      addons: [{ name: 'Extra Cheese', price: 40 }, { name: 'Cheese Dip', price: 30 }, { name: 'Peri Peri Masala', price: 20 }]
    },
    {
      id: '6', name: 'Peri Peri Fries', price: 159, category: 'Snacks',
      image: 'https://images.unsplash.com/photo-1630431341973-02e1b662cecb?auto=format&fit=crop&w=500&q=80', // Updated crisp photo
      description: 'Spicy peri-peri seasoned french fries.', available: true,
      variants: [],
      addons: [{ name: 'Extra Cheese', price: 40 }, { name: 'Cheese Dip', price: 30 }, { name: 'Extra Spicy', price: 0 }]
    },
    {
      id: '7', name: 'Cheese Sandwich', price: 179, category: 'Snacks',
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80',
      description: 'Grilled sandwich loaded with melting cheese.', available: true,
      variants: [],
      addons: [{ name: 'Extra Cheese', price: 40 }, { name: 'Jalapenos', price: 20 }, { name: 'Toasted Crispy', price: 0 }]
    },
    {
      id: '8', name: 'Classic Veg Burger', price: 199, category: 'Burgers',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
      description: 'Crispy veggie patty with fresh lettuce and our signature sauce.', available: true,
      variants: [],
      addons: [{ name: 'Extra Cheese Slice', price: 30 }, { name: 'Extra Patty', price: 60 }, { name: 'No Onions', price: 0 }]
    },
    {
      id: '9', name: 'Chocolate Cake', price: 169, category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80',
      description: 'Rich, moist chocolate cake with dark chocolate ganache.', available: true,
      variants: [],
      addons: [{ name: 'Vanilla Ice Cream Scoop', price: 40 }, { name: 'Warm It Up', price: 0 }]
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