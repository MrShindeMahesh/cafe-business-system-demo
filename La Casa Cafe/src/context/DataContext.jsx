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
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
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
    if (Array.isArray(snap.payments)) setPayments(snap.payments);
    if (Array.isArray(snap.attendance)) setAttendance(snap.attendance);
    if (Array.isArray(snap.expenses)) setExpenses(snap.expenses);
    if (Array.isArray(snap.bookings)) setBookings(snap.bookings);
    if (Array.isArray(snap.staff)) setStaff(snap.staff);
    if (snap.settings && typeof snap.settings === 'object') {
      setSettings((prev) => ({ ...prev, ...snap.settings }));
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
      try {
        const res = await fetch(`${API}/orders/${orderId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
        const data = await res.json();
        if (data.snapshot) setAll(data.snapshot);
      } catch {}
    }
  }, [serverOnline]);

  // Phase 1 — order editing: full item-list replacement. Inventory is deducted
  // only for the ADDED quantity (same rule as the server: menuId first, then name).
  const updateOrder = useCallback(async (orderId, changes) => {
    const old = orders.find((o) => String(o.id) === String(orderId));
    if (!old) return { ok: false, addedItems: [] };
    const newItems = changes.items || old.items || [];

    const oldByMenu = new Map(), oldByName = new Map();
    (old.items || []).forEach((it) => {
      const q = it.quantity || 1;
      if (it.menuId) oldByMenu.set(it.menuId, (oldByMenu.get(it.menuId) || 0) + q);
      oldByName.set(it.name, (oldByName.get(it.name) || 0) + q);
    });

    const addedItems = [];
    const deductions = {};
    newItems.forEach((it) => {
      const before = (it.menuId && oldByMenu.has(it.menuId)) ? (oldByMenu.get(it.menuId) || 0) : (oldByName.get(it.name) || 0);
      const extra = (it.quantity || 1) - before;
      if (extra <= 0) return;
      addedItems.push({ ...it, quantity: extra });
      (it.recipe || []).forEach((r) => { if (r.inventoryId) deductions[r.inventoryId] = (deductions[r.inventoryId] || 0) + Number(r.amount || 0) * extra; });
      if (it.inventoryId) deductions[it.inventoryId] = (deductions[it.inventoryId] || 0) + Number(it.stockUsed || 1) * extra;
    });

    const subtotal = newItems.reduce((s, i) => s + (i.calculatedPrice || 0), 0);
    const updated = { ...old, ...changes, items: newItems, subtotal, total: subtotal };
    setOrders((prev) => prev.map((o) => (String(o.id) === String(orderId) ? updated : o)));

    setInventory((prevInv) => prevInv.map((inv) => {
      if (!deductions[inv.id]) return inv;
      const newQty = Math.max(0, Number((inv.quantity - deductions[inv.id]).toFixed(2)));
      const newStatus = newQty <= 2 ? 'Critical' : newQty <= 5 ? 'Low Stock' : 'In Stock';
      return { ...inv, quantity: newQty, status: newStatus };
    }));

    if (serverOnline) {
      fetch(`${API}/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: newItems, customerName: changes.customerName, customerPhone: changes.customerPhone }) }).catch(() => {});
    }
    return { ok: true, addedItems };
  }, [orders, serverOnline]);

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

  const setPaymentsAndPersist = useCallback(async (newPayments) => {
    setPayments(newPayments);
    if (serverOnline) {
      fetch(`${API}/payments`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPayments) }).catch(() => {});
    }
  }, [serverOnline]);

  // Settle a bill: POST the ONE payment record (atomic insert, no wipe-and-reinsert)
  // and apply the server snapshot so payments never get lost to the 5s poll.
  const addPayment = useCallback(async (payment) => {
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return data.payment || payment; }
      } catch {}
    }
    setPayments((prev) => [payment, ...prev]);
    return payment;
  }, [serverOnline]);

  const setAttendanceAndPersist = useCallback(async (newAttendance) => {
    setAttendance(newAttendance);
    if (serverOnline) {
      fetch(`${API}/attendance`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAttendance) }).catch(() => {});
    }
  }, [serverOnline]);

  const checkInAttendance = useCallback(async ({ staffName, role }) => {
    const date = new Date().toLocaleDateString('en-CA');
    const rec = { id: `att_${Date.now()}`, staffName, role, checkIn: new Date().toISOString(), checkOut: '', date };
    setAttendance((prev) =>
      prev.some((a) => a.date === date && a.staffName === staffName && !a.checkOut) ? prev : [rec, ...prev]
    );
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
        const data = await res.json();
        if (data.snapshot) setAll(data.snapshot);
      } catch { /* offline — local only */ }
    }
    return rec;
  }, [serverOnline]);

  const checkOutAttendance = useCallback(async (id) => {
    const now = new Date().toISOString();
    setAttendance((prev) => prev.map((a) => (a.id === id ? { ...a, checkOut: now } : a)));
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/attendance/${id}/checkout`, { method: 'PATCH' });
        const data = await res.json();
        if (data.snapshot) setAll(data.snapshot);
      } catch { /* offline — local only */ }
    }
  }, [serverOnline]);

  // ======== Expenses (reception daily expense tracking) ========
  const addExpense = useCallback(async (expense) => {
    const rec = { ...expense, id: expense.id || `exp_${Date.now()}`, createdAt: expense.createdAt || new Date().toISOString() };
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return data.expense || rec; }
      } catch { /* fall through to local */ }
    }
    setExpenses((prev) => [rec, ...prev]);
    return rec;
  }, [serverOnline]);

  const deleteExpense = useCallback(async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/expenses/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.snapshot) setAll(data.snapshot);
      } catch { /* offline — local only */ }
    }
  }, [serverOnline]);

  // ======== Bookings (table reservations — calendar) ========
  const addBooking = useCallback(async (booking) => {
    const rec = { ...booking, id: booking.id || `bkg_${Date.now()}`, createdAt: booking.createdAt || new Date().toISOString() };
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return data.booking || rec; }
      } catch { /* fall through to local */ }
    }
    setBookings((prev) => [...prev, rec].sort((a, b) => String(a.bookingDate).localeCompare(String(b.bookingDate))));
    return rec;
  }, [serverOnline]);

  const cancelBooking = useCallback(async (id) => {
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/bookings/${id}/cancel`, { method: 'PATCH' });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return; }
      } catch { /* offline — local only */ }
    }
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, [serverOnline]);

  // ======== Staff roster (Staff panel + attendance) ========
  const addStaff = useCallback(async (member) => {
    const rec = { ...member, id: member.id || `stf_${Date.now()}`, createdAt: member.createdAt || new Date().toISOString() };
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/staff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return data.staff || rec; }
      } catch { /* fall through to local */ }
    }
    setStaff((prev) => [...prev, rec].sort((a, b) => String(a.name).localeCompare(String(b.name))));
    return rec;
  }, [serverOnline]);

  const deleteStaff = useCallback(async (id) => {
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/staff/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return; }
      } catch { /* offline — local only */ }
    }
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }, [serverOnline]);

  // Manual attendance entry (admin fills date + in/out times)
  const addManualAttendance = useCallback(async (rec) => {
    const entry = { ...rec, id: rec.id || `att_${Date.now()}` };
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/attendance/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return data.attendance || entry; }
      } catch { /* fall through to local */ }
    }
    setAttendance((prev) => [entry, ...prev]);
    return entry;
  }, [serverOnline]);

  const deleteAttendance = useCallback(async (id) => {
    if (serverOnline) {
      try {
        const res = await fetch(`${API}/attendance/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.snapshot) { setAll(data.snapshot); return; }
      } catch { /* offline — local only */ }
    }
    setAttendance((prev) => prev.filter((a) => a.id !== id));
  }, [serverOnline]);

  // Move a ticket to a different table (table change)
  const moveOrder = useCallback(async (orderId, newTableId) => {
    const next = orders.map((o) => (String(o.id) === String(orderId) ? { ...o, tableId: String(newTableId) } : o));
    await setOrdersAndPersist(next);
    return true;
  }, [orders, setOrdersAndPersist]);

  const refresh = useCallback(async () => {
    const snap = await fetchState();
    if (snap) {
      setAll(snap);
      setServerOnline(true);
    } else {
      setServerOnline(false);
    }
  }, []);

  // Live sync: poll the server snapshot every 5s + refresh on window focus.
  // Must be defined AFTER `refresh` above — it's in this effect's deps array.
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 5000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const value = {
    menu, setMenu: setMenuAndPersist, orders, setOrders: setOrdersAndPersist,
    tables, setTables: setTablesAndPersist, bills, setBills: setBillsAndPersist,
    customers, setCustomers: setCustomersAndPersist, inventory, setInventory: setInventoryAndPersist,
    payments, setPayments: setPaymentsAndPersist, addPayment,
    attendance, setAttendance: setAttendanceAndPersist,
    checkInAttendance, checkOutAttendance,
    expenses, addExpense, deleteExpense,
    bookings, addBooking, cancelBooking,
    staff, addStaff, deleteStaff, addManualAttendance, deleteAttendance, moveOrder,
    settings, updateSettings, addOrder, placeOrder: addOrder, updateOrderStatus, updateOrder,
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
