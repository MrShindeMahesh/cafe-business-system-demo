import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function LiveOrders() {
  const { orders, updateOrderStatus } = useData();

  const columns = [
    { id: 'NEW',      label: 'New',      dot: 'dot-new',       nextStatus: 'PREPARING', actionText: 'Accept Order', btnClass: 'btn-primary' },
    { id: 'PREPARING',label: 'Preparing',dot: 'dot-preparing', nextStatus: 'READY',     actionText: 'Mark Ready',   btnClass: 'btn-warning' },
    { id: 'READY',    label: 'Ready',    dot: 'dot-ready',     nextStatus: 'SERVED',    actionText: 'Mark Served',  btnClass: 'btn-success' },
  ];

  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    return diff < 1 ? 'Just now' : `${diff}m ago`;
  };

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status !== 'SERVED').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Today's Revenue</div>
          <div>
            <span className="kpi-value">₹{revenue.toLocaleString()}</span>
            <span className="kpi-trend"><TrendingUp size={10}/> 12.4%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Today's Orders</div>
          <div>
            <span className="kpi-value">{orders.length}</span>
            <span className="kpi-trend"><TrendingUp size={10}/> 8.2%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Tables</div>
          <span className="kpi-value">8<span style={{ fontSize:'1.2rem', color:'var(--color-text-muted)', fontFamily:'var(--font-body)' }}> / 12</span></span>
        </div>
        <div className="kpi-card kpi-accent-border">
          <div className="kpi-label">Pending Orders</div>
          <span className="kpi-value">{pending}</span>
        </div>
      </div>

      {/* Kanban */}
      <div className="kanban-board">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.status === col.id);
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title">
                  <span className={`kanban-col-dot ${col.dot}`}></span>
                  {col.label}
                </span>
                <span className="kanban-col-count">{colOrders.length}</span>
              </div>

              <div className="kanban-cards">
                {colOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div className="order-card-id">#{order.id}</div>
                        <div className="order-card-meta">
                          <span className="order-table-pill">Table {String(order.tableId).padStart(2,'0')}</span>
                          <span className="order-time"><Clock size={11}/>{getTimeAgo(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="order-items-list">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-item-row">
                          <span><span className="order-qty">{item.quantity}×</span><span className="order-item-name"> {item.name}</span></span>
                        </div>
                      ))}
                    </div>

                    <div className="order-total-row">
                      <span className="order-total-label">Total</span>
                      <span className="order-total-value">₹{order.total}</span>
                    </div>

                    <button
                      className={`btn ${col.btnClass} w-full btn-sm`}
                      style={{ width:'100%' }}
                      onClick={() => updateOrderStatus(order.id, col.nextStatus)}
                    >
                      {col.actionText}
                    </button>
                  </div>
                ))}

                {colOrders.length === 0 && (
                  <div className="kanban-empty">
                    <div className="kanban-empty-title">All caught up ☕</div>
                    <div className="kanban-empty-sub">No {col.label.toLowerCase()} orders right now.</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
