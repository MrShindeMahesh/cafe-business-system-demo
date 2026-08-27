import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function MenuManagement() {
  const { menu, setMenu } = useData();
  const toggleAvailability = (id) => setMenu(menu.map(item => item.id === id ? { ...item, available: !item.available } : item));

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Menu Management</h2>
          <p className="admin-page-sub">Manage your items, pricing, and availability.</p>
        </div>
        <button className="btn btn-primary btn-sm"><Plus size={16}/> Add Item</button>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:'40%' }}>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th style={{ textAlign:'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menu.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:'.875rem' }}>
                    <img src={item.image} alt={item.name} className="menu-thumb"/>
                    <div>
                      <div className="menu-item-name">{item.name}</div>
                      <div className="menu-item-desc">{item.description}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-accent">{item.category}</span>
                </td>
                <td style={{ fontWeight:700, color:'var(--color-primary)' }}>₹{item.price}</td>
                <td>
                  <button
                    onClick={() => toggleAvailability(item.id)}
                    className={`availability-btn ${item.available ? 'availability-available' : 'availability-unavailable'}`}
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td style={{ textAlign:'right' }}>
                  <button className="action-icon-btn"><Edit2 size={15}/></button>
                  <button className="action-icon-btn danger"><Trash2 size={15}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
