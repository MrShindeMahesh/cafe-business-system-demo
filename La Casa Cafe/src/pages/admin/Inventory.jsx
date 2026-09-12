import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

const computeStatus = (qty) => {
  const q = Number(qty) || 0;
  if (q <= 2) return 'Critical';
  if (q <= 5) return 'Low Stock';
  return 'In Stock';
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'Low Stock': return 'badge-warning';
    case 'Critical': return 'badge-danger';
    default: return 'badge-success';
  }
};

export default function Inventory() {
  const { inventory, setInventory } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', quantity: '', unit: 'pcs' });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', quantity: '', unit: 'pcs' });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({ name: item.name, quantity: item.quantity, unit: item.unit });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this inventory item?')) {
      setInventory(inventory.filter((i) => i.id !== id));
    }
  };

  const quickAdd = (id, amount) => {
    setInventory(inventory.map((i) => {
      if (i.id !== id) return i;
      const newQty = Math.max(0, Number(i.quantity) + amount);
      return { ...i, quantity: newQty, status: computeStatus(newQty) };
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const status = computeStatus(form.quantity);
    if (editingId) {
      setInventory(inventory.map((i) => (i.id === editingId ? { ...i, ...form, quantity: Number(form.quantity), status } : i)));
    } else {
      setInventory([
        { id: 'inv' + Date.now(), name: form.name, quantity: Number(form.quantity), unit: form.unit, status },
        ...inventory,
      ]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Inventory Control</h2>
          <p className="admin-page-sub">Track raw materials and stock levels.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={16} /> Add Stock Item
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Quantity Left</th>
              <th>Unit</th>
              <th>Status Alert</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length > 0 ? inventory.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.name}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <button onClick={() => quickAdd(item.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>−</button>
                    <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => quickAdd(item.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>+</button>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{item.unit}</td>
                <td>
                  <span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="action-icon-btn" onClick={() => openEdit(item)}><Edit2 size={15} /></button>
                  <button className="action-icon-btn danger" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                  No inventory items yet. Add your first stock item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000, alignItems: 'center' }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '440px', padding: '2rem', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
                {editingId ? 'Edit Stock Item' : 'Add Stock Item'}
              </h3>
              <button className="action-icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Item Name</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Whole Milk" />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Quantity</label>
                  <input required type="number" step="0.01" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g., 10" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Unit</label>
                  <input required type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg / pcs / Liters" />
                </div>
              </div>
              <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Status is automatic: ≤5 = Low Stock, ≤2 = Critical, otherwise In Stock.
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '.5rem' }}>
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

