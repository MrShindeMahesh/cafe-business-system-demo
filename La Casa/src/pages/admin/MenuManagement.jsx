import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Layers } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export default function MenuManagement() {
  const { menu, setMenu, inventory = [] } = useData();
  const { role } = useAuth();
  // Waiters can view the menu to take orders, but not change it.
  const readOnly = role === 'waiter';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: '',
    recipe: [] // Array of { inventoryId, amount }
  });

  const [currentIngredient, setCurrentIngredient] = useState({ inventoryId: '', amount: 1 });

  const toggleAvailability = (id) => {
    setMenu(menu.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setMenu(menu.filter(item => item.id !== id));
    }
  };

  const handleAddIngredientToRecipe = () => {
    if (!currentIngredient.inventoryId) return;
    const selectedInv = inventory.find(i => i.id === currentIngredient.inventoryId);
    if (!selectedInv) return;

    // Prevent duplicate entries of the same inventory item in the recipe
    if (newItem.recipe.some(r => r.inventoryId === currentIngredient.inventoryId)) return;

    setNewItem({
      ...newItem,
      recipe: [...newItem.recipe, {
        inventoryId: currentIngredient.inventoryId,
        name: selectedInv.name,
        unit: selectedInv.unit,
        amount: Number(currentIngredient.amount) || 1
      }]
    });
    setCurrentIngredient({ inventoryId: '', amount: 1 });
  };

  const handleRemoveIngredient = (inventoryId) => {
    setNewItem({
      ...newItem,
      recipe: newItem.recipe.filter(r => r.inventoryId !== inventoryId)
    });
  };

  const handleAddItem = (e) => {
    e.preventDefault();

    const isBeverage = ['Coffee', 'Cold Drinks', 'Beverages'].includes(newItem.category);

    const itemToAdd = {
      id: 'm' + Date.now(),
      name: newItem.name,
      category: newItem.category || 'General',
      price: Number(newItem.price),
      description: newItem.description,
      image: newItem.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80',
      available: true,
      recipe: newItem.recipe || [], // Multi-ingredient recipe array
      variants: isBeverage ? [{ name: 'Size', options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 40 }] }] : [],
      addons: isBeverage
        ? [{ name: 'Extra Shot', price: 50 }, { name: 'More Sugar / Sweet', price: 0 }]
        : [{ name: 'Extra Cheese', price: 40 }, { name: 'Extra Sauce', price: 20 }]
    };

    setMenu([itemToAdd, ...menu]);
    setNewItem({ name: '', category: '', price: '', description: '', image: '', recipe: [] });
    setIsModalOpen(false);
  };

  const filteredMenu = categoryFilter === 'All' ? menu : menu.filter((m) => m.category === categoryFilter);

  return (
    <div className="animate-fade-in relative">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">{readOnly ? 'Menu (View Only)' : 'Menu Management'}</h2>
          <p className="admin-page-sub">{readOnly ? 'Browse items and prices to take customer orders.' : 'Manage your items, multi-ingredient recipes, and availability.'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '.55rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: 600, background: 'var(--color-surface)', minWidth: '170px' }}
          >
            <option value="All">All Categories ({menu.length})</option>
            {[...new Set(menu.map((m) => m.category))].sort().map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({menu.filter((m) => m.category === cat).length})
              </option>
            ))}
          </select>
          {!readOnly && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Item</th>
              <th>Category</th>
              <th>Price</th>
              {!readOnly && <th>Recipe / Stock Deductions</th>}
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMenu.length > 0 ? filteredMenu.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem' }}>
                    <img src={item.image} alt={item.name} className="menu-thumb" />
                    <div>
                      <div className="menu-item-name">{item.name}</div>
                      <div className="menu-item-desc">{item.description}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-accent">{item.category}</span>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{item.price}</td>
                {!readOnly && (
                <td style={{ fontSize: '.8125rem', color: 'var(--color-text-secondary)' }}>
                  {item.recipe && item.recipe.length > 0 ? (
                    item.recipe.map((r, idx) => (
                      <div key={idx}>• {r.name}: <b>-{r.amount} {r.unit}</b></div>
                    ))
                  ) : item.inventoryId ? (
                    <div>• <b>-{item.stockUsed || 1} unit</b></div>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>No ingredients linked</span>
                  )}
                </td>
                )}
                <td>
                  {readOnly ? (
                    <span className={`availability-btn ${item.available ? 'availability-available' : 'availability-unavailable'}`} style={{ cursor: 'default' }}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleAvailability(item.id)}
                      className={`availability-btn ${item.available ? 'availability-available' : 'availability-unavailable'}`}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </button>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {!readOnly && (
                    <>
                      <button className="action-icon-btn"><Edit2 size={15} /></button>
                      <button className="action-icon-btn danger" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                  {readOnly && <span style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>—</span>}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={readOnly ? 5 : 6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                  No items in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 999, alignItems: 'center' }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', background: 'var(--color-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>Add Menu Item & Recipe</h3>
              <button className="action-icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Item Name</label>
                <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g., Cappuccino" />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Category</label>
                  <input required type="text" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="e.g., Coffee, Snacks" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Price (₹)</label>
                  <input required type="number" min="0" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="e.g., 149" />
                </div>
              </div>

              {/* MULTI-INGREDIENT RECIPE BUILDER */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
                  <Layers size={14} /> Recipe Ingredient Deductions
                </label>
                <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginBottom: '.75rem' }}>Add all inventory items consumed when 1 unit of this menu item is ordered.</p>

                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}>
                  <select
                    value={currentIngredient.inventoryId}
                    onChange={e => setCurrentIngredient({ ...currentIngredient, inventoryId: e.target.value })}
                    style={{ flex: 2, padding: '.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: '#fff', fontSize: '.875rem' }}
                  >
                    <option value="">-- Select Ingredient --</option>
                    {inventory.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name} ({inv.quantity} {inv.unit} left)</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={currentIngredient.amount}
                    onChange={e => setCurrentIngredient({ ...currentIngredient, amount: e.target.value })}
                    placeholder="Qty"
                    style={{ flex: 1, padding: '.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: '#fff', fontSize: '.875rem' }}
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddIngredientToRecipe}>Add</button>
                </div>

                {newItem.recipe.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem' }}>
                    {newItem.recipe.map(r => (
                      <div key={r.inventoryId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '.4rem .75rem', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '.875rem' }}>
                        <span>{r.name} (<b>-{r.amount} {r.unit}</b>)</span>
                        <button type="button" onClick={() => handleRemoveIngredient(r.inventoryId)} style={{ color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '.75rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No ingredients added to recipe yet.</div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Description</label>
                <textarea rows="2" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Brief description..."></textarea>
              </div>

              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Image URL (Optional)</label>
                <input type="text" value={newItem.image} onChange={e => setNewItem({ ...newItem, image: e.target.value })} placeholder="https://..." />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Item & Recipe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}