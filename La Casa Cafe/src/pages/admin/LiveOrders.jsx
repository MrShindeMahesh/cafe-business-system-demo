import React, { useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LiveOrders() {
  const { orders, tables, updateOrderStatus } = useData();
  const { role } = useAuth();
  const navigate = useNavigate();
  // Revenue KPIs are visible to Admin only — Reception/Waiter see operations, not money.
  const isAdmin = role === 'admin';

  const columns = [
    { id: 'NEW', label: 'New', dot: 'dot-new', nextStatus: 'PREPARING', actionText: 'Accept Order', btnClass: 'btn-primary' },
    { id: 'PREPARING', label: 'Preparing', dot: 'dot-preparing', nextStatus: 'READY', actionText: 'Mark Ready', btnClass: 'btn-warning' },
    { id: 'READY', label: 'Ready', dot: 'dot-ready', nextStatus: 'SERVED', actionText: 'Mark Served', btnClass: 'btn-success' },
  ];

  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    return diff < 1 ? 'Just now' : `${diff}m ago`;
  };

  const todayKey = new Date().toLocaleDateString('en-CA');
  const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

  const statsByDay = {};
  orders.forEach((o) => {
    if (!o.createdAt) return;
    const k = new Date(o.createdAt).toLocaleDateString('en-CA');
    statsByDay[k] = statsByDay[k] || { revenue: 0, count: 0 };
    statsByDay[k].revenue += Number(o.total) || 0;
    statsByDay[k].count += 1;
  });

  const today = statsByDay[todayKey] || { revenue: 0, count: 0 };
  const yesterday = statsByDay[yesterdayKey] || { revenue: 0, count: 0 };
  const revenue = today.revenue;
  const revPct = yesterday.revenue > 0 ? Math.round(((today.revenue - yesterday.revenue) / yesterday.revenue) * 100) : (today.revenue > 0 ? 100 : 0);
  const ordPct = yesterday.count > 0 ? Math.round(((today.count - yesterday.count) / yesterday.count) * 100) : (today.count > 0 ? 100 : 0);
  const pctText = (pct) => (pct > 0 ? `+${pct}%` : `${pct}%`);
  const TrendIcon = ({ pct }) => (pct > 0 ? <TrendingUp size={10} /> : pct < 0 ? <TrendingDown size={10} /> : <span style={{ opacity: 0.35 }}><TrendingUp size={10} /></span>);

  const activeTables = new Set(
    orders
      .filter((o) => o.status !== 'SERVED')
      .map((o) => String(o.tableId || '').replace(/\D/g, ''))
  ).size;
  const totalTables = tables.length || 12;
  const pending = orders.filter((o) => o.status !== 'SERVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* KPI Cards */}
      <div className="kpi-grid">
        {isAdmin && (
        <div className="kpi-card">
          <div className="kpi-label">Today's Revenue</div>
          <div>
            <span className="kpi-value">₹{revenue.toLocaleString()}</span>
            <span className="kpi-trend"><TrendIcon pct={revPct} /> {pctText(revPct)}</span>
          </div>
        </div>
        )}
        <div className="kpi-card">
          <div className="kpi-label">Today's Orders</div>
          <div>
            <span className="kpi-value">{today.count}</span>
            <span className="kpi-trend"><TrendIcon pct={ordPct} /> {pctText(ordPct)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Tables</div>
          <span className="kpi-value">{activeTables}<span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}> / {totalTables}</span></span>
        </div>
        <div className="kpi-card kpi-accent-border">
          <div className="kpi-label">Pending Orders</div>
          <span className="kpi-value">{pending}</span>
        </div>
      </div>

      {/* Kanban */}
      <div className="kanban-board">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);
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
                {colOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="order-card-id">#{order.id}{order.staffName ? <span style={{ fontSize: '.7rem', color: 'var(--color-text-muted)', marginLeft: '.35rem' }}>• {order.staffName}</span> : null}</div>
                        <div className="order-card-meta">
                          <span className="order-table-pill">Table {String(order.tableId).padStart(2, '0')}</span>
                          <span className="order-time"><Clock size={11} />{getTimeAgo(order.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        className="action-icon-btn"
                        style={{ marginTop: '-4px' }}
                        title="Edit this ticket (add items / change quantities)"
                        onClick={() => navigate(`/admin/take-order?edit=${order.id}`)}
                      >
                        <Pencil size={14} />
                      </button>
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
                      style={{ width: '100%' }}
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
