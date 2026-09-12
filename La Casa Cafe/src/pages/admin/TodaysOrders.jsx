import React, { useState } from 'react';
import { Printer, ClipboardList } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function TodaysOrders() {
    const { orders, settings, payments } = useData();

    // Sort order: 'settle' (default) sorts by when the bill was SETTLED;
    // 'placed' sorts by when the order was PLACED (kitchen ticket time).
    const [sortBy, setSortBy] = useState('settle');

    // Get today's date string in YYYY-MM-DD format based on local time
    const today = new Date().toLocaleDateString('en-CA');

    // Filter orders matching today's date
    const todaysOrders = orders.filter(ord => {
        if (!ord.createdAt) return false;
        const orderDate = new Date(ord.createdAt).toLocaleDateString('en-CA');
        return orderDate === today;
    });

    // Settle times — a settled bill (payment) records when each order was settled.
    const settleTimeByOrder = (() => {
        const map = {};
        for (const p of payments) {
            for (const oid of p.orderIds || []) {
                if (!map[oid] || new Date(p.settledAt) < new Date(map[oid])) map[oid] = p.settledAt;
            }
        }
        return map;
    })();

    // Default: by settle time (unsettled last) · 'placed': by order placement time.
    const sortedOrders = [...todaysOrders].sort((a, b) => {
        if (sortBy === 'settle') {
            const sa = settleTimeByOrder[a.id] ? new Date(settleTimeByOrder[a.id]).getTime() : Infinity;
            const sb = settleTimeByOrder[b.id] ? new Date(settleTimeByOrder[b.id]).getTime() : Infinity;
            if (sa !== sb) return sa - sb;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const when = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Cancelled tickets stay visible in the log (red badge) but are excluded
    // from both printouts and their totals.
    const printableOrders = sortedOrders.filter((o) => o.status !== 'CANCELLED');

    const printPortal = (rep) => {
        const portal = document.createElement('div');
        portal.id = 'print-portal';
        portal.appendChild(rep);
        document.body.appendChild(portal);
        const cleanup = () => { portal.remove(); window.removeEventListener('afterprint', cleanup); };
        window.addEventListener('afterprint', cleanup);
        window.print();
        setTimeout(cleanup, 60000);
    };

    const printTodaysOrders = () => {
        if (!printableOrders.length) { alert("No orders have been placed today yet."); return; }
        // ONE single continuous printout — all orders listed one after another
        // (no page breaks), with a header and a grand total at the end.
        const rows = printableOrders.map((ord) => {
            const items = (ord.items || [])
                .map(i => `${i.quantity} × ${i.name}`)
                .join(', ') || '—';
            return '<div style="margin-bottom:.55rem;padding-bottom:.55rem;border-bottom:1px dashed #ddd">' +
                '<div style="display:flex;justify-content:space-between;font-size:.9rem;font-weight:700">' +
                    '<span>#' + ord.id + ' — Table ' + String(ord.tableId || '').replace(/\D/g, '') + ' — ' + when(ord.createdAt) + '</span>' +
                    '<span>₹' + (ord.total || 0) + '</span>' +
                '</div>' +
                '<div style="font-size:.8rem;color:#444;margin-top:.15rem">' + items + '</div>' +
                '<div style="font-size:.75rem;color:#888;margin-top:.1rem">' +
                    (ord.customerName || 'Guest') + ' · ' + (ord.status || '') +
                '</div>' +
            '</div>';
        }).join('');
        const grandTotal = printableOrders.reduce((s, o) => s + (o.total || 0), 0);

        const rep = document.createElement('div');
        rep.id = 'printable-receipt';
        rep.innerHTML =
            '<div style="text-align:center;margin-bottom:.6rem">' +
                '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
                '<div style="font-size:.85rem;font-weight:700;letter-spacing:.5px">TODAY&#39;S ORDERS</div>' +
                '<div style="font-size:.75rem;color:#555">' + new Date().toLocaleString('en-IN') + '</div>' +
            '</div>' +
            '<div style="border-top:1px dashed #999;margin-bottom:.5rem"></div>' +
            rows +
            '<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;border-top:1px solid #111;padding-top:.5rem;margin-top:.5rem">' +
                '<span>ORDERS: ' + printableOrders.length + ' · GRAND TOTAL</span>' +
                '<span>₹' + grandTotal + '</span>' +
            '</div>';

        printPortal(rep);
    };

    const printOrderHistory = () => {
        if (!printableOrders.length) { alert("No orders have been placed today yet."); return; }
        // Order-history format, trimmed to the essentials: Table | Items | Total.
        // Footer totals like the Z-report: total orders + total amount.
        const grandTotal = printableOrders.reduce((s, o) => s + (o.total || 0), 0);
        const rows = printableOrders.map((ord) =>
            '<tr>' +
                '<td style="padding:.35rem .4rem;border-bottom:1px solid #ddd;font-weight:700;white-space:nowrap">' +
                    (String(ord.tableId).toUpperCase() === 'PARCEL' ? 'Parcel' : String(ord.tableId || '').replace(/\D/g, '')) +
                '</td>' +
                '<td style="padding:.35rem .4rem;border-bottom:1px solid #ddd">' + ((ord.items || []).map(i => `${i.quantity} × ${i.name}`).join(', ') || '—') + '</td>' +
                '<td style="padding:.35rem .4rem;border-bottom:1px solid #ddd;text-align:right;font-weight:600;white-space:nowrap">₹' + (ord.total || 0) + '</td>' +
            '</tr>'
        ).join('');

        const rep = document.createElement('div');
        rep.id = 'printable-receipt';
        rep.innerHTML =
            '<div style="text-align:center;margin-bottom:.6rem">' +
                '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
                '<div style="font-size:.85rem;font-weight:700;letter-spacing:.5px">ORDER HISTORY — TODAY</div>' +
                '<div style="font-size:.75rem;color:#555">' + new Date().toLocaleString('en-IN') + '</div>' +
            '</div>' +
            '<table style="width:100%;border-collapse:collapse;font-size:.8rem;margin-bottom:.5rem">' +
                '<thead><tr>' +
                    '<th style="padding:.35rem .4rem;border-bottom:2px solid #111;text-align:left;white-space:nowrap">Table</th>' +
                    '<th style="padding:.35rem .4rem;border-bottom:2px solid #111;text-align:left">Items</th>' +
                    '<th style="padding:.35rem .4rem;border-bottom:2px solid #111;text-align:right;white-space:nowrap">Total</th>' +
                '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table>' +
            '<div style="border-top:2px solid #111;margin-top:.4rem;padding-top:.5rem">' +
                '<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700">' +
                    '<span>TOTAL ORDERS: ' + printableOrders.length + '</span>' +
                    '<span>₹' + grandTotal + '</span>' +
                '</div>' +
            '</div>';

        printPortal(rep);
    };

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Today's Orders</h2>
                    <p className="admin-page-sub">Live log of all tickets generated on {new Date().toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Sort toggle — default: by settle time · click "Placed" to sort by placement */}
                    <div style={{ display: 'flex', gap: '.25rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '.25rem' }}>
                        {[
                            { key: 'settle', label: 'Settle Time' },
                            { key: 'placed', label: 'Placed' },
                        ].map((s) => (
                            <button
                                key={s.key}
                                className="btn btn-sm"
                                onClick={() => setSortBy(s.key)}
                                style={{
                                    background: sortBy === s.key ? 'var(--color-primary)' : 'transparent',
                                    color: sortBy === s.key ? '#fff' : 'var(--color-text)',
                                    border: 'none', padding: '.4rem .75rem', borderRadius: '4px',
                                    fontSize: '.75rem', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={printOrderHistory} title="Order-history format: Table | Items | Total, with order count & amount at the end">
                        <ClipboardList size={16} /> Print History
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={printTodaysOrders} title="Print all of today's orders as one single continuous list">
                        <Printer size={16} /> Print Today's Orders
                    </button>
                </div>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Table</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Time</th>
                            <th>Settled</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length > 0 ? (
                            sortedOrders.map(ord => (
                                <tr key={ord.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{ord.id}</td>
                                    <td>{String(ord.tableId).toUpperCase() === 'PARCEL' ? 'Parcel' : `Table ${String(ord.tableId).padStart(2, '0')}`}</td>
                                    <td>{ord.customerName || 'Guest'}</td>
                                    <td>{(ord.items || []).map(i => `${i.quantity} × ${i.name}`).join(', ')}</td>
                                    <td style={{ fontWeight: 700 }}>₹{ord.total}</td>
                                    <td>
                                        <span className={`badge ${ord.status === 'SERVED' ? 'badge-success' : ord.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
                                            {ord.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
                                        {when(ord.createdAt)}
                                    </td>
                                    <td style={{ fontSize: '.875rem', color: settleTimeByOrder[ord.id] ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                        {settleTimeByOrder[ord.id] ? when(settleTimeByOrder[ord.id]) : '—'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                    No orders have been placed today yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}