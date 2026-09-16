import React, { useState, useMemo } from 'react';
import { Users, DollarSign, ShoppingBag, Grid, Printer, ChefHat, Download, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { downloadCsv, ordersCsvColumns } from '../../lib/exportData';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
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
  const { orders, customers, inventory, payments, expenses, settings, tables = [] } = useData();
  const [preset, setPreset] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range =
    preset === 'custom'
      ? customFrom || customTo
        ? {
            start: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : null,
            end: customTo ? new Date(`${customTo}T23:59:59.999`).toISOString() : null,
          }
        : { start: null, end: null }
      : getRange(preset);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'CANCELLED') return false;
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      if (range.start && t < new Date(range.start).getTime()) return false;
      if (range.end && t > new Date(range.end).getTime()) return false;
      return true;
    });
  }, [orders, range.start, range.end]);

  // 2. Calculate Top Level KPIs - Revenue = SETTLED money in range (payments),
  // so settling a table moves the report; placing an order alone does not.
  // Legacy SERVED-but-unpaid orders in range still count (pre-payment bridge).
  const allPaidOrderIds = useMemo(() => new Set((payments || []).flatMap((p) => p.orderIds || [])), [payments]);
  const inRangeTime = (iso) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (range.start && t < new Date(range.start).getTime()) return false;
    if (range.end && t > new Date(range.end).getTime()) return false;
    return true;
  };
  const rangePayments = (payments || []).filter((p) => inRangeTime(p.settledAt));
  const legacySettledRevenue = filteredOrders.filter((o) => o.status === 'SERVED' && !allPaidOrderIds.has(o.id)).reduce((s, o) => s + (o.total || 0), 0);
  const totalRevenue = rangePayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) + legacySettledRevenue;
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;

  // Tables — total count + how many are occupied right now (active, unsettled orders)
  const occupiedTables = new Set(
    orders
      .filter((o) => o.status !== 'SERVED' && o.status !== 'CANCELLED')
      .map((o) => parseInt(String(o.tableId).replace(/\D/g, ''), 10))
      .filter(Number.isFinite)
  ).size;

  // 3. Aggregate Item Stats for the charts
  const itemStats = useMemo(() => {
    const stats = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
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

  // ======== Phase 3 — Day Close (Z-Report) & batch KOT printing ========
  // Custom date support — Z-Report can be run for ANY date, not just today.
  const [zDate, setZDate] = useState(() => new Date().toISOString().slice(0, 10));
  const zDateParts = useMemo(() => (zDate || '').split('-').map(Number), [zDate]);
  const dayStart = useMemo(() => {
    const [y, m, d] = zDateParts;
    return y && m && d ? new Date(y, m - 1, d, 0, 0, 0, 0) : new Date(new Date().setHours(0, 0, 0, 0));
  }, [zDateParts]);
  const dayEnd = useMemo(() => {
    const [y, m, d] = zDateParts;
    return y && m && d ? new Date(y, m - 1, d + 1, 0, 0, 0, 0) : new Date(new Date().setHours(24, 0, 0, 0));
  }, [zDateParts]);
  const inDay = (ts) => { const t = new Date(ts); return t >= dayStart && t < dayEnd; };
  const todaysPayments = useMemo(() => payments.filter((p) => p.settledAt && inDay(p.settledAt)), [payments, dayStart, dayEnd]);
  const paidOrderIds = useMemo(() => new Set(todaysPayments.flatMap((p) => p.orderIds || [])), [todaysPayments]);
  const todaysOrders = useMemo(() => orders.filter((o) => o.createdAt && inDay(o.createdAt)), [orders, dayStart, dayEnd]);
  // legacy bridge: SERVED orders today that predate payment records
  const legacyRevenue = useMemo(
    () => todaysOrders.filter((o) => o.status === 'SERVED' && !paidOrderIds.has(o.id)).reduce((s, o) => s + (o.total || 0), 0),
    [todaysOrders, paidOrderIds]
  );
  const dayRevenue = todaysPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) + legacyRevenue;
  const dayDiscounts = todaysPayments.reduce((s, p) => s + (Number(p.discount) || 0), 0);
  const dayGross = dayRevenue + dayDiscounts;
  const modeTotals = ['Cash', 'Card', 'UPI'].map((m) => ({
    mode: m,
    total: todaysPayments.filter((p) => (p.paymentMode || 'Cash') === m).reduce((s, p) => s + (Number(p.amount) || 0), 0),
  }));

  // Today's expenses (recorded at reception) — shown + printed with the Z-Report
  const todaysExpenses = useMemo(
    () => expenses.filter((e) => e.createdAt && inDay(e.createdAt)),
    [expenses, dayStart, dayEnd]
  );
  const dayExpenseTotal = todaysExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const dayNetAfterExpenses = dayRevenue - dayExpenseTotal;

  const attachPrintPortal = (node) => {
    const portal = document.createElement('div');
    portal.id = 'print-portal';
    portal.appendChild(node);
    document.body.appendChild(portal);
    const cleanup = () => { portal.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 60000);
  };

  const printDayClose = () => {
    const rep = document.createElement('div');
    rep.id = 'printable-receipt';
    const reportDate = new Date(zDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const printedAt = new Date().toLocaleString('en-IN');
    rep.innerHTML =
      '<div style="text-align:center;margin-bottom:.6rem">' +
        '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
        '<div style="font-size:.85rem;font-weight:700;letter-spacing:.5px">DAY CLOSE REPORT (Z-REPORT)</div>' +
        '<div style="font-size:.75rem;color:#555">For: ' + reportDate + ' · printed: ' + printedAt + '</div>' +
      '</div>' +
      '<div style="border-top:1px dashed #999;margin-bottom:.4rem"></div>' +
      modeTotals.map((m) =>
        '<div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:.25rem"><span>' + m.mode + '</span><span>₹' + m.total + '</span></div>'
      ).join('') +
      '<div style="border-top:1px dashed #999;margin:.5rem 0;padding-top:.4rem">' +
        '<div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:.25rem"><span>Gross (before discounts)</span><span>₹' + dayGross + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:.875rem;color:#b91c1c;margin-bottom:.25rem"><span>Discounts given</span><span>− ₹' + dayDiscounts + '</span></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;border-top:1px solid #111;padding-top:.5rem"><span>NET REVENUE</span><span>₹' + dayRevenue + '</span></div>' +
      '<div style="border-top:1px dashed #999;margin:.6rem 0 .4rem;padding-top:.4rem">' +
        '<div style="font-size:.85rem;font-weight:700;letter-spacing:.5px;margin-bottom:.35rem">EXPENSES (TODAY)</div>' +
        (todaysExpenses.length
          ? todaysExpenses.map((e) =>
              '<div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.2rem"><span>' +
              (e.title || '—') + (e.category ? ' [' + e.category + ']' : '') + '</span><span>₹' + (Number(e.amount) || 0) + '</span></div>'
            ).join('')
          : '<div style="font-size:.8rem;color:#555;margin-bottom:.25rem">No expenses recorded today.</div>') +
        '<div style="display:flex;justify-content:space-between;font-size:.875rem;font-weight:700;margin-top:.35rem"><span>Total expenses</span><span>− ₹' + dayExpenseTotal + '</span></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;border-top:1px solid #111;padding-top:.5rem"><span>NET AFTER EXPENSES</span><span>₹' + dayNetAfterExpenses + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:.8rem;color:#555;margin-top:.6rem"><span>Bills settled: ' + todaysPayments.length + '</span><span>Orders placed: ' + todaysOrders.length + '</span></div>';
    attachPrintPortal(rep);
  };

  const printAllKots = () => {
    if (!todaysOrders.length) { alert('No orders were placed today.'); return; }
    const wrapper = document.createDocumentFragment();
    [...todaysOrders].reverse().forEach((ord, i) => { // oldest first
      const kot = document.createElement('div');
      kot.id = 'printable-receipt';
      if (i > 0) kot.style.pageBreakBefore = 'always';
      const when = new Date(ord.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const items = (ord.items || []).map((it) => {
        const cust = it.customizationString || (it.customizations && it.customizations.instructions) || '';
        return '<div style="margin-bottom:.35rem">' +
          '<div style="font-size:.95rem;font-weight:700">' + (it.quantity || 1) + ' × ' + it.name + '</div>' +
          (cust ? '<div style="font-size:.75rem;color:#444">[' + cust + ']</div>' : '') +
          '</div>';
      }).join('');
      kot.innerHTML =
        '<div style="text-align:center;margin-bottom:.4rem">' +
          '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
          '<div style="font-size:.8rem;font-weight:700;letter-spacing:.5px">KITCHEN ORDER TICKET</div>' +
        '</div>' +
        '<div style="font-size:.8rem;margin-bottom:.4rem">Table: ' + String(ord.tableId || '').replace(/\D/g, '') + ' &nbsp; Time: ' + when + '<br/>Order #: ' + ord.id + '</div>' +
        '<div style="border-top:1px dashed #999;margin-bottom:.4rem"></div>' +
        items +
        '<div style="border-top:1px dashed #999;margin-top:.5rem;padding-top:.4rem;text-align:center;font-size:.75rem;font-weight:700">PLEASE SERVE FRESH &amp; HOT</div>';
      wrapper.appendChild(kot);
    });
    const portal = document.createElement('div');
    portal.id = 'print-portal';
    portal.appendChild(wrapper);
    document.body.appendChild(portal);
    const cleanup = () => { portal.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 60000);
  };

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

          {preset === 'custom' && (
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>From</span>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ padding: '.4rem .5rem', fontSize: '.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
              <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>To</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ padding: '.4rem .5rem', fontSize: '.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
            </div>
          )}
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

        <div className="kpi-card">
          <div className="kpi-label"><Grid size={14} style={{display:'inline', verticalAlign:'middle'}}/> Tables</div>
          <div>
            <span className="kpi-value">{tables.length}</span>
            <span style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', marginLeft: '.5rem' }}>{occupiedTables} occupied now</span>
          </div>
        </div>

        <div className="kpi-card kpi-accent-border">
          <div className="kpi-label">Avg. Order Value</div>
          <span className="kpi-value">₹{averageOrderValue}</span>
        </div>
      </div>

      {/* Phase 3 — Day Close / Z-Report */}
      <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
              Day Close (Z-Report)
              <input
                type="date"
                value={zDate}
                onChange={(e) => setZDate(e.target.value || new Date().toISOString().slice(0, 10))}
                title="Pick any date to close that day"
                style={{ padding: '.3rem .5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '.85rem', fontWeight: 600, fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg)' }}
              />
              {zDate !== new Date().toISOString().slice(0, 10) && (
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '.5px' }}>custom date</span>
              )}
            </h3>
            <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
              {new Date(zDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}: NET ₹{dayRevenue.toLocaleString()} · expenses ₹{dayExpenseTotal.toLocaleString()} → after expenses ₹{dayNetAfterExpenses.toLocaleString()} · {todaysPayments.length} bill(s) settled · {todaysOrders.length} order(s) placed · discounts ₹{dayDiscounts}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={printDayClose} title="Print today's revenue summary (Cash/Card/UPI, discounts, net)">
              <Printer size={16} /> Print Day-Close Report
            </button>
            <button className="btn btn-outline btn-sm" onClick={printAllKots} title="Print every kitchen ticket from today, one per order">
              <ChefHat size={16} /> Print All Today's KOTs
            </button>
          </div>
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

        {/* Revenue by Staff */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Users size={18} /> Revenue by Staff
          </h3>
          {(() => {
            const stats = {};
            filteredOrders.forEach((o) => {
              const s = o.staffName || 'Unassigned';
              stats[s] = stats[s] || { name: s, revenue: 0, orders: 0 };
              stats[s].revenue += o.total || 0;
              stats[s].orders += 1;
            });
            const list = Object.values(stats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            const max = Math.max(...list.map((x) => x.revenue), 1);
            return list.length === 0 ? <p className="text-muted">No staff-tagged orders in this range yet.</p> : list.map((x, i) => (
              <div key={x.name} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.25rem' }}>
                  <span style={{ fontWeight: 600 }}>{x.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{x.revenue.toLocaleString()} <span style={{ fontSize: '.7rem', color: 'var(--color-text-muted)' }}>({x.orders} orders)</span></span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(x.revenue / max) * 100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '4px' }}></div>
                </div>
              </div>
            ));
          })()}
        </div>

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