import React, { useState, useMemo } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar, Download, Grid, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { downloadCsv, ordersCsvColumns } from '../../lib/exportData';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

const getRange = (key) => {
  const now = new Date();
  if (key === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { start, end: null };
  }
  if (key === '7d') {
    const start = new Date(now.getTime() - 7 * 86400000).toISOString();
    return { start, end: null };
  }
  if (key === '30d') {
    const start = new Date(now.getTime() - 30 * 86400000).toISOString();
    return { start, end: null };
  }
  if (key === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return { start, end: null };
  }
  return { start: null, end: null };
};

export default function Analytics() {
  const { orders, customers, inventory } = useData();
  const [preset, setPreset] = useState('today');

  const range = getRange(preset);

  const filteredOrders = useMemo(() => {
    if (!range.start) return orders;
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      const s = new Date(range.start).getTime();
      return t >= s;
    });
  }, [orders, range.start]);

  // 2. Calculate Top Level KPIs
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;

  // 3. Aggregate Item Stats for the charts
  const itemStats = useMemo(() => {
    const stats = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!stats[item.name]) {
          stats[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        stats[item.name].qty += item.quantity;
        stats[item.name].revenue += item.calculatedPrice;
      });
    });
    return Object.values(stats);
  }, [filteredOrders]);

  // Sort top 5 by Quantity and top 5 by Revenue
  const topByQty = [...itemStats].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topByRev = [...itemStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  
  // Find max values to scale the progress bars
  const maxQty = Math.max(...topByQty.map(i => i.qty), 1);
  const maxRev = Math.max(...topByRev.map(i => i.revenue), 1);

  // 4. Table performance — which tables make the most money
  const tableStats = useMemo(() => {
    const stats = {};
    filteredOrders.forEach(order => {
      const tid = order.tableId || 'Unknown';
      if (!stats[tid]) stats[tid] = { table: tid, revenue: 0, orders: 0 };
      stats[tid].revenue += order.total || 0;
      stats[tid].orders += 1;
    });
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const topTables = tableStats.slice(0, 5);
  const maxTableRev = Math.max(...topTables.map(t => t.revenue), 1);

  // 5. Inventory needing restock most (Critical first, then Low Stock)
  const restockNeeded = useMemo(() => {
    return [...inventory]
      .filter(i => i.status === 'Critical' || i.status === 'Low Stock')
      .sort((a, b) => {
        const order = { Critical: 0, 'Low Stock': 1, 'In Stock': 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (a.quantity || 0) - (b.quantity || 0);
      });
  }, [inventory]);

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Analytics Overview</h2>
          <p className="admin-page-sub">Track your café's performance and top-selling items.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => downloadCsv(`orders-report-${preset}.csv`, filteredOrders, ordersCsvColumns)}
          >
            <Download size={16} /> Export CSV
          </button>
          <div style={{ display: 'flex', gap: '.25rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '.25rem' }}>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                className="btn btn-sm"
                onClick={() => setPreset(p.key)}
                style={{
                  background: preset === p.key ? 'var(--color-primary)' : 'transparent',
                  color: preset === p.key ? '#fff' : 'var(--color-text)',
                  border: 'none',
                  padding: '.4rem .75rem',
                  borderRadius: '4px',
                  fontSize: '.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label"><DollarSign size={14} style={{display:'inline', verticalAlign:'middle'}}/> Revenue</div>
          <div>
            <span className="kpi-value">₹{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-label"><ShoppingBag size={14} style={{display:'inline', verticalAlign:'middle'}}/> Total Orders</div>
          <div>
            <span className="kpi-value">{totalOrders}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label"><Users size={14} style={{display:'inline', verticalAlign:'middle'}}/> All Time Customers</div>
          <div>
            <span className="kpi-value">{customers.length}</span>
          </div>
        </div>

        <div className="kpi-card kpi-accent-border">
          <div className="kpi-label">Avg. Order Value</div>
          <span className="kpi-value">₹{averageOrderValue}</span>
        </div>
      </div>

      {/* Item Performance Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        
        {/* Top Items by Quantity */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Most Sold Dishes
          </h3>
          {topByQty.length === 0 ? <p className="text-muted">No sales for this date.</p> : topByQty.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.25rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{item.qty} items</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(item.qty / maxQty) * 100}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Items by Revenue */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Maximum Revenue Generators
          </h3>
          {topByRev.length === 0 ? <p className="text-muted">No sales for this date.</p> : topByRev.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.25rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{item.revenue.toLocaleString()}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(item.revenue / maxRev) * 100}%`, height: '100%', background: 'var(--color-success)', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Table Performance + Inventory Restock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>

        {/* Top Tables by Sales */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Grid size={18} /> Top Tables by Sales
          </h3>
          {topTables.length === 0 ? <p className="text-muted">No table sales yet.</p> : topTables.map((t, idx) => (
            <div key={idx} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.25rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Table #{t.table}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{t.revenue.toLocaleString()} <span style={{ fontSize: '.7rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({t.orders} orders)</span></span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(t.revenue / maxTableRev) * 100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Inventory Needing Restock */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-danger)', marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <AlertTriangle size={18} /> Needs Restock
          </h3>
          {restockNeeded.length === 0 ? (
            <p className="text-muted" style={{ color: 'var(--color-success)' }}>✓ All stock levels healthy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {restockNeeded.slice(0, 8).map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.5rem .75rem', borderRadius: 'var(--radius-sm)', background: item.status === 'Critical' ? 'rgba(220,38,38,.08)' : 'rgba(234,179,8,.08)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{item.name}</span>
                    <span style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginLeft: '.5rem' }}>{item.quantity} {item.unit} left</span>
                  </div>
                  <span className={`badge ${item.status === 'Critical' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '.7rem' }}>{item.status}</span>
                </div>
              ))}
              {restockNeeded.length > 8 && (
                <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '.5rem' }}>+{restockNeeded.length - 8} more items need restock</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}