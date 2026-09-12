import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, FileText, Pencil } from 'lucide-react';
import { useData } from '../../context/DataContext';
import BillModal from '../../components/admin/BillModal';
import { useAuth } from '../../context/AuthContext';

// Parcel (takeaway) panel — orders with tableId 'PARCEL'. No tables involved:
// take the order in Take Order's parcel mode, then settle/print the bill here.
export default function Parcel() {
  const { orders } = useData();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [selectedForBill, setSelectedForBill] = useState(null);

  const parcelOrders = orders.filter((o) => String(o.tableId || '').toUpperCase() === 'PARCEL' && o.status !== 'SERVED');
  const settledToday = orders.filter((o) => {
    if (String(o.tableId || '').toUpperCase() !== 'PARCEL' || o.status !== 'SERVED' || !o.createdAt) return false;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return new Date(o.createdAt) >= d;
  });

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Parcel / Takeaway</h2>
          <p className="admin-page-sub">Takeaway orders — no tables involved. Settle the bill when the customer picks up.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/take-order?mode=parcel')}>
          <Plus size={16} /> New Parcel Order
        </button>
      </div>

      {/* Open parcel tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {parcelOrders.length ? parcelOrders.map((ord) => (
          <div key={ord.id} className="card" style={{ padding: '1rem', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <ShoppingBag size={14} color="var(--color-primary)" /> #{ord.id}
              </span>
              <span className="badge badge-warning">{ord.status}</span>
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginBottom: '.5rem' }}>
              {ord.customerName || 'Guest'} · {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {(ord.items || []).map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                <span>{it.quantity} × {it.name}</span>
                <span>₹{it.calculatedPrice}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--color-border)', marginTop: '.5rem', paddingTop: '.4rem', textAlign: 'right', fontWeight: 800 }}>
              ₹{ord.total}
            </div>
            <div style={{ display: 'flex', gap: '.4rem', marginTop: '.6rem', flexWrap: 'wrap' }}>
              {(role === 'admin' || role === 'reception') && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setSelectedForBill({ id: 'PARCEL', number: 'PARCEL' })}>
                  <FileText size={13} /> Bill / Settle
                </button>
              )}
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/admin/take-order?edit=${ord.id}`)}>
                <Pencil size={13} /> Edit
              </button>
            </div>
          </div>
        )) : (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <ShoppingBag size={36} style={{ margin: '0 auto .75rem', display: 'block', color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>No open parcel tickets.</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.78rem' }}>Use “New Parcel Order” to take a takeaway order.</p>
          </div>
        )}
      </div>

      {/* Settled today */}
      {settledToday.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '.75rem' }}>Settled Today ({settledToday.length})</h3>
          {settledToday.map((o) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '.35rem 0', borderBottom: '1px dashed var(--color-border)' }}>
              <span>#{o.id} · {o.customerName || 'Guest'} · {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span style={{ fontWeight: 700 }}>₹{o.total}</span>
            </div>
          ))}
        </div>
      )}

      {selectedForBill && (
        <BillModal table={selectedForBill} onClose={() => setSelectedForBill(null)} />
      )}
    </div>
  );
}
