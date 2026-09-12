import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { laCasaMenu } from '../data/laCasaMenu';
import { seedInventory, seedCustomers, defaultTables, defaultSettings } from '../data/seedData';
import { getForceRestore, clearForceRestore } from '../lib/localDb';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

const API = '/api';

const fetchState = async () => {
  try {
    const r = await fetch(`${API}/state`);
    if (r.ok) return await r.json();
  } catch {}
  return null;
};

export const DataProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState(defaultTables);
  const [bills, setBills] = useState([]);
  const [menu, setMenu] = useState(laCasaMenu);
  const [inventory, setInventory] = useState(seedInventory);
  const [customers, setCustomers] = useState(seedCustomers);
  const [settings, setSettings] = useState(defaultSettings);
  const [serverOnline, setServerOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const setAll = (snap) => {
    if (!snap) return;
    if (Array.isArray(snap.menu)) setMenu(snap.menu);
    if (Array.isArray(snap.orders)) setOrders(snap.orders);
    if (Array.isArray(snap.tables)) setTables(snap.tables);
    if (Array.isArray(snap.inventory)) setInventory(snap.inventory);
    if (Array.isArray(snap.customers)) setCustomers(snap.customers);
    if (Array.isArray(snap.bills)) setBills(snap.bills);
    if (snap.settings && typeof snap.settings === 'object') {
      setSettings((prev) => {
        // Logo persists in localStorage — don't let API snapshot wipe it out
        const localLogo = localStorage.getItem('pos_cafe_logo');
        const merged = { ...prev, ...snap.settings };
        if (localLogo && !merged.cafeLogo) merged.cafeLogo = localLogo;
        return merged;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getForceRestore()) clearForceRestore();
      const snap = await fetchState();
      if (cancelled) return;
      if (snap) {
        setAll(snap);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const addOrder = useCallback(async (orderData) => {
    const items = orderData.items || [];
    const subtotal = items.reduce((s, i) => s + (i.calculatedPrice || 0), 0);
    const total = subtotal;
    const createdAt = new Date().toISOString();
    const orderId = orderData.id || `ord_${Date.now()}`;
    const newOrder = { ...orderData, id: orderId, subtotal, total, status: orderData.status || 'NEW', createdAt };

    setOrders((prev) => [newOrder, ...prev]);

    setInventory((prevInv) => {
      const deductions = {};
      items.forEach((it) => {
        const qty = it.quantity || 1;
        const recipe = it.recipe || (it.fullItem ? it.fullItem.recipe : []) || [];
        recipe.forEach((r) => { if (r.inventoryId) deductions[r.inventoryId] = (deductions[r.inventoryId] || 0) + Number(r.amount || 0) * qty; });
        if (it.inventoryId) deductions[it.inventoryId] = (deductions[it.inventoryId] || 0) + Number(it.stockUsed || 1) * qty;
      });
      return prevInv.map((inv) => {
        if (deductions[inv.id]) {
          const newQty = Math.max(0, Number((inv.quantity - deductions[inv.id]).toFixed(2)));
          let newStatus = 'In Stock';
          if (newQty <= 2) newStatus = 'Critical';
          else if (newQty <= 5) newStatus = 'Low Stock';
          return { ...inv, quantity: newQty, status: newStatus };
        }
        return inv;
      });
    });

    if (orderData.customerPhone) {
      setCustomers((prev) => {
        const existing = prev.find((c) => c.phone === orderData.customerPhone);
        if (existing) {
          return prev.map((c) => c.phone === orderData.customerPhone ? { ...c, orders: c.orders + 1, totalSpent: c.totalSpent + total, lastVisit: createdAt } : c);
        }
        return [...prev, { id: 'c' + Date.now(), name: orderData.customerName || 'Guest', phone: orderData.customerPhone, orders: 1, totalSpent: total, lastVisit: createdAt }];
      });
    }

    if (orderData.tableId) {
      const tNum = parseInt(String(orderData.tableId).replace(/\D/g, ''), 10);
        setTables((prev) => prev.map((t) => {
          const tNum2 = parseInt(String(t.number || t.id).replace(/\D/g, ''), 10);
          return tNum2 === tNum ? { ...t, status: 'Occupied' } : t;
        }));
      }

    if (serverOnline) {
      fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newOrder) }).catch(() => {});
    }
    return newOrder;
  }, [serverOnline]);

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (serverOnline) {
      fetch(`${API}/orders/${orderId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }).catch(() => {});
    }
  }, [serverOnline]);

  const requestBill = useCallback(async (tableId) => {
    const bill = { id: `bill_${Date.now()}`, tableId: String(tableId), status: 'REQUESTED', requestedAt: new Date().toISOString() };
    setBills((prev) => [bill, ...prev]);
    if (serverOnline) {
      fetch(`${API}/bills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bill) }).catch(() => {});
    }
  }, [serverOnline]);

  const addTable = useCallback(async () => {
    const max = Math.max(0, ...tables.map((t) => parseInt(String(t.number).replace(/\D/g, ''), 10) || 0));
    const newNum = max + 1;
    const table = { id: `table_${newNum}`, number: String(newNum).padStart(2, '0'), status: 'Available' };
    setTables((prev) => [...prev, table]);
    if (serverOnline) {
      fetch(`${API}/tables`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(table) }).catch(() => {});
    }
  }, [tables, serverOnline]);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (serverOnline) {
      fetch(`${API}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) }).catch(() => {});
    }
  }, [serverOnline]);

  const setMenuAndPersist = useCallback(async (newMenu) => {
    setMenu(newMenu);
    if (serverOnline) {
      fetch(`${API}/menu`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMenu) }).catch(() => {});
    }
  }, [serverOnline]);

  const setInventoryAndPersist = useCallback(async (newInv) => {
    setInventory(newInv);
    if (serverOnline) {
      fetch(`${API}/inventory`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newInv) }).catch(() => {});
    }
  }, [serverOnline]);

  const setOrdersAndPersist = useCallback(async (newOrders) => {
    setOrders(newOrders);
    if (serverOnline) {
      fetch(`${API}/orders`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newOrders) }).catch(() => {});
    }
  }, [serverOnline]);

  const setCustomersAndPersist = useCallback(async (newCust) => {
    setCustomers(newCust);
    if (serverOnline) {
      fetch(`${API}/customers`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCust) }).catch(() => {});
    }
  }, [serverOnline]);

  const setTablesAndPersist = useCallback(async (newTables) => {
    setTables(newTables);
    if (serverOnline) {
      fetch(`${API}/tables`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTables) }).catch(() => {});
    }
  }, [serverOnline]);

  const setBillsAndPersist = useCallback(async (newBills) => {
    setBills(newBills);
    if (serverOnline) {
      fetch(`${API}/bills`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBills) }).catch(() => {});
    }
  }, [serverOnline]);

  const refresh = useCallback(async () => {
    const snap = await fetchState();
    if (snap) {
      setAll(snap);
      setServerOnline(true);
    } else {
      setServerOnline(false);
    }
  }, []);

  const value = {
    menu, setMenu: setMenuAndPersist, orders, setOrders: setOrdersAndPersist,
    tables, setTables: setTablesAndPersist, bills, setBills: setBillsAndPersist,
    customers, setCustomers: setCustomersAndPersist, inventory, setInventory: setInventoryAndPersist,
    settings, updateSettings, addOrder, placeOrder: addOrder, updateOrderStatus,
    requestBill, addTable, serverOnline, loading, refresh,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem' }}>Connecting to database...</p>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
