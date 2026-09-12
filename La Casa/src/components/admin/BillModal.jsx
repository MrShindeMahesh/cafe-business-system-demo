import React, { useState } from 'react';
import { X, Printer, CheckCircle2, Coffee, Wifi } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function BillModal({ table, onClose }) {
    const { orders, updateOrderStatus, setBills, setTables, settings } = useData();
    const [printing, setPrinting] = useState(false);

    const tableNumClean = parseInt(String(table.number || table.id).replace(/\D/g, ''), 10);

    const tableOrders = orders.filter(o => {
        const oNumClean = parseInt(String(o.tableId).replace(/\D/g, ''), 10);
        return oNumClean === tableNumClean && o.status !== 'SERVED';
    });

    const combinedSubtotal = tableOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const combinedTotal = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const handlePrint = () => { window.print(); };

    const handleThermalPrint = async () => {
        setPrinting(true);
        try {
            const res = await fetch('/api/print-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table, orders: tableOrders }),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Receipt sent to thermal printer!');
            } else if (data.logged) {
                alert('No printer configured — receipt logged to logs/print.log');
            } else {
                alert('Print failed: ' + (data.error || 'unknown error'));
            }
        } catch (e) {
            alert('Print failed: ' + e.message);
        } finally {
            setPrinting(false);
        }
    };

    const handleSettleTable = () => {
        tableOrders.forEach(o => updateOrderStatus(o.id, 'SERVED'));

        setBills(prev => prev.filter(b => {
            const bNumClean = parseInt(String(b.tableId).replace(/\D/g, ''), 10);
            return bNumClean !== tableNumClean;
        }));

        setTables(prev => prev.map(t => {
            const tNumClean = parseInt(String(t.number || t.id).replace(/\D/g, ''), 10);
            return tNumClean === tableNumClean ? { ...t, status: 'Available' } : t;
        }));

        onClose();
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1000, alignItems: 'center' }}>
            <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '420px', padding: '2rem', background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <Coffee size={20} color="var(--color-primary)" />
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>Table #{table.number} Consolidated Bill</h3>
                    </div>
                    <button className="action-icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div id="printable-receipt" style={{ background: '#fff', color: '#111', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '1.5rem', maxHeight: '40vh', overflowY: 'auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        {settings?.cafeLogo ? (
                            <img src={settings.cafeLogo} alt={settings?.cafeName || 'Café'} style={{ width: '56px', height: '56px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />
                        ) : (
                            <Coffee size={32} color="#8B4513" style={{ margin: '0 auto 4px', display: 'block' }} />
                        )}
                        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, margin: '4px 0' }}>
                            {settings?.cafeName || 'La Casa'}
                        </h4>
                        <p style={{ fontSize: '.75rem', color: '#666' }}>Table #{table.number} • {tableOrders.length} Ticket(s)</p>
                        <p style={{ fontSize: '.75rem', color: '#666' }}>{new Date().toLocaleString()}</p>
                    </div>

                    {tableOrders.map((ord, idx) => (
                        <div key={ord.id} style={{ marginBottom: '1rem', borderBottom: idx < tableOrders.length - 1 ? '1px dashed #ddd' : 'none', paddingBottom: '.5rem' }}>
                            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#888', marginBottom: '.25rem' }}>Ticket #{ord.id}</div>
                            {ord.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.2rem' }}>
                                    <span>{item.quantity} × {item.name}</span>
                                    <span style={{ fontWeight: 600 }}>₹{item.calculatedPrice}</span>
                                </div>
                            ))}
                        </div>
                    ))}

                    <div style={{ borderTop: '1px dashed #ddd', paddingTop: '.75rem', marginTop: '.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8125rem', color: '#555', marginBottom: '.5rem' }}>
                            <span>Subtotal</span>
                            <span>₹{combinedSubtotal}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, borderTop: '1px solid #111', paddingTop: '.5rem', color: '#111' }}>
                            <span>Grand Total</span>
                            <span>₹{combinedTotal}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" style={{ flex: 1, minWidth: 120 }} onClick={handlePrint}>
                        <Printer size={16} /> Print Bill
                    </button>
                    <button
                        className="btn btn-outline"
                        style={{ flex: 1, minWidth: 140 }}
                        onClick={handleThermalPrint}
                        disabled={printing}
                        title="Send to thermal receipt printer (ESC/POS over LAN/WiFi)"
                    >
                        <Wifi size={16} /> {printing ? 'Sending…' : 'Thermal Print'}
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={handleSettleTable}>
                        <CheckCircle2 size={16} /> Settle Table
                    </button>
                </div>
            </div>
        </div>
    );
}