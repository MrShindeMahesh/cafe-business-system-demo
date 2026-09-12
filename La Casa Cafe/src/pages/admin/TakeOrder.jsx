import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle2, X, Search, Printer, Pencil } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

// Staff order-taking screen — walk-in / waiter orders. Builds the exact same
// payload as customer QR orders so inventory, customers & tables update automatically.
export default function TakeOrder() {
  const navigate = useNavigate();
  const { menu, tables, orders, addOrder, updateOrder } = useData();
  const { role } = useAuth();
  const [params] = useSearchParams();

  // Parcel (takeaway) mode — /admin/take-order?mode=parcel → orders get tableId 'PARCEL'
  const isParcelMode = params.get('mode') === 'parcel';
  const [tableId, setTableId] = useState(isParcelMode ? 'PARCEL' : (params.get('table') || ''));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cart, setCart] = useState([]);
  const [placed, setPlaced] = useState(null);
  const [saving, setSaving] = useState(false);
  // Phase 1 — edit mode: /admin/take-order?edit=<orderId>
  const editId = params.get('edit');
  const isEdit = !!editId;
  const editOrder = editId ? orders.find((o) => String(o.id) === String(editId)) : null;
  const [editLoaded, setEditLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [...new Set(menu.map((m) => m.category))];
  const visibleCategories = categoryFilter === 'All' ? categories : categories.filter((c) => c === categoryFilter);
  const availableMenu = menu.filter((m) => {
    if (m.available === false) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    }
    return true;
  });

  const addItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuId === item.id
            ? { ...c, quantity: c.quantity + 1, calculatedPrice: (c.quantity + 1) * item.price }
            : c
        );
      }
      return [
        ...prev,
        {
          menuId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          calculatedPrice: item.price,
          recipe: item.recipe || [],
          inventoryId: item.inventoryId,
          stockUsed: item.stockUsed,
          customizations: { variants: {}, addons: {}, instructions: '' },
        },
      ];
    });
  };

  const changeQty = (menuId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuId !== menuId) return c;
          const q = c.quantity + delta;
          return q <= 0 ? null : { ...c, quantity: q, calculatedPrice: q * c.price };
        })
        .filter(Boolean)
    );
  };

  const subtotal = cart.reduce((s, c) => s + c.calculatedPrice, 0);
  const total = subtotal;

  // Staff tagging — which floor staff is taking this order.
  const staffName = role && role !== 'admin' ? (role === 'reception' ? 'Reception' : 'Waiter') : '';

  const placeOrder = async () => {
    if (!tableId || cart.length === 0) return;
    const items = cart.map(({ menuId, ...rest }) => ({ menuId, ...rest, customizationString: '' }));
    const order = await addOrder({
      tableId,
      items,
      subtotal,
      tax: 0,
      total,
      customerName: name || 'Walk-in Guest',
      customerPhone: phone || undefined,
      staffName,
    });
    setCart([]);
    setName('');
    setPhone('');
    setPlaced(order);
  };

  // ---- Edit mode: preload the existing ticket into the cart (once) ----
  useEffect(() => {
    if (!isEdit || editLoaded) return;
    const ord = orders.find((o) => String(o.id) === String(editId));
    if (!ord) return;
    setTableId(String(ord.tableId || ''));
    setName(ord.customerName && ord.customerName !== 'Walk-in Guest' ? ord.customerName : '');
    setPhone(ord.customerPhone || '');
    setCart((ord.items || []).map((it) => ({
      menuId: it.menuId || it.name,
      name: it.name,
      price: it.quantity ? Number(it.calculatedPrice || it.price || 0) / it.quantity : Number(it.price || 0),
      quantity: it.quantity || 1,
      calculatedPrice: Number(it.calculatedPrice || it.price || 0),
      recipe: it.recipe || [],
      inventoryId: it.inventoryId,
      stockUsed: it.stockUsed,
      customizations: it.customizations || { variants: {}, addons: {}, instructions: '' },
      customizationString: it.customizationString || '',
    })));
    setEditLoaded(true);
  }, [isEdit, editId, orders, editLoaded]);

  const saveEdit = async () => {
    if (!isEdit || !editOrder || cart.length === 0) return;
    setSaving(true);
    try {
      const items = cart.map((c) => ({
        menuId: c.menuId, name: c.name, price: c.price, quantity: c.quantity,
        calculatedPrice: c.calculatedPrice, recipe: c.recipe, inventoryId: c.inventoryId,
        stockUsed: c.stockUsed, customizations: c.customizations,
        customizationString: c.customizationString || '',
      }));
      const res = await updateOrder(editId, { items, customerName: name || 'Walk-in Guest', customerPhone: phone || undefined, staffName });
      const added = (res && res.addedItems) || [];
      setPlaced({ id: editOrder.id, tableId: editOrder.tableId, createdAt: editOrder.createdAt, items: added, total: items.reduce((s, i) => s + (i.calculatedPrice || 0), 0), updated: true });
      setCart([]);
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && editOrder && editOrder.status === 'SERVED') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '460px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <CheckCircle2 size={56} color="var(--color-text-muted)" style={{ margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '.5rem' }}>Order #{editId} is already settled</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem', marginBottom: '1.5rem' }}>Settled orders cannot be edited.</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/tables')}>Back to Tables</button>
        </div>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '460px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <CheckCircle2 size={56} color="var(--color-success)" style={{ margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '.5rem' }}>
            {placed.updated ? `Order #${placed.id} Updated!` : `Order #${placed.id} Placed!`}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem', marginBottom: '1.5rem' }}>
            {placed.updated
              ? `${placed.items.length ? placed.items.length + ' new item(s) sent to kitchen' : 'Quantities changed — nothing new for the kitchen'} · ${String(placed.tableId).toUpperCase() === 'PARCEL' ? 'Parcel' : `Table ${String(placed.tableId).replace(/\D/g, '') || placed.tableId}`} · New total ₹${placed.total}`
              : `Sent to kitchen for ${String(placed.tableId).toUpperCase() === 'PARCEL' ? 'Parcel (takeaway)' : `Table ${String(placed.tableId).replace(/\D/g, '') || placed.tableId}`} · Total ₹${placed.total}`}
          </p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {placed.updated
              ? <button className="btn btn-primary" onClick={() => navigate('/admin/tables')}>Back to Tables</button>
              : <button className="btn btn-primary" onClick={() => setPlaced(null)}>Take Another Order</button>}
            <button
              className="btn btn-outline"
              disabled={!placed.items.length}
              onClick={async () => {
                try {
                  const res = await fetch('/api/print-kot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: placed.id, tableId: placed.tableId, items: placed.items, createdAt: placed.createdAt }),
                  });
                  const data = await res.json();
                  if (data.ok) alert('KOT sent to the thermal printer at the main machine!');
                  else if (data.logged) alert('No printer configured — KOT logged to logs/print.log on the main machine.');
                  else alert('KOT print failed: ' + (data.error || 'unknown error'));
                } catch (e) {
                  alert('KOT print failed: ' + e.message);
                }
              }}
            >
              <Printer size={15} /> {placed.updated ? 'Print KOT (New Items)' : 'Print KOT'}
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/admin')}>Live Orders</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">{isEdit ? `Edit Order #${editId}` : isParcelMode ? 'Parcel / Takeaway Order' : 'Take Order'}</h2>
          <p className="admin-page-sub">{isEdit ? 'Change quantities or add new items, then Update Order. Only the extra items are deducted from stock.' : isParcelMode ? 'Takeaway order — no table needed. Settle it in the Parcel panel.' : 'Tap items to add them, then send the order to the kitchen.'}</p>
        </div>
        {!isParcelMode && (
          <select value={tableId} onChange={(e) => setTableId(e.target.value)} disabled={isEdit} title={isEdit ? 'Table is locked while editing a ticket' : undefined} style={{ padding: '.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: 600, minWidth: '170px' }}>
            <option value="">-- Select Table --</option>
            {tables.map((t) => (
              <option key={t.id} value={String(t.number || t.id)}>Table {String(t.number).replace(/\D/g, '') || t.number}</option>
            ))}
          </select>
        )}
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setCategoryFilter('All')}
          className={categoryFilter === 'All' ? 'category-pill category-pill-active' : 'category-pill category-pill-inactive'}
          style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 600, cursor: 'pointer', background: categoryFilter === 'All' ? 'var(--color-primary)' : 'var(--color-border)', color: categoryFilter === 'All' ? '#fff' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
        >
          All ({availableMenu.length})
        </button>
        {categories.map((cat) => {
          const count = availableMenu.filter((m) => m.category === cat).length;
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={active ? 'category-pill category-pill-active' : 'category-pill category-pill-inactive'}
              style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 600, cursor: 'pointer', background: active ? 'var(--color-primary)' : 'var(--color-border)', color: active ? '#fff' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <div className="input-with-icon">
          <Search size={16} className="input-icon" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Menu grid */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {visibleCategories.map((cat) => (
            <div key={cat}>
              <p style={{ fontSize: '.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', marginBottom: '.6rem' }}>{cat}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '.75rem' }}>
                {availableMenu.filter((m) => m.category === cat).map((item) => (
                  <button key={item.id} onClick={() => addItem(item)} className="card" style={{ padding: '.85rem', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '.25rem' }}>{item.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>₹{item.price}</span>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={13} /></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cart panel */}
        <div className="card" style={{ flex: '0 1 320px', position: 'sticky', top: '1rem', padding: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>
            <ShoppingCart size={17} /> Order Summary
          </h3>
          {cart.length === 0 ? (
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>Tap menu items to add them.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1rem' }}>
              {cart.map((c) => (
                <div key={c.menuId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                  <span style={{ fontSize: '.85rem', fontWeight: 600, flex: 1 }}>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <button className="action-icon-btn" onClick={() => changeQty(c.menuId, -1)}><Minus size={13} /></button>
                    <b style={{ minWidth: '18px', textAlign: 'center' }}>{c.quantity}</b>
                    <button className="action-icon-btn" onClick={() => changeQty(c.menuId, 1)}><Plus size={13} /></button>
                    <button className="action-icon-btn danger" onClick={() => changeQty(c.menuId, -c.quantity)}><Trash2 size={13} /></button>
                  </div>
                  <span style={{ fontSize: '.85rem', fontWeight: 700, minWidth: '52px', textAlign: 'right' }}>₹{c.calculatedPrice}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.875rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary)' }}><span>Total</span><span>₹{total}</span></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1rem' }}>
            <input type="text" placeholder="Customer name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="tel" maxLength="10" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
          </div>

          {isEdit ? (
            <>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={cart.length === 0 || saving} onClick={saveEdit}>
                {saving ? 'Saving…' : 'Update Order'}
              </button>
              <button className="btn btn-outline" style={{ width: '100%' }} disabled={saving} onClick={() => navigate('/admin/tables')}>Cancel Editing</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={!tableId || cart.length === 0} onClick={placeOrder}>
                {isParcelMode ? 'Place Parcel Order' : `Place Order ${tableId ? `· Table ${String(tableId).replace(/\D/g, '')}` : ''}`}
              </button>
              {!tableId && <p style={{ fontSize: '.72rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '.5rem' }}>Select a table first</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


