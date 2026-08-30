import React, { useState } from 'react';
import { Download, FileText, Plus, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import BillModal from '../../components/admin/BillModal';

export default function TablesManagement() {
  const { tables, orders, bills, addTable } = useData();
  const [selectedTableForBill, setSelectedTableForBill] = useState(null);
  const [viewingTableOrders, setViewingTableOrders] = useState(null);

  return (
    <div className="animate-fade-in">
      <div className="table-view-header">
        <div>
          <h2 className="table-view-title">Table Floorplan</h2>
          <p className="table-view-sub">Manage your café tables, view orders, and generate bills.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={addTable}><Plus size={16} /> Add Table</button>
          <button className="btn btn-outline btn-sm"><Download size={16} /> Download QR</button>
        </div>
      </div>

      <div className="tables-grid">
        {tables.map(table => {

          // Secure integer parsing to ensure '7', '07', and 'table_7' all evaluate to 7
          const tableNumClean = parseInt(String(table.number || table.id).replace(/\D/g, ''), 10);

          const tableOrders = orders.filter(o => {
            const oNumClean = parseInt(String(o.tableId).replace(/\D/g, ''), 10);
            return oNumClean === tableNumClean && o.status !== 'SERVED';
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
              <div className="table-number">{table.number}</div>
              <div className={pillClasses[displayStatus]}>{statusLabels[displayStatus]}</div>

              {tableOrders.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '.5rem' }}>
                  <div className="table-order-total">₹{combinedTotal}</div>
                  <div className="table-order-id">{tableOrders.length} active ticket(s)</div>
                </div>
              )}

              {hasBill && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)' }}>Table {viewingTableOrders.number} - Active Orders</h3>
              <button className="action-icon-btn" onClick={() => setViewingTableOrders(null)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>

              {orders.filter(o => {
                const oNumClean = parseInt(String(o.tableId).replace(/\D/g, ''), 10);
                const viewNumClean = parseInt(String(viewingTableOrders.number || viewingTableOrders.id).replace(/\D/g, ''), 10);
                return oNumClean === viewNumClean && o.status !== 'SERVED';
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
                </div>
              ))}
            </div>
          </div>
        </div>
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