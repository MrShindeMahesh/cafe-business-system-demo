import React, { useState } from 'react';
import { ChefHat, Volume2, CheckCircle2, Clock, Package } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

// Kitchen KOT (Kitchen Order Ticket) screen — no prices, no revenue. Just food.
export default function Kitchen() {
  const { orders, updateOrderStatus, inventory } = useData();
  const { logout } = useAuth();
  const [soundOn, setSoundOn] = useState(true);

  const queue = orders.filter((o) => ['NEW', 'PREPARING', 'READY'].includes(o.status));
  const newOrders = queue.filter((o) => o.status === 'NEW');
  const preparing = queue.filter((o) => o.status === 'PREPARING');
  const ready = queue.filter((o) => o.status === 'READY');
  const lowStock = inventory.filter((i) => i.status === 'Critical' || i.status === 'Low Stock');

  const columns = [
    { title: 'NEW ORDERS', status: 'NEW', list: newOrders, next: 'PREPARING', btn: 'Start Preparing', color: '#e05252' },
    { title: 'PREPARING', status: 'PREPARING', list: preparing, next: 'READY', btn: 'Mark Ready', color: '#e0a52e' },
    { title: 'READY TO SERVE', status: 'READY', list: ready, next: 'SERVED', btn: 'Picked Up', color: '#3aa657' },
  ];

  const move = (orderId, next) => {
    if (soundOn && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = next === 'PREPARING' ? 880 : 660;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } catch { /* audio not available */ }
    }
    updateOrderStatus(orderId, next);
  };

  const timeIn = (iso) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return mins <= 0 ? 'just now' : `${mins} min`;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', margin: 0 }}>Kitchen Display</h1>
            <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{queue.length} active ticket(s)</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setSoundOn(!soundOn)} style={{ color: soundOn ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            <Volume2 size={16} /> {soundOn ? 'Sound ON' : 'Sound OFF'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: 'rgba(224,82,82,.12)', border: '1px solid rgba(224,82,82,.4)', borderRadius: '12px', padding: '.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <Package size={18} color="#e05252" />
          <span style={{ fontWeight: 700, fontSize: '.875rem', color: '#e05252' }}>Stock alert:</span>
          {lowStock.map((i) => (
            <span key={i.id} style={{ fontSize: '.8rem', background: 'rgba(224,82,82,.15)', padding: '.25rem .6rem', borderRadius: '20px' }}>
              {i.name} — {i.status} ({i.quantity} {i.unit})
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {columns.map((col) => (
          <KitchenColumn key={col.status} col={col} move={move} timeIn={timeIn} />
        ))}
      </div>
    </div>
  );
}

const KitchenColumn = ({ col, move, timeIn }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 800, fontSize: '.85rem', letterSpacing: '.05em', color: col.color }}>{col.title}</span>
      <span style={{ background: col.color, color: '#fff', fontWeight: 800, fontSize: '.8rem', padding: '.15rem .6rem', borderRadius: '20px' }}>{col.list.length}</span>
    </div>
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
      {col.list.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '.85rem', padding: '2rem 0' }}>Nothing here</p>
      )}
      {col.list.map((o) => (
        <div key={o.id} style={{ background: 'var(--color-bg)', border: `2px solid ${col.color}55`, borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
            <span style={{ fontWeight: 900, fontSize: '1.35rem', fontFamily: 'var(--font-heading)' }}>
              T-{String(o.tableId).replace(/\D/g, '') || o.tableId}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--color-text-muted)' }}>
              <Clock size={13} /> {timeIn(o.createdAt)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.85rem' }}>
            {(o.items || []).map((it, i) => (
              <div key={i} style={{ fontSize: '1rem', fontWeight: 700 }}>
                {it.quantity} × {it.name}
              </div>
            ))}
          </div>
          <button
            onClick={() => move(o.id, col.next)}
            style={{ width: '100%', padding: '.7rem', borderRadius: '10px', border: 'none', background: col.color, color: '#fff', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}
          >
            <CheckCircle2 size={17} /> {col.btn}
          </button>
        </div>
      ))}
    </div>
  </div>
);

