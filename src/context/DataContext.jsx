import React, { createContext, useState, useEffect, useContext } from 'react';
import { initialMenu, initialTables, initialOrders, initialCustomers } from '../data/mockData';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [menu, setMenu] = useState(() => {
    const saved = localStorage.getItem('bb_menu');
    return saved ? JSON.parse(saved) : initialMenu;
  });

  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem('bb_tables');
    return saved ? JSON.parse(saved) : initialTables;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('bb_orders');
    return saved ? JSON.parse(saved) : initialOrders;
  });

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('bb_customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem('bb_bills');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('bb_menu', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('bb_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('bb_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('bb_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('bb_bills', JSON.stringify(bills));
  }, [bills]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'bb_menu') setMenu(JSON.parse(e.newValue || '[]'));
      if (e.key === 'bb_tables') setTables(JSON.parse(e.newValue || '[]'));
      if (e.key === 'bb_orders') setOrders(JSON.parse(e.newValue || '[]'));
      if (e.key === 'bb_customers') setCustomers(JSON.parse(e.newValue || '[]'));
      if (e.key === 'bb_bills') setBills(JSON.parse(e.newValue || '[]'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addOrder = (orderData) => {
    const newOrder = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      ...orderData,
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    // 1. Add order to state
    setOrders((prev) => [newOrder, ...prev]);

    // 2. Update table status to Occupied
    setTables(prev => prev.map(t =>
      t.id === orderData.tableId ? { ...t, status: 'Occupied' } : t
    ));

    // 3. Update or Create Customer in the Customer List
    if (orderData.customerPhone && orderData.customerPhone !== 'N/A') {
      setCustomers(prev => {
        const existingCustomer = prev.find(c => c.phone === orderData.customerPhone);
        if (existingCustomer) {
          // Update existing customer stats
          return prev.map(c => c.phone === orderData.customerPhone
            ? { ...c, orders: c.orders + 1, totalSpent: c.totalSpent + orderData.total, lastVisit: new Date().toISOString() }
            : c
          );
        } else {
          // Add brand new customer
          return [...prev, {
            id: 'c' + Date.now(),
            name: orderData.customerName,
            phone: orderData.customerPhone,
            orders: 1,
            totalSpent: orderData.total,
            lastVisit: new Date().toISOString()
          }];
        }
      });
    }

    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const requestBill = (tableId) => {
    const activeOrder = orders.find(o => o.tableId === tableId && o.status !== 'SERVED');
    const newBill = {
      id: 'B' + Math.floor(1000 + Math.random() * 9000).toString(),
      tableId,
      orderId: activeOrder ? activeOrder.id : null,
      status: 'REQUESTED',
      createdAt: new Date().toISOString()
    };
    setBills(prev => [newBill, ...prev]);
  };

  return (
    <DataContext.Provider
      value={{
        menu, setMenu,
        tables, setTables,
        orders, setOrders,
        customers, setCustomers,
        bills, setBills,
        addOrder,
        updateOrderStatus,
        requestBill
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
