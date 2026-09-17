import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Link2, Plus, X, ClipboardPlus, RotateCcw, Pencil, QrCode } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import BillModal from '../../components/admin/BillModal';
import UpiQrModal from '../../components/admin/UpiQrModal';
import { defaultTables } from '../../data/seedData';

export default function TablesManagement() {
  const { tables, orders, bills, addTable, refresh, updateOrderStatus, moveOrder } = useData();
  const { role } = useAuth();
  // Only Admin & Reception handle money — waiters cannot print/settle bills.
  const canBill = role === 'admin' || role === 'reception';
  const navigate = useNavigate();
  const [selectedTableForBill, setSelectedTableForBill] = useState(null);
  const [viewingTableOrders, setViewingTableOrders] = useState(null);
  const [showUpiQr, setShowUpiQr] = useState(false);
  // Hoisted so BOTH the orders filter and the "Move to" dropdown use the same value — fixes the blank edit page.
  const viewNumClean = viewingTableOrders
    ? parseInt(String(viewingTableOrders.number || viewingTableOrders.id).replace(/\D/g, ''), 10)
    : null;

  // Floor summary — vacant vs occupied counts (same status rules as the table cards)
  const floorStats = tables.reduce((acc, table) => {
    const n = parseInt(String(table.number || table.id).replace(/\D/g, ''), 10);
    const active = orders.filter(o => parseInt(String(o.tableId).replace(/\D/g, ''), 10) === n && o.status !== 'SERVED' && o.status !== 'CANCELLED');
    const billReq = bills.some(b => parseInt(String(b.tableId).replace(/\D/g, ''), 10) === n && b.status === 'REQUESTED');
    if (billReq) acc.requested++;
    else if (active.length > 0) acc.occupied++;
    else acc.vacant++;
    return acc;
  }, { vacant: 0, occupied: 0, requested: 0 });

    const statChip = (color, label, count) => (
    <div style={{
      padding: '.55rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
      background: 'var(--color-surface)', fontSize: '.85rem', fontWeight: 700,
      display: 'flex', alignItems: 'center', gap: '.5rem',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}: <span style={{ fontSize: '1rem' }}>{count}</span>
    </div>
  );

  // Color each floor tile by table-number band (1-10 / 11-20 / 21-30 / 31-40 /
  // 41-50) so table clusters are instantly recognizable. A table that turns over
  // keeps its color (the band is by number, not status).
    const BAND_COLORS = ['#C68B59', '#8B4513', '#A0522D', '#CD853F', '#6B4423'];
  const bandColor = (n) =>
    Number.isFinite(n) && n > 0
      ? BAND_COLORS[Math.min(Math.floor((n - 1) / 10), BAND_COLORS.length - 1)] || BAND_COLORS[BAND_COLORS.length - 1]
      : 'var(--color-primary)';
  const legendBands = [
    { label: '1-10', color: BAND_COLORS[0] },
    { label: '11-20', color: BAND_COLORS[1] },
    { label: '21-30', color: BAND_COLORS[2] },
    { label: '31-40', color: BAND_COLORS[3] },
    { label: '41-50', color: BAND_COLORS[4] },
  ];


  return (
    <div className="animate-fade-in">
      <div className="table-view-header">
        <div>
          <h2 className="table-view-title">Table Floorplan</h2>
          <p className="table-view-sub">Manage your café tables, view orders, and generate bills.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={addTable}><Plus size={16} /> Add Table</button>
          <button
            className="btn btn-outline btn-sm"
            title="Restore the default 50 tables (replaces current tables)"
            onClick={async () => {
              if (!window.confirm('Replace ALL current tables with the default 50 tables?')) return;
              try {
                await fetch('/api/tables', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(defaultTables) });
                await refresh();
                alert('Restored 50 default tables.');
              } catch (e) {
                alert('Failed to reset tables: ' + e.message);
              }
            }}
          >
            <RotateCcw size={16} /> Reset 50 Tables
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              const link = `${window.location.origin}/order`;
              navigator.clipboard?.writeText(link).then(() => alert('Order link copied! Open it on any phone on the same Wi-Fi.')).catch(() => alert(`Copy this link: ${link}`));
            }}
          >
            <Link2 size={16} /> Copy Order Link
          </button>
        </div>
      </div>

            {/* Floor summary — live counts */}
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {statChip('#16a34a', 'Vacant', floorStats.vacant)}
        {statChip('#ea580c', 'Occupied', floorStats.occupied)}
        {floorStats.requested > 0 && statChip('#dc2626', 'Bill Requested', floorStats.requested)}
        {statChip('#6b7280', 'Total Tables', tables.length)}
      </div>

      {/* Table-number band legend (1-10 / 11-20 / 21-30 / 31-40 / 41-50) */}
      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {legendBands.map(b => (
          <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0 }} />
            {b.label}
          </span>
        ))}
      </div>

      <div className="tables-grid">
        {tables.map(table => {

          // Secure integer parsing to ensure '7', '07', and 'table_7' all evaluate to 7
          const tableNumClean = parseInt(String(table.number || table.id).replace(/\D/g, ''), 10);

          const tableOrders = orders.filter(o => {
            const oNumClean = parseInt(String(o.tableId).replace(/\D/g, ''), 10);
            return oNumClean === tableNumClean && o.status !== 'SERVED' && o.status !== 'CANCELLED';
          });

          const hasBill = bills.some(b => {
            const bNumClean = parseInt(String(b.tableId).replace(/\D/g, ''), 10);
            return bNumClean === tableNumClean && b.status === 'REQUESTED';
          });

          let displayStatus = 'available';
          if (tableOrders.length > 0) displayStatus = 'ordering';
          if (hasBill) displayStatus = 'requested';

          const statusLabels = { available: 'Available', ordering: `${tableOrders.length} Order(s)`, requested: 'Bill Requested' };
          const pillClasses = { available: 'table-status-pill pill-available', ordering: 'table-status-pill pill-ordering', requested: 'table-status-pill pill-requested' };
          const cardBorder = { available: 'table-card table-card-available', ordering: 'table-card table-card-ordering', requested: 'table-card table-card-requested' };

          const combinedTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);

          return (
            <div
              key={table.id}
              className={cardBorder[displayStatus]}
              onClick={() => tableOrders.length > 0 && setViewingTableOrders(table)}
              style={{ cursor: tableOrders.length > 0 ? 'pointer' : 'default' }}
            >
                            <div className="table-number" style={{ color: bandColor(tableNumClean) }}>{table.number}</div>
              <div className={pillClasses[displayStatus]}>{statusLabels[displayStatus]}</div>

              {tableOrders.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '.5rem' }}>
                  <div className="table-order-total">₹{combinedTotal}</div>
                  <div className="table-order-id">{tableOrders.length} active ticket(s)</div>
                </div>
              )}

              {displayStatus === 'available' && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '0.5rem', position: 'relative', zIndex: 2 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/take-order?table=${tableNumClean}`); }}
                >
                  <ClipboardPlus size={14} /> Take Order
                </button>
              )}

              {tableOrders.length > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '0.5rem', position: 'relative', zIndex: 2 }}
                  title="Edit this table's order — add items or change quantities"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/take-order?table=${tableNumClean}`); }}
                >
                  <Pencil size={14} /> Edit Item
                </button>
              )}

              {tableOrders.length > 0 && canBill && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.5rem', position: 'relative', zIndex: 2 }}
                  onClick={(e) => { e.stopPropagation(); setSelectedTableForBill(table); }}
                >
                  <FileText size={14} /> Generate Bill
                </button>
              )}
            </div>
          );
        })}
      </div>

      {viewingTableOrders && (
        <div className="modal-overlay" style={{ zIndex: 1000, alignItems: 'center' }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)' }}>Table {viewingTableOrders.number} - Active Orders</h3>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowUpiQr(true)} title="Show the café's UPI QR so the customer can pay by scanning">
                  <QrCode size={14} /> UPI QR
                </button>
                <button className="action-icon-btn" onClick={() => setViewingTableOrders(null)}><X size={20} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>

              {orders.filter(o => {
                const oNumClean = parseInt(String(o.tableId).replace(/\D/g, ''), 10);
                return oNumClean === viewNumClean && o.status !== 'SERVED' && o.status !== 'CANCELLED';
              }).map(ord => (
                <div key={ord.id} style={{ border: '1px solid var(--color-border)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '.5rem' }}>
                    <span>Order #{ord.id}</span>
                    <span className="badge badge-accent">{ord.status}</span>
                  </div>
                  {ord.items.map((it, i) => (
                    <div key={i} style={{ fontSize: '.875rem', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>{it.quantity} × {it.name}</span>
                      <span>₹{it.calculatedPrice}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontWeight: 700, marginTop: '.5rem', fontSize: '.9375rem' }}>
                    Total: ₹{ord.total}
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, minWidth: 120 }}
                      onClick={() => { setViewingTableOrders(null); navigate(`/admin/take-order?edit=${ord.id}`); }}
                    >
                      <Pencil size={13} /> Edit / Add
                    </button>
                    <button
                      className="action-icon-btn"
                      title="Cancel this order (it leaves this table and the kitchen board)"
                      onClick={() => { if (window.confirm(`Cancel order #${ord.id} (₹${ord.total})?`)) updateOrderStatus(ord.id, 'CANCELLED'); }}
                    >
                      <X size={15} color="var(--color-danger)" />
                    </button>
                  </div>
                  {/* Table change — move this ticket to another table */}
                  <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Move to</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const target = e.target.value;
                        if (!target) return;
                        if (window.confirm(`Move order #${ord.id} to Table ${target}?`)) {
                          moveOrder(ord.id, target);
                          setViewingTableOrders(null);
                        }
                        e.target.value = '';
                      }}
                      style={{ flex: 1, padding: '.35rem .5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '.8rem', fontWeight: 600 }}
                    >
                      <option value="">-- select table --</option>
                      {tables.filter(t => parseInt(String(t.number).replace(/\D/g, ''), 10) !== viewNumClean).map(t => (
                        <option key={t.id} value={String(t.number || t.id)}>Table {String(t.number).replace(/\D/g, '')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showUpiQr && (
        <UpiQrModal table={viewingTableOrders} onClose={() => setShowUpiQr(false)} />
      )}

      {selectedTableForBill && (
        <BillModal
          table={selectedTableForBill}
          onClose={() => setSelectedTableForBill(null)}
        />
      )}
    </div>
  );
}