import React, { useState, useMemo } from 'react';
import { Printer, ClipboardList, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

export default function TodaysOrders() {
    const navigate = useNavigate();
    const { orders, settings, payments } = useData();

    // ── Date Range ──────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const getDateFilter = () => {
        if (dateRange === 'today') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            return { start, end };
        }
        if (dateRange === 'yesterday') {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
            return { start, end };
        }
        if (dateRange === 'thisWeek') {
            const now = new Date();
            const start = new Date(now);
            start.setDate(start.getDate() - start.getDay());
            start.setHours(0, 0, 0, 0);
            const end = new Date(start.getTime() + 7 * 86400000);
            return { start, end };
        }
        if (dateRange === 'thisMonth') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return { start, end };
        }
        if (dateRange === 'custom' && customFrom && customTo) {
            const start = new Date(customFrom + 'T00:00:00');
            const end = new Date(customTo + 'T23:59:59');
            return { start, end };
        }
        return null;
    };

    const range = getDateFilter();

    const filteredOrders = useMemo(() => {
        if (!range) return orders;
        return orders.filter(ord => {
            if (!ord.createdAt) return false;
            const t = new Date(ord.createdAt).getTime();
            return t >= range.start.getTime() && t < range.end.getTime();
        });
    }, [orders, range]);

    // ── Sort ─────────────────────────────────────────────────────────
    const [sortBy, setSortBy] = useState('settle');

    const settleTimeByOrder = useMemo(() => {
        const map = {};
        for (const p of payments) {
            for (const oid of p.orderIds || []) {
                if (!map[oid] || new Date(p.settledAt) < new Date(map[oid])) map[oid] = p.settledAt;
            }
        }
        return map;
    }, [payments]);

    const sortedOrders = useMemo(() => {
        return [...filteredOrders].sort((a, b) => {
            if (sortBy === 'settle') {
                const sa = settleTimeByOrder[a.id] ? new Date(settleTimeByOrder[a.id]).getTime() : -Infinity;
                const sb = settleTimeByOrder[b.id] ? new Date(settleTimeByOrder[b.id]).getTime() : -Infinity;
                if (sa !== sb) return sb - sa; // most recently settled first, open orders last
            }
            return new Date(b.createdAt) - new Date(a.createdAt); // most recently placed first
        });
    }, [filteredOrders, sortBy, settleTimeByOrder]);

    const printableOrders = sortedOrders.filter(o => o.status !== 'CANCELLED');

    const when = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const dateLabel = () => {
        if (dateRange === 'today') return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (dateRange === 'yesterday') {
            const d = new Date(); d.setDate(d.getDate() - 1);
            return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        if (dateRange === 'thisWeek') return 'This Week (Mon–Sun)';
        if (dateRange === 'thisMonth') return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        if (dateRange === 'custom') return `${customFrom || '—'}  →  ${customTo || '—'}`;
        return '';
    };

    // ── Print helpers ────────────────────────────────────────────────
    const printPortal = (node) => {
        const portal = document.createElement('div');
        portal.id = 'print-portal';
        portal.appendChild(node);
        document.body.appendChild(portal);
        const cleanup = () => { portal.remove(); window.removeEventListener('afterprint', cleanup); };
        window.addEventListener('afterprint', cleanup);
        window.print();
        setTimeout(cleanup, 60000);
    };

    const printTodaysOrders = () => {
        if (!printableOrders.length) { alert("No orders found for this date range."); return; }
        const rows = printableOrders.map((ord) => {
            const items = (ord.items || [])
                .map(i => `${i.quantity} × ${i.name}`)
                .join(', ') || '—';
            return '<div style="margin-bottom:.55rem;padding-bottom:.55rem;border-bottom:1px dashed #ddd">' +
                '<div style="display:flex;justify-content:space-between;font-size:.9rem;font-weight:700">' +
                    '<span>#' + ord.id + ' — ' + (String(ord.tableId).toUpperCase() === 'PARCEL' ? 'Parcel' : 'Table ' + String(ord.tableId).padStart(2, '0')) + ' — ' + when(ord.createdAt) + '</span>' +
                    '<span>₹' + (ord.total || 0) + '</span>' +
                '</div>' +
                '<div style="font-size:.8rem;color:#444;margin-top:.15rem">' + items + '</div>' +
                '<div style="font-size:.75rem;color:#888;margin-top:.1rem">' +
                    (ord.customerName || 'Guest') + ' · ' + (ord.status || '') +
                '</div>' +
            '</div>';
        }).join('');
        const grandTotal = printableOrders.reduce((s, o) => s + (o.total || 0), 0);
        const count = printableOrders.length;

        const rep = document.createElement('div');
        rep.id = 'printable-receipt';
        rep.innerHTML =
            '<div style="text-align:center;margin-bottom:.6rem">' +
                '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
                '<div style="font-size:.85rem;font-weight:700;letter-spacing:.5px">' + (dateRange === 'today' ? "TODAY'S ORDERS" : dateRange === 'yesterday' ? "YESTERDAY'S ORDERS" : 'ORDERS LOG') + '</div>' +
                '<div style="font-size:.75rem;color:#555">' + dateLabel() + '</div>' +
            '</div>' +
            '<div style="border-top:1px solid #999;margin-bottom:.5rem"></div>' +
            rows +
            '<div style="border-top:1px solid #999;margin-top:.6rem;padding-top:.4rem;display:flex;justify-content:space-between;font-weight:700">' +
                '<span>' + count + ' order(s)</span><span>₹' + grandTotal.toLocaleString() + '</span>' +
            '</div>';
        printPortal(rep);
    };

    const printOrderHistory = () => {
        if (!printableOrders.length) { alert("No orders found for this date range."); return; }
        const rows = printableOrders.map((ord) => {
            const items = (ord.items || [])
                .map(i => (i.quantity > 1 ? `${i.quantity}× ` : '') + i.name)
                .join(', ') || '—';
            return '<div style="display:flex;justify-content:space-between;font-size:.85rem;padding:.3rem 0;border-bottom:1px dotted #ccc">' +
                '<span style="font-weight:700;min-width:80px">' + (String(ord.tableId).toUpperCase() === 'PARCEL' ? 'PARCEL' : 'T' + String(ord.tableId).padStart(2, '0')) + '</span>' +
                '<span style="flex:1;padding:0 .5rem">' + items + '</span>' +
                '<span style="font-weight:700">₹' + (ord.total || 0) + '</span>' +
            '</div>';
        }).join('');
        const grandTotal = printableOrders.reduce((s, o) => s + (o.total || 0), 0);

        const rep = document.createElement('div');
        rep.id = 'printable-receipt';
        rep.innerHTML =
            '<div style="text-align:center;margin-bottom:.5rem">' +
                '<h4 style="font-size:1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
                '<div style="font-size:.75rem;color:#555">' + dateLabel() + '</div>' +
            '</div>' +
            '<div style="border-top:1px solid #999"></div>' +
            rows +
            '<div style="border-top:1px solid #999;margin-top:.4rem;display:flex;justify-content:space-between;font-weight:700">' +
                '<span>' + printableOrders.length + ' order(s)</span><span>₹' + grandTotal.toLocaleString() + '</span>' +
            '</div>';
        printPortal(rep);
    };

    const printSingleBill = (ord) => {
        const items = (ord.items || [])
            .map(i => (i.quantity > 1 ? `${i.quantity}× ` : '') + i.name)
            .join(', ') || '—';
        const rep = document.createElement('div');
        rep.id = 'printable-receipt';
        rep.innerHTML =
            '<div style="text-align:center;margin-bottom:.4rem">' +
                '<h4 style="font-size:1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
                '<div style="font-size:.75rem;color:#555">Order #' + ord.id + (ord.billNo ? '  ·  Bill No: ' + ord.billNo : '') + '</div>' +
            '</div>' +
            '<div style="border-top:1px solid #999;margin-bottom:.3rem;padding:0 .3rem;font-size:.8rem">' +
                (String(ord.tableId).toUpperCase() === 'PARCEL' ? 'Parcel (Takeaway)' : 'Table ' + String(ord.tableId).padStart(2, '0')) +
                '  ·  ' + when(ord.createdAt) +
            '</div>' +
            '<div style="font-size:.8rem;margin-bottom:.3rem">' + items + '</div>' +
            '<div style="border-top:1px solid #999;margin-top:.3rem;display:flex;justify-content:space-between;font-weight:700">' +
                '<span>Total</span><span>₹' + (ord.total || 0) + '</span>' +
            '</div>' +
            '<div style="font-size:.75rem;color:#555;margin-top:.2rem">' +
                (ord.customerName || 'Guest') + '  ·  ' + (ord.status || '') +
            '</div>';
        printPortal(rep);
    };

    // ── Edit: navigate to TakeOrder in edit mode ────────────────────
    const openEdit = (ord) => {
        navigate(`/admin/take-order?edit=${ord.id}`, { replace: true });
    };

    // ── Row action buttons ───────────────────────────────────────────
    const rowActions = (ord) => {
        const settled = ord.status === 'SERVED';
        if (settled) {
            return (
                <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-xs" onClick={() => printSingleBill(ord)} title="Print this bill">
                        <Printer size={11} /> Print
                    </button>
                    <button className="btn btn-outline btn-xs" onClick={() => openEdit(ord)} title="Edit this order">
                        <Edit2 size={11} /> Edit
                    </button>
                </div>
            );
        }
        if (ord.status === 'CANCELLED') {
            return <span style={{ fontSize: '.7rem', color: 'var(--color-danger)' }}>Cancelled</span>;
        }
        return <span style={{ fontSize: '.7rem', color: 'var(--color-text-muted)' }}>Open</span>;
    };

    // ── Date presets ─────────────────────────────────────────────────
    const datePresets = [
        { key: 'today', label: 'Today' },
        { key: 'yesterday', label: 'Yesterday' },
        { key: 'thisWeek', label: 'This Week' },
        { key: 'thisMonth', label: 'This Month' },
        { key: 'custom', label: 'Custom' },
    ];

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">
                        {dateRange === 'today' ? "Today's Orders" :
                         dateRange === 'yesterday' ? "Yesterday's Orders" : 'Orders Log'}
                    </h2>
                    <p className="admin-page-sub">{dateLabel()}</p>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Date Range Picker */}
                    <div style={{ display: 'flex', gap: '.2rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '.2rem' }}>
                        {datePresets.map((d) => (
                            <button
                                key={d.key}
                                className="btn btn-sm"
                                onClick={() => { setDateRange(d.key); setCustomFrom(''); setCustomTo(''); }}
                                style={{
                                    background: dateRange === d.key ? 'var(--color-primary)' : 'transparent',
                                    color: dateRange === d.key ? '#fff' : 'var(--color-text)',
                                    border: 'none', padding: '.4rem .55rem', borderRadius: '4px',
                                    fontSize: '.7rem', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date inputs */}
                    {dateRange === 'custom' && (
                        <div style={{ display: 'flex', gap: '.3rem', alignItems: 'center' }}>
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                min={new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)}
                                max={new Date().toISOString().slice(0, 10)}
                                style={{ padding: '.3rem .4rem', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '.75rem', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '.7rem' }}>to</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                min={customFrom || new Date().toISOString().slice(0, 10)}
                                max={new Date().toISOString().slice(0, 10)}
                                style={{ padding: '.3rem .4rem', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '.75rem', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                        </div>
                    )}

                    {/* Sort toggle */}
                    <div style={{ display: 'flex', gap: '.2rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '.2rem' }}>
                        {[
                            { key: 'settle', label: 'By Settle' },
                            { key: 'placed', label: 'By Placed' },
                        ].map((s) => (
                            <button
                                key={s.key}
                                className="btn btn-sm"
                                onClick={() => setSortBy(s.key)}
                                style={{
                                    background: sortBy === s.key ? 'var(--color-primary)' : 'transparent',
                                    color: sortBy === s.key ? '#fff' : 'var(--color-text)',
                                    border: 'none', padding: '.4rem .55rem', borderRadius: '4px',
                                    fontSize: '.7rem', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <button className="btn btn-outline btn-sm" onClick={printOrderHistory} title="Compact table | items | total format">
                        <ClipboardList size={13} /> History
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={printTodaysOrders} title="Full list with item details and totals">
                        <Printer size={13} /> Print All
                    </button>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
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
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.length > 0 ? (
                                sortedOrders.map(ord => (
                                    <tr key={ord.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '.85rem', whiteSpace: 'nowrap' }}>
                                            #{ord.id}
                                            {ord.billNo ? (
                                                <div style={{ fontSize: '.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Bill #{ord.billNo}</div>
                                            ) : null}
                                        </td>
                                        <td style={{ fontSize: '.85rem', whiteSpace: 'nowrap' }}>
                                            {String(ord.tableId).toUpperCase() === 'PARCEL'
                                                ? <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Parcel</span>
                                                : <span style={{ color: 'var(--color-text-muted)' }}>T{String(ord.tableId).padStart(2, '0')}</span>
                                            }
                                        </td>
                                        <td style={{ fontSize: '.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {ord.customerName || 'Guest'}
                                        </td>
                                        <td style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {(ord.items || []).slice(0, 3).map(i => `${i.quantity}× ${i.name}`).join(', ')}
                                            {(ord.items || []).length > 3 ? ` +${(ord.items || []).length - 3} more` : ''}
                                        </td>
                                        <td style={{ fontWeight: 700, fontSize: '.9rem', whiteSpace: 'nowrap' }}>₹{(ord.total || 0).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${ord.status === 'SERVED' ? 'badge-success' : ord.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '.7rem', padding: '.2rem .4rem' }}>
                                                {ord.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>{when(ord.createdAt)}</td>
                                        <td style={{ fontSize: '.8rem', color: settleTimeByOrder[ord.id] ? 'var(--color-success)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                            {settleTimeByOrder[ord.id] ? when(settleTimeByOrder[ord.id]) : '—'}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{rowActions(ord)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '.9rem' }}>
                                        No orders found for {dateLabel()}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
