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
        // Reprint the SAME receipt format as the bill print (BillModal):
        // logo, cafe name, contact, GST/GSTIN, bill no, item tags/mods, full totals breakdown.
        const s = settings || {};
        const payment = (payments || []).find(p => (p.orderIds || []).includes(ord.id)); // settlement → discount + payment mode
        const subtotal = Number(ord.subtotal) || (ord.items || []).reduce((sum, i) => sum + (Number(i.calculatedPrice) || 0), 0);
        const gstEnabled = s.gstEnabled === true;
        const gstRate = Number(s.gstRate) || 0;
        const gstIn = s.gstIn || '';
        const scEnabled = s.serviceChargeEnabled === true;
        const scPct = Number(s.serviceChargePercent) || 0;
        const gstAmount = gstEnabled ? Math.round(subtotal * (gstRate / 100) * 100) / 100 : 0;
        const afterGst = subtotal + gstAmount;
        const scAmount = scEnabled ? Math.round(afterGst * (scPct / 100) * 100) / 100 : 0;
        const grandTotal = afterGst + scAmount;
        const discount = Math.min(Math.max(Number(payment?.discount) || 0, 0), grandTotal);
        const finalTotal = Math.round((grandTotal - discount) * 100) / 100;
        const billNoLabel = (ord.billNo != null && ord.billNo !== '') ? `${s.billPrefix ?? ''}${String(ord.billNo).padStart(Number(s.billPadding) || 0, '0')}` : '—';
        const isParcel = String(ord.tableId).toUpperCase() === 'PARCEL';
        const billDate = payment?.settledAt || ord.createdAt || '';
        // UPI QR — same source as BillModal
        let selectedQr = null;
        try {
            const parsed = JSON.parse(s.upiQrs || '[]');
            if (Array.isArray(parsed) && parsed.length) selectedQr = parsed[0];
        } catch { /* legacy single-QR below */ }
        if (!selectedQr && s.upiQr) selectedQr = { label: 'UPI', path: s.upiQr };

        const itemRows = (ord.items || []).map((item) => {
            const variants = item.customizations?.variants ? Object.keys(item.customizations.variants).filter(k => item.customizations.variants[k].name).map(k => item.customizations.variants[k].name) : [];
            const addons = item.customizations?.addons ? Object.keys(item.customizations.addons).filter(k => item.customizations.addons[k].name).map(k => item.customizations.addons[k].name) : [];
            const mods = [...variants, ...addons];
            const veg = item.veg === false ? 'N' : item.veg === true ? 'V' : '';
            const spice = item.spiceLevel || '';
            const cost = Number(item.costPrice);
            let tag = '';
            if (veg) tag += `[${veg}] `;
            if (spice) tag += `${spice} `;
            if (cost) tag += `cost ${cost.toFixed(2)}`;
            const linePrice = item.calculatedPrice ?? (Number(item.unitPrice) || 0) * (item.quantity || 1);
            return '<div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:.2rem">' +
                '<div style="flex:1;min-width:0">' +
                    '<div>' + item.quantity + ' × ' + item.name + '</div>' +
                    (mods.length ? '<div style="font-size:.75rem;color:#666;margin-top:.15rem">' + mods.join(', ') + '</div>' : '') +
                    (tag.trim() ? '<div style="font-size:.7rem;color:#888;margin-top:.1rem">' + tag.trim() + '</div>' : '') +
                    (item.customizationString ? '<div style="font-size:.7rem;color:#8B4513;margin-top:.1rem;font-weight:600">Note: ' + item.customizationString + '</div>' : '') +
                '</div>' +
                '<span style="font-weight:600;flex-shrink:0">₹' + linePrice + '</span>' +
            '</div>';
        }).join('');

        const rep = document.createElement('div');
        rep.id = 'printable-receipt';
        rep.innerHTML =
            '<div style="background:#fff;color:#111;padding:1rem">' +
            '<div style="text-align:center;margin-bottom:1rem">' +
                (s.cafeLogo ? '<img src="' + s.cafeLogo + '" alt="logo" style="width:56px;height:56px;object-fit:contain;margin:0 auto 4px;display:block" />' : '') +
                '<h4 style="font-size:2.4rem;font-weight:800;margin:4px 0;letter-spacing:.08em;text-transform:uppercase">' + (s.cafeName || 'La Casa') + '</h4>' +
                (s.address ? '<p style="font-size:.8rem;color:#666;margin-top:.15rem;line-height:1.4">' + s.address + '</p>' : '') +
                '<p style="font-size:.75rem;color:#666">' + (isParcel ? 'Parcel (Takeaway)' : 'Table #' + String(ord.tableId)) + ' • 1 Ticket(s)</p>' +
                '<p style="font-size:.75rem;color:#666">' + new Date(billDate).toLocaleString() + '</p>' +
                (s.contact ? '<p style="font-size:.75rem;color:#666;margin-top:.15rem">Ph: ' + s.contact + '</p>' : '') +
                (gstEnabled ? '<p style="font-size:.7rem;color:#888;margin-top:.25rem">GST @' + gstRate + '%' + (gstIn ? ' - GSTIN: ' + gstIn : '') + '</p>' : '') +
                (s.fssaiNo ? '<p style="font-size:.7rem;color:#888;margin-top:.1rem">FSSAI No: ' + s.fssaiNo + '</p>' : '') +
                '<p style="font-size:.75rem;color:#888;margin-top:.25rem;font-weight:700">Bill No: ' + billNoLabel + '</p>' +
            '</div>' +
            '<div style="margin-bottom:1rem;border-bottom:1px dashed #ddd;padding-bottom:.5rem">' +
                '<div style="font-size:.75rem;font-weight:700;color:#888;margin-bottom:.25rem">Ticket #' + ord.id + '</div>' +
                itemRows +
            '</div>' +
            '<div style="border-top:1px dashed #ddd;padding-top:.75rem;margin-top:.75rem">' +
                '<div style="display:flex;justify-content:space-between;font-size:.8125rem;color:#555;margin-bottom:.5rem"><span>Subtotal</span><span>₹' + subtotal + '</span></div>' +
                (gstEnabled && gstAmount > 0 ? '<div style="display:flex;justify-content:space-between;font-size:.8125rem;color:#555;margin-bottom:.5rem"><span>GST @' + gstRate + '%' + (gstIn ? ' (' + gstIn + ')' : '') + '</span><span>₹' + gstAmount + '</span></div>' : '') +
                (scEnabled && scAmount > 0 ? '<div style="display:flex;justify-content:space-between;font-size:.8125rem;color:#555;margin-bottom:.5rem"><span>Svc.Charge @' + scPct + '%</span><span>₹' + scAmount + '</span></div>' : '') +
                (discount > 0 ? '<div style="display:flex;justify-content:space-between;font-size:.8125rem;color:#b91c1c;margin-bottom:.5rem"><span>Discount</span><span>− ₹' + discount + '</span></div>' : '') +
                '<div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:700;border-top:1px solid #111;padding-top:.5rem;color:#111"><span>Grand Total</span><span>₹' + finalTotal + '</span></div>' +
                (payment ? '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:#666;margin-top:.5rem"><span>Paid via ' + (payment.paymentMode || 'Cash') + '</span><span></span></div>' : '') +
            '</div>' +
            ((payment?.paymentMode === 'UPI' && selectedQr) ? '<div style="text-align:center;margin-top:.75rem;padding-top:.75rem;border-top:1px dashed #ddd"><p style="font-size:.8rem;font-weight:700;color:#111;margin-bottom:.5rem">Scan to pay' + (selectedQr.label ? ' • ' + selectedQr.label : '') + '</p><img src="' + selectedQr.path + '" alt="UPI QR" style="width:140px;height:140px;object-fit:contain;background:#fff;border-radius:8px;border:1px solid #ddd;display:block;margin:0 auto" /></div>' : '') +
            '<div style="text-align:center;margin-top:.9rem;padding-top:.75rem;border-top:1px dashed #ddd">' +
                '<p style="font-size:.95rem;font-weight:700;color:#111;margin:0">Thank You! Visit Again 🙏</p>' +
                '<p style="font-size:.78rem;color:#666;margin:.3rem 0 0">— ' + (s.cafeName || 'La Casa') + ' • Come back soon —</p>' +
            '</div>' +
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
