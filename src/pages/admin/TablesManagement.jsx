import React from 'react';
import { Download, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function TablesManagement() {
  const { tables, orders, bills } = useData();

  return (
    <div className="animate-fade-in">
      <div className="table-view-header">
        <div>
          <h2 className="table-view-title">Table Floorplan</h2>
          <p className="table-view-sub">Manage your café tables and QR codes in real-time.</p>
        </div>
        <button className="btn btn-outline btn-sm"><Download size={16}/> Download All QR</button>
      </div>

      <div className="tables-grid">
        {tables.map(table => {
          const activeOrder = orders.find(o => o.tableId === table.id && o.status !== 'SERVED');
          const hasBill = bills.some(b => b.tableId === table.id && b.status === 'REQUESTED');

          let displayStatus = 'available';
          if (activeOrder) displayStatus = 'ordering';
          if (hasBill) displayStatus = 'requested';
          if (activeOrder && activeOrder.status === 'SERVED') displayStatus = 'occupied';

          const statusLabels = { available:'Available', ordering:'Ordering', occupied:'Occupied', requested:'Bill Requested' };
          const pillClasses = { available:'table-status-pill pill-available', ordering:'table-status-pill pill-ordering', occupied:'table-status-pill pill-occupied', requested:'table-status-pill pill-requested' };
          const cardBorder = { available:'table-card table-card-available', ordering:'table-card table-card-ordering', occupied:'table-card table-card-occupied', requested:'table-card table-card-requested' };

          return (
            <div key={table.id} className={cardBorder[displayStatus]}>
              <div className="table-number">{table.number}</div>
              <div className={pillClasses[displayStatus]}>{statusLabels[displayStatus]}</div>
              {activeOrder && (
                <div style={{ textAlign:'center', marginTop:'.75rem' }}>
                  <div className="table-order-total">₹{activeOrder.total}</div>
                  <div className="table-order-id">Order #{activeOrder.id}</div>
                </div>
              )}
              {hasBill && (
                <button className="btn btn-primary btn-sm" style={{ marginTop:'1rem' }}>
                  <FileText size={14}/> Generate Bill
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
