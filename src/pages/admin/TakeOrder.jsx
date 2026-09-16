import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle2, X, Search, Printer, Pencil, Layers } from 'lucide-react';
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

  // Phase 1 — item picker: when a menu item exposes variants or addons,
  // tapping it opens a small configuration modal so the staff can pick
  // size / extras / quantity before the line lands in the cart.
  const [itemPicker, setItemPicker] = useState(null); // { item, qty, variants: {}, addons: {} }
  const [pickerQty, setPickerQty] = useState(1);
  const [noteEditingId, setNoteEditingId] = useState(null); // cart line whose kitchen-note input is open

  const searchActive = !!searchQuery.trim();
  const categories = [...new Set(menu.map((m) => m.category))];
  const availableMenu = menu.filter((m) => {
    if (m.available === false) return false;
    if (searchActive) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    }
    return true;
  });
  // While searching: show ONLY categories that actually have matching items — no blank headers.
  // With a category selected: show only that category.
  const visibleCategories = searchActive
    ? categories.filter((c) => availableMenu.some((m) => m.category === c) && (categoryFilter === 'All' || c === categoryFilter))
    : (categoryFilter === 'All' ? categories : categories.filter((c) => c === categoryFilter));

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
          lineId: item.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
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

  // ---- Item picker (variants / addons / quantity) ----

  const openItemPicker = (item) => {
    if (!item) return;
    const hasVariants = !!(item.variants && item.variants.length);
    const hasAddons = !!(item.addons && item.addons.length);
    if (!hasVariants && !hasAddons) {
      // no configuration needed — add straight to cart
      addItem(item);
      return;
    }
    setPickerQty(1);
    setItemPicker({
      item,
      variants: {},
      addons: {},
      instructions: '',
    });
  };

  const closeItemPicker = () => {
    setItemPicker(null);
    setPickerQty(1);
  };

  const togglePickerVariant = (setIdx, optIdx) => {
    if (!itemPicker) return;
    const set = itemPicker.item.variants[setIdx];
    if (!set) return;
    const next = { ...itemPicker.variants };
    // clear other selections in the same variant set
    const key = String(setIdx);
    if (next[key] && next[key].setIdx === setIdx && next[key].optIdx !== optIdx) {
      delete next[key];
    }
    next[key] = { setIdx, optIdx, name: set.options[optIdx].name, priceDelta: set.options[optIdx].price || 0 };
    setItemPicker({ ...itemPicker, variants: next });
  };

  const togglePickerAddon = (addonIdx) => {
    if (!itemPicker) return;
    const addon = itemPicker.item.addons[addonIdx];
    if (!addon) return;
    const key = String(addonIdx);
    const next = { ...itemPicker.addons };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = { addonIdx, name: addon.name, priceDelta: addon.price || 0 };
    }
    setItemPicker({ ...itemPicker, addons: next });
  };

  const changePickerQty = (delta) => {
    setPickerQty((q) => Math.max(1, q + delta));
  };

  const computePickerLinePrice = () => {
    if (!itemPicker) return 0;
    const base = itemPicker.item.price || 0;
    let delta = 0;
    Object.values(itemPicker.variants).forEach((v) => { delta += v.priceDelta || 0; });
    Object.values(itemPicker.addons).forEach((a) => { delta += a.priceDelta || 0; });
    return (base + delta) * pickerQty;
  };

  const addItemFromPicker = () => {
    if (!itemPicker) return;
    const item = itemPicker.item;
    const linePrice = computePickerLinePrice();
    const variantLabels = Object.values(itemPicker.variants).map((v) => v.name).filter(Boolean);
    const addonLabels = Object.values(itemPicker.addons).map((a) => a.name).filter(Boolean);

    // Build a readable item name that includes variant + addon selections.
    const nameParts = [item.name];
    if (variantLabels.length) nameParts.push(variantLabels.join(', '));
    if (addonLabels.length) nameParts.push(addonLabels.join(', '));
    const displayName = nameParts.join(' · ');

    setCart((prev) => {
      const existing = prev.find((c) => c.menuId === item.id
        && JSON.stringify(c.customizations.variants) === JSON.stringify(itemPicker.variants)
        && JSON.stringify(c.customizations.addons) === JSON.stringify(itemPicker.addons)
        && (c.customizations.instructions || '') === (itemPicker.instructions || ''));
      if (existing) {
        return prev.map((c) =>
          c.lineId === existing.lineId
            ? { ...c, quantity: c.quantity + pickerQty, calculatedPrice: c.calculatedPrice + linePrice }
            : c
        );
      }
      return [
        ...prev,
        {
          lineId: item.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          menuId: item.id,
          name: displayName,
          price: item.price,
          quantity: pickerQty,
          calculatedPrice: linePrice,
          recipe: item.recipe || [],
          inventoryId: item.inventoryId,
          stockUsed: item.stockUsed,
          customizations: {
            variants: { ...itemPicker.variants },
            addons: { ...itemPicker.addons },
            instructions: itemPicker.instructions || '',
          },
        },
      ];
    });
    closeItemPicker();
  };

  const changeQty = (lineId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.lineId !== lineId) return c;
          const q = c.quantity + delta;
          return q <= 0 ? null : { ...c, quantity: q, calculatedPrice: q * c.price };
        })
        .filter(Boolean)
    );
  };

  // Kitchen note for a single cart line — stored in customizations.instructions
  // and mirrored to customizationString so it prints on the KOT and bills.
  const setLineNote = (lineId, text) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.lineId !== lineId) return c;
        const customizations = { ...(c.customizations || { variants: {}, addons: {} }), instructions: text };
        return { ...c, customizations, customizationString: text };
      })
    );
  };

  const subtotal = cart.reduce((s, c) => s + c.calculatedPrice, 0);
  const total = subtotal;

  // Staff tagging — which floor staff is taking this order.
  const staffName = role && role !== 'admin' ? (role === 'reception' ? 'Reception' : 'Waiter') : '';

  const placeOrder = async () => {
    if (!tableId || cart.length === 0) return;
    const items = cart.map((c) => ({
      menuId: c.menuId,
      name: c.name,
      price: c.price,
      quantity: c.quantity,
      calculatedPrice: c.calculatedPrice,
      recipe: c.recipe || [],
      inventoryId: c.inventoryId,
      stockUsed: c.stockUsed,
      customizations: c.customizations || { variants: {}, addons: {}, instructions: '' },
      customizationString: c.customizations && c.customizations.instructions ? c.customizations.instructions : '',
      variantList: Object.values(c.customizations?.variants || {}).map((v) => v.name).filter(Boolean),
      addonList: Object.values(c.customizations?.addons || {}).map((a) => a.name).filter(Boolean),
    }));
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
    setCart((ord.items || []).map((it, idx) => ({
      lineId: (it.menuId || it.name) + '-e' + idx,
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
        variantList: Object.values(c.customizations?.variants || {}).map((v) => v.name).filter(Boolean),
        addonList: Object.values(c.customizations?.addons || {}).map((a) => a.name).filter(Boolean),
      }));
      const res = await updateOrder(editId, { items, customerName: name || 'Walk-in Guest', customerPhone: phone || undefined, staffName });
      const added = (res && res.addedItems) || [];
      setPlaced({ id: editOrder.id, tableId: editOrder.tableId, createdAt: editOrder.createdAt, items: added, total: items.reduce((s, i) => s + (i.calculatedPrice || 0), 0), updated: true });
      setCart([]);
    } finally {
      setSaving(false);
    }
  };

  // NOTE: editing settled (SERVED) orders is allowed — the Edit button in
  // Today's Orders intentionally targets settled tickets (fix a wrong item,
  // add a missed one before the day-close report).

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

      {/* Category filter pills — hidden while searching (only matching items show) */}
      {!searchActive && (
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
      )}

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
                  <button key={item.id} onClick={() => openItemPicker(item)} className="card" style={{ padding: '.85rem', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '.25rem' }}>{item.name} {item.veg === false ? '🍖' : item.veg ? '🌿' : ''}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>₹{item.price}</span>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={13} /></span>
                    </div>
                    {(item.variants && item.variants.length) || (item.addons && item.addons.length) ? (
                      <div style={{ marginTop: '.4rem', fontSize: '.65rem', color: 'var(--color-text-muted)', textAlign: 'center', letterSpacing: '.03em' }}>
                        {item.variants && item.variants.length ? `${item.variants.length} variant set${item.variants.length > 1 ? 's' : ''} · ` : ''}
                        {item.addons && item.addons.length ? `${item.addons.length} addon${item.addons.length !== 1 ? 's' : ''}` : ''}
                      </div>
                    ) : null}
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
              {cart.map((c) => {
                const variantParts = Object.values(c.customizations?.variants || {}).map((v) => v.name).filter(Boolean);
                const addonParts = Object.values(c.customizations?.addons || {}).map((a) => a.name).filter(Boolean);
                const note = c.customizations?.instructions || c.customizationString || '';
                const detail = [...variantParts, ...addonParts].join(' · ');
                return (
                  <div key={c.lineId || c.menuId} style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.85rem', fontWeight: 600, lineHeight: 1.3 }}>{c.name}</div>
                        {detail ? <div style={{ fontSize: '.72rem', color: 'var(--color-text-muted)', marginTop: '.15rem', lineHeight: 1.3 }}>{detail}</div> : null}
                        {note ? <div style={{ fontSize: '.72rem', color: 'var(--color-primary)', marginTop: '.15rem', fontStyle: 'italic', lineHeight: 1.3 }}>📝 {note}</div> : null}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexShrink: 0 }}>
                        <button className="action-icon-btn" onClick={() => changeQty(c.lineId, -1)}><Minus size={13} /></button>
                        <b style={{ minWidth: '18px', textAlign: 'center', fontSize: '.8rem' }}>{c.quantity}</b>
                        <button className="action-icon-btn" onClick={() => changeQty(c.lineId, 1)}><Plus size={13} /></button>
                        <button
                          className="action-icon-btn"
                          title="Note for kitchen"
                          onClick={() => setNoteEditingId(noteEditingId === c.lineId ? null : c.lineId)}
                          style={note ? { color: 'var(--color-primary)' } : undefined}
                        ><Pencil size={13} /></button>
                        <button className="action-icon-btn danger" onClick={() => changeQty(c.lineId, -c.quantity)}><Trash2 size={13} /></button>
                      </div>
                      <span style={{ fontSize: '.85rem', fontWeight: 700, minWidth: '52px', textAlign: 'right', flexShrink: 0 }}>₹{c.calculatedPrice}</span>
                    </div>
                    {noteEditingId === c.lineId && (
                      <input
                        type="text"
                        autoFocus
                        placeholder="Note for kitchen (e.g. less spicy, no onion)…"
                        value={c.customizations?.instructions || ''}
                        onChange={(e) => setLineNote(c.lineId, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setNoteEditingId(null); }}
                        style={{ padding: '.4rem .55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)', fontSize: '.8rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                );
              })}
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



        {/* Item picker overlay — variants / addons / quantity for items that need it */}
        {itemPicker && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
            }}
            onClick={closeItemPicker}
          >
            <div
              className="card"
              style={{ width: 'min(440px, 100%)', maxHeight: '85vh', overflow: 'auto', padding: '1.25rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <Layers size={16} /> Configure: {itemPicker.item.name}
                </h3>
                <button className="action-icon-btn" onClick={closeItemPicker} style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
              </div>

              {/* Quantity stepper */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem', marginBottom: '1rem' }}>
                <button className="action-icon-btn" onClick={() => changePickerQty(-1)}><Minus size={15} /></button>
                <b style={{ minWidth: '24px', textAlign: 'center', fontSize: '1rem', fontWeight: 700 }}>{pickerQty}</b>
                <button className="action-icon-btn" onClick={() => changePickerQty(1)}><Plus size={15} /></button>
                <span style={{ marginLeft: '.75rem', fontSize: '.85rem', color: 'var(--color-text-muted)' }}>Qty</span>
              </div>

              {/* Variant sets */}
              {itemPicker.item.variants && itemPicker.item.variants.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {itemPicker.item.variants.map((vSet, setIdx) => (
                    <div key={setIdx} style={{ marginBottom: '.6rem' }}>
                      <p style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-muted)', marginBottom: '.35rem' }}>
                        {vSet.name} {vSet.required !== false ? '(required)' : ''}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                        {vSet.options.map((opt, optIdx) => {
                          const selected = itemPicker.variants[String(setIdx)]?.optIdx === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => togglePickerVariant(setIdx, optIdx)}
                              style={{
                                padding: '.4rem .7rem', borderRadius: 'var(--radius-sm)', border: '1px solid',
                                borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                                background: selected ? 'var(--color-primary)' : '#fff',
                                color: selected ? '#fff' : 'var(--color-text)',
                                fontWeight: selected ? 700 : 500, fontSize: '.8rem', cursor: 'pointer',
                                transition: 'all .15s',
                              }}
                            >
                              {opt.name}
                              {opt.price ? <span style={{ marginLeft: '.35rem', opacity: .85 }}>+₹{opt.price}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Addons */}
              {itemPicker.item.addons && itemPicker.item.addons.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-muted)', marginBottom: '.35rem' }}>
                    Add-ons {itemPicker.item.addons[0]?.required !== false ? '(select any)' : ''}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                    {itemPicker.item.addons.map((addon, addonIdx) => {
                      const selected = !!itemPicker.addons[String(addonIdx)];
                      return (
                        <button
                          key={addonIdx}
                          type="button"
                          onClick={() => togglePickerAddon(addonIdx)}
                          style={{
                            padding: '.4rem .7rem', borderRadius: 'var(--radius-sm)', border: '1px solid',
                            borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                            background: selected ? 'var(--color-primary)' : '#fff',
                            color: selected ? '#fff' : 'var(--color-text)',
                            fontWeight: selected ? 700 : 500, fontSize: '.8rem', cursor: 'pointer',
                            textAlign: 'left', transition: 'all .15s',
                          }}
                        >
                          <span style={{ marginRight: '.35rem' }}>{selected ? '✓' : '⊕'}</span>
                          {addon.name}
                          {addon.price ? <span style={{ marginLeft: '.35rem', opacity: .85 }}>+₹{addon.price}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Note for kitchen */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-muted)', marginBottom: '.35rem' }}>
                  Note for kitchen (optional)
                </p>
                <input
                  type="text"
                  placeholder="e.g. less spicy, no onion, extra crisp…"
                  value={itemPicker.instructions || ''}
                  onChange={(e) => setItemPicker({ ...itemPicker, instructions: e.target.value })}
                  style={{ width: '100%', padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Live line price */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>Line total</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹{computePickerLinePrice()}</span>
              </div>

              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={closeItemPicker}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={addItemFromPicker}>
                  Add to Order · ₹{computePickerLinePrice()}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}