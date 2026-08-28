import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function MenuManagement() {
  const { menu, setMenu } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for the new item form
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: ''
  });

  const toggleAvailability = (id) => {
    setMenu(menu.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setMenu(menu.filter(item => item.id !== id));
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const itemToAdd = {
      id: 'm' + Date.now(), // Generate a simple unique ID
      name: newItem.name,
      category: newItem.category || 'General',
      price: Number(newItem.price),
      description: newItem.description,
      // Default placeholder image if none is provided
      image: newItem.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80',
      available: true,
      variants: [],
      addons: []
    };

    // Add to the top of the menu list
    setMenu([itemToAdd, ...menu]);

    // Reset and close
    setNewItem({ name: '', category: '', price: '', description: '', image: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in relative">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Menu Management</h2>
          <p className="admin-page-sub">Manage your items, pricing, and availability.</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menu.map(item => (
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
                <td>
                  <button
                    onClick={() => toggleAvailability(item.id)}
                    className={`availability-btn ${item.available ? 'availability-available' : 'availability-unavailable'}`}
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="action-icon-btn"><Edit2 size={15} /></button>
                  <button className="action-icon-btn danger" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 999, alignItems: 'center' }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>Add New Item</h3>
              <button className="action-icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Item Name</label>
                <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g., Caramel Macchiato" />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Category</label>
                  <input required type="text" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="e.g., Coffee" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Price (₹)</label>
                  <input required type="number" min="0" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="e.g., 149" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Description</label>
                <textarea rows="2" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Brief description of the item..."></textarea>
              </div>

              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Image URL (Optional)</label>
                <input type="text" value={newItem.image} onChange={e => setNewItem({ ...newItem, image: e.target.value })} placeholder="https://..." />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}