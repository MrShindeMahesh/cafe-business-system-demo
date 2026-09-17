import React, { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { X, Printer, CheckCircle2, Coffee, ChefHat, Pencil } from 'lucide-react';

import { useData } from '../../context/DataContext';



export default function BillModal({ table, onClose }) {

    const { orders, updateOrderStatus, setBills, setTables, settings, setPayments, payments, bills, tables, addPayment, updateSettings } = useData();

    const navigate = useNavigate();

    const [printing, setPrinting] = useState(false);

    const [kotPrinting, setKotPrinting] = useState(false);

    // Phase 2/3 — discount + payment mode for the consolidated bill

    const [discountInput, setDiscountInput] = useState('');

    const [paymentMode, setPaymentMode] = useState('Cash');



    // Multi-QR — list of uploaded UPI QRs (Settings → UPI Payment), e.g. HDFC / PhonePe / GPay.

    const qrList = (() => {

        try {

            const parsed = JSON.parse(settings?.upiQrs || '[]');

            if (Array.isArray(parsed) && parsed.length) return parsed;

        } catch { /* legacy single-QR below */ }

        return settings?.upiQr ? [{ id: '1', label: 'UPI', path: settings.upiQr }] : [];

    })();

    const [qrId, setQrId] = useState(null);

    const selectedQr = qrList.find(q => String(q.id) === String(qrId)) || qrList[0] || null;



    const tableNumClean = parseInt(String(table.number || table.id).replace(/\D/g, ''), 10);



    // Parcel orders (takeaway) have tableId 'PARCEL' — no table number involved.

    // BUGFIX: when BillModal is opened for ONE parcel ticket (table.orderId is set),

    // settle ONLY that ticket — never all open parcel orders together.

    const isParcel = String(table.number || table.id).toUpperCase() === 'PARCEL';



        // A table/parcel-ticket is "billable" as long as it has ORDERS that are

    // not CANCELLED and not yet PAIID. A SERVED-but-not-settled order (kitchen

    // marked served, bill not yet paid) must STILL appear in the bill so the

    // cashier can settle it — otherwise an open bill silently disappears.

    const isUnpaid = (o) => !payments.some(p => (p.orderIds || []).includes(o.id));

    const tableOrders = isParcel

        ? (table.orderId

            ? orders.filter(o => String(o.tableId || '').toUpperCase() === 'PARCEL' && o.id === table.orderId && o.status !== 'CANCELLED' && isUnpaid(o))

            : orders.filter(o => String(o.tableId || '').toUpperCase() === 'PARCEL' && o.status !== 'CANCELLED' && isUnpaid(o)))

        : orders.filter(o => {

            const oNumClean = parseInt(String(o.tableId).replace(/\D/g, ''), 10);

            return oNumClean === tableNumClean && o.status !== 'CANCELLED' && isUnpaid(o);

        });



    const combinedSubtotal = tableOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

    const combinedTotal = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);


    // ---- GST / service charge / tip ----
    const gstEnabled = settings?.gstEnabled === true;
    const gstRate = Number(settings?.gstRate) || 0;
    const gstIn = settings?.gstIn || '';
    const serviceChargeEnabled = settings?.serviceChargeEnabled === true;
    const serviceChargePercent = Number(settings?.serviceChargePercent) || 0;
    const tipEnabled = settings?.tipEnabled === true;

    const gstAmount = gstEnabled ? Math.round(combinedSubtotal * (gstRate / 100) * 100) / 100 : 0;
    const afterGst = combinedSubtotal + gstAmount;
    const scAmount = serviceChargeEnabled ? Math.round(afterGst * (serviceChargePercent / 100) * 100) / 100 : 0;
    const grandTotal = afterGst + scAmount;

    const discountNum = Math.min(Math.max(Number(discountInput) || 0, 0), grandTotal);

    const finalTotal = Math.round((grandTotal - discountNum) * 100) / 100;

    // ---- bill number: assigned once per bill (daily sequence 1, 2, 3…) ----
    // Stored on the orders server-side, so reprinting always shows the same number.

    const [billNo, setBillNo] = useState(null);

    useEffect(() => {

        const ids = tableOrders.map(o => o.id).filter(Boolean);

        if (!ids.length) return;

        let alive = true;

        fetch('/api/bills/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: ids }) })

            .then(r => r.json())

            .then(d => { if (alive && d && d.ok) setBillNo(d.billNo); })

            .catch(() => {});

        return () => { alive = false; };

    }, []); // run once when the bill modal opens



    const printBill = () => {

        // Clone the receipt to a top-level portal before printing — content inside

        // the fixed-position modal gets clipped to one printed page by Chrome,

        // which cuts off the Subtotal / Grand Total.

        const node = document.getElementById('printable-receipt');

        if (!node) return;

        const portal = document.createElement('div');

        portal.id = 'print-portal';

        portal.appendChild(node.cloneNode(true));

        document.body.appendChild(portal);

        const cleanup = () => { portal.remove(); window.removeEventListener('afterprint', cleanup); };

        window.addEventListener('afterprint', cleanup);

        window.print();

        setTimeout(cleanup, 60000); // safety net if afterprint doesn't fire

    };



    const printKot = () => {

        if (!tableOrders.length) return;

        // KOT via the browser printer — same printer/dialog as Print Bill.

        // One kitchen ticket per pending order, page-break between tickets.

        const portal = document.createElement('div');

        portal.id = 'print-portal';

        tableOrders.forEach((ord, i) => {

            const kot = document.createElement('div');

            kot.id = 'printable-receipt';

            if (i > 0) kot.style.pageBreakBefore = 'always';

            const when = new Date(ord.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const items = (ord.items || []).map((it) => {

                const variantLines = it.customizations?.variants ? Object.values(it.customizations.variants).filter(v => v && v.name).map(v => v.name) : [];
                const addonLines = it.customizations?.addons ? Object.values(it.customizations.addons).filter(a => a && a.name).map(a => a.name) : [];
                const modNames = [...variantLines, ...addonLines];
                const modHtml = modNames.length ? '<div style="font-size:.75rem;color:#666;margin-top:.15rem">' + modNames.join(', ') + '</div>' : '';

                const veg = it.veg === false ? 'N' : it.veg === true ? 'V' : '';
                const spice = it.spiceLevel || '';
                const cost = Number(it.costPrice);
                let tagHtml = '';
                if (veg || spice || cost) {
                    let tag = '';
                    if (veg) tag += '[' + veg + '] ';
                    if (spice) tag += spice + ' ';
                    if (cost) tag += 'cost ' + cost.toFixed(2);
                    tagHtml = '<div style="font-size:.7rem;color:#888;margin-top:.1rem">' + tag.trim() + '</div>';
                }

                const cust = it.customizationString || (it.customizations && it.customizations.instructions) || '';

                return '<div style="margin-bottom:.35rem">' +

                    '<div style="font-size:.95rem;font-weight:700">' + (it.quantity || 1) + ' × ' + it.name + '</div>' +

                    modHtml +

                    tagHtml +

                    (cust ? '<div style="font-size:.75rem;color:#444">[' + cust + ']</div>' : '') +

                    '</div>';

            }).join('');

            kot.innerHTML =

                '<div style="text-align:center;margin-bottom:.4rem">' +

                    '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +

                    '<div style="font-size:.8rem;font-weight:700;letter-spacing:.5px">KITCHEN ORDER TICKET</div>' +

                '</div>' +

                '<div style="font-size:.8rem;margin-bottom:.4rem">' + (isParcel ? 'Parcel (Takeaway)' : 'Table: ' + (table.number || '')) + ' &nbsp; Time: ' + when + '<br/>Order #: ' + ord.id + '</div>' +

                '<div style="border-top:1px dashed #999;margin-bottom:.4rem"></div>' +

                items +

                '<div style="border-top:1px dashed #999;margin-top:.5rem;padding-top:.4rem;text-align:center;font-size:.75rem;font-weight:700">PLEASE SERVE FRESH &amp; HOT</div>';

            portal.appendChild(kot);

        });

        document.body.appendChild(portal);

        const cleanup = () => { portal.remove(); window.removeEventListener('afterprint', cleanup); };

        window.addEventListener('afterprint', cleanup);

        window.print();

        setTimeout(cleanup, 60000); // safety net if afterprint doesn't fire

    };



    const handleSettleTable = () => {

        // Phase 2/3 — record the settled bill (discount + payment mode) for revenue reports

        const payment = {

            id: `pay_${Date.now()}`,

            tableId: isParcel ? 'PARCEL' : String(table.number || table.id),

            amount: finalTotal,

            discount: discountNum,

            // default to Cash when the mode was somehow left unset

            paymentMode: paymentMode || 'Cash',

            orderIds: tableOrders.map(o => o.id),

            itemCount: tableOrders.reduce((s, o) => s + (o.items || []).reduce((x, i) => x + (i.quantity || 1), 0), 0),

            settledAt: new Date().toISOString(),

        };

        // Atomic single-record POST (no wipe-and-reinsert) + server snapshot applied,

        // so the settlement always survives the 5s live-sync poll and shows in reports.

        addPayment(payment);



        tableOrders.forEach(o => updateOrderStatus(o.id, 'SERVED'));



        if (isParcel) {

            // Parcel: no bills queue and no table status to reset — just close the modal.

            onClose();

            return;

        }



        // IMPORTANT: pass full ARRAYS (not function updaters) — setBills/setTables are

        // persist-aware setters that PUT the list to the server. A function would be

        // stringified to `undefined`, wiping ALL tables/bills in the database!

        const nextBills = bills.filter(b => {

            const bNumClean = parseInt(String(b.tableId).replace(/\D/g, ''), 10);

            return bNumClean !== tableNumClean;

        });

        setBills(nextBills);



        const nextTables = tables.map(t => {

            const tNumClean = parseInt(String(t.number || t.id).replace(/\D/g, ''), 10);

            return tNumClean === tableNumClean ? { ...t, status: 'Available' } : t;

        });

        setTables(nextTables);



        onClose();

    };



    return (

        <div className="modal-overlay" style={{ zIndex: 1000, alignItems: 'center' }}>

            <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '420px', padding: '2rem', background: 'var(--color-surface)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>

                        <Coffee size={20} color="var(--color-primary)" />

                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>{isParcel ? 'Parcel Consolidated Bill' : `Table #${table.number} Consolidated Bill`}</h3>

                    </div>

                    <button className="action-icon-btn" onClick={onClose}><X size={20} /></button>

                </div>



                <div id="printable-receipt" style={{ background: '#fff', color: '#111', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', maxHeight: '42vh', overflowY: 'auto' }}>

                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>

                        {settings?.cafeLogo ? (

                            <img src={settings.cafeLogo} alt={settings?.cafeName || 'Café'} style={{ width: '56px', height: '56px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />

                        ) : (

                            <Coffee size={32} color="#8B4513" style={{ margin: '0 auto 4px', display: 'block' }} />

                        )}

                        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: 700, margin: '6px 0', letterSpacing: '.5px' }}>

                            {settings?.cafeName || 'La Casa'}

                        </h4>

                        <p style={{ fontSize: '1.05rem', color: '#666' }}>{isParcel ? 'Parcel (Takeaway)' : `Table #${table.number}`} • {tableOrders.length} Ticket(s)</p>

                        <p style={{ fontSize: '1.05rem', color: '#666' }}>{new Date().toLocaleString()}</p>

                        {settings?.contact && (
                            <p style={{ fontSize: '1.05rem', color: '#666', marginTop: '.15rem' }}>Ph: {settings.contact}</p>
                        )}

                        {gstEnabled && (
                            <p style={{ fontSize: '1rem', color: '#888', marginTop: '.25rem' }}>
                                GST @{gstRate}% {gstIn ? ` - GSTIN: ${gstIn}` : ''}
                            </p>
                        )}

                        {settings?.fssaiNo && (
                            <p style={{ fontSize: '1rem', color: '#888', marginTop: '.1rem' }}>
                                FSSAI No: {settings.fssaiNo}
                            </p>
                        )}

                        <p style={{ fontSize: '1.6rem', color: '#111', marginTop: '.45rem', fontWeight: 700, letterSpacing: '.5px' }}>
                            Bill No: {billNo ? `${(settings?.billPrefix ?? '')}${String(billNo).padStart(Number(settings?.billPadding) || 0, '0')}` : '—'}
                        </p>

                    </div>



                    {tableOrders.map((ord, idx) => (

                        <div key={ord.id} style={{ marginBottom: '1rem', borderBottom: idx < tableOrders.length - 1 ? '1px dashed #ddd' : 'none', paddingBottom: '.5rem' }}>

                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#888', marginBottom: '.3rem' }}>Ticket #{ord.id}</div>

                            {ord.items.map((item, i) => (

                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', marginBottom: '.3rem' }}>

                                    <div style={{ flex: 1, minWidth: 0 }}>

                                        <span>{item.quantity} × {item.name}</span>

                                        {(() => {
                                            const variants = item.customizations?.variants ? Object.keys(item.customizations.variants).filter(k => item.customizations.variants[k].name).map(k => item.customizations.variants[k].name) : [];
                                            const addons = item.customizations?.addons ? Object.keys(item.customizations.addons).filter(k => item.customizations.addons[k].name).map(k => item.customizations.addons[k].name) : [];
                                            const mods = [...variants, ...addons];
                                            if (mods.length) return <div style={{ fontSize: '1.05rem', color: '#666', marginTop: '.15rem' }}>{mods.join(', ')}</div>;
                                            return null;
                                        })()}

                                        {(() => {
                                            const veg = item.veg === false ? 'N' : item.veg === true ? 'V' : '';
                                            const spice = item.spiceLevel || '';
                                            const cost = Number(item.costPrice);
                                            if (veg || spice || cost) {
                                                let tag = '';
                                                if (veg) tag += `[${veg}] `;
                                                if (spice) tag += `${spice} `;
                                                if (cost) tag += `cost ${cost.toFixed(2)}`;
                                                return <div style={{ fontSize: '1rem', color: '#888', marginTop: '.1rem' }}>{tag.trim()}</div>;
                                            }
                                            return null;
                                        })()}

                                        {item.customizationString && (
                                            <div style={{ fontSize: '1rem', color: '#8B4513', marginTop: '.1rem', fontWeight: 600 }}>Note: {item.customizationString}</div>
                                        )}

                                    </div>

                                    <span style={{ fontWeight: 600, flexShrink: 0 }}>₹{item.calculatedPrice}</span>

                                </div>

                            ))}

                        </div>

                    ))}



                    <div style={{ borderTop: '1px dashed #ddd', paddingTop: '.75rem', marginTop: '.75rem' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#555', marginBottom: '.5rem' }}>

                            <span>Subtotal</span>

                            <span>₹{combinedSubtotal}</span>

                        </div>

                        {gstEnabled && gstAmount > 0 && (

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#555', marginBottom: '.5rem' }}>

                                <span>GST @{gstRate}%{gstIn ? ` (${gstIn})` : ''}</span>

                                <span>₹{gstAmount}</span>

                            </div>

                        )}

                        {serviceChargeEnabled && scAmount > 0 && (

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#555', marginBottom: '.5rem' }}>

                                <span>Svc.Charge @{serviceChargePercent}%</span>

                                <span>₹{scAmount}</span>

                            </div>

                        )}

                        {discountNum > 0 && (

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#b91c1c', marginBottom: '.5rem' }}>

                                <span>Discount</span>

                                <span>− ₹{discountNum}</span>

                            </div>

                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 700, borderTop: '1px solid #111', paddingTop: '.5rem', color: '#111' }}>

                            <span>Grand Total</span>

                            <span>₹{finalTotal}</span>

                        </div>

                    </div>


                    {/* UPI QR — ONE clean block: label + centered QR. Lives INSIDE printable-receipt so it prints on the bill too. */}
                    {paymentMode === 'UPI' && selectedQr && (
                        <div style={{ textAlign: 'center', marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px dashed #ddd' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginBottom: '.5rem' }}>
                                Scan to pay{selectedQr.label ? ` • ${selectedQr.label}` : ''}
                            </p>
                            <img src={selectedQr.path} alt={`UPI QR — ${selectedQr.label || 'Pay'}`} style={{ width: '150px', height: '150px', objectFit: 'contain', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />
                        </div>
                    )}

                    {/* Thank-you footer — prints on every bill */}
                    <div style={{ textAlign: 'center', marginTop: '.9rem', paddingTop: '.75rem', borderTop: '1px dashed #ddd' }}>
                        <p style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111', margin: 0 }}>Thank You! Visit Again 🙏</p>
                        <p style={{ fontSize: '1.05rem', color: '#666', margin: '.3rem 0 0' }}>— {settings?.cafeName || 'La Casa'} • Come back soon —</p>
                    </div>
                </div>
                {/* discount + payment mode — OUTSIDE printable-receipt (interactive UI, not printed) */}
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '.85rem' }}>
                    <span style={{ fontWeight: 600 }}>Discount ₹</span>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        style={{ width: '80px', padding: '.35rem .55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    />
                    {[5, 10].map((pct) => (
                        <button key={pct} className="btn btn-outline btn-sm" onClick={() => setDiscountInput(String(Math.round(combinedTotal * pct / 100)))}>
                            {pct}%
                        </button>
                    ))}
                    {discountNum > 0 && (
                        <button className="btn btn-outline btn-sm" onClick={() => setDiscountInput('')}>Clear</button>
                    )}
                    <span style={{ marginLeft: 'auto', fontWeight: 600 }}>Paid via</span>
                    <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        style={{ padding: '.35rem .55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: 600 }}
                    >
                        {['Cash', 'Card', 'UPI'].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                                {/* UPI QR selector — compact dropdown, only when multiple QRs are uploaded */}
                {paymentMode === 'UPI' && qrList.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem', fontSize: '.8rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>QR:</span>
                        <select
                            value={String(selectedQr?.id || '')}
                            onChange={(e) => setQrId(e.target.value)}
                            style={{ padding: '.35rem .55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: 600 }}
                        >
                            {qrList.map((q) => <option key={q.id} value={String(q.id)}>{q.label}</option>)}
                        </select>
                    </div>
                )}
                {/* Action buttons — pinned below the scroll area so Settle is always reachable */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1, minWidth: 140 }} onClick={printBill} disabled={printing}>
                        <Printer size={16} /> {printing ? 'Printing…' : 'Print Bill'}
                    </button>
                    <button
                        className="btn btn-outline"
                        style={{ flex: 1, minWidth: 130 }}
                        onClick={printKot}
                        disabled={kotPrinting}
                        title="Re-print kitchen order tickets for this table"
                    >
                        <ChefHat size={16} /> {kotPrinting ? 'Printing…' : 'Print KOT'}
                    </button>
                    <button
                        className="btn btn-outline"
                        style={{ flex: 1, minWidth: 130 }}
                        onClick={() => navigate(isParcel ? '/admin/take-order?mode=parcel' : `/admin/take-order?table=${tableNumClean}`)}
                        title={isParcel ? 'Add more items to a new parcel ticket' : 'Add more items to this table (creates a new kitchen ticket)'}
                    >
                        <Pencil size={16} /> Add Items
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={handleSettleTable}>
                        <CheckCircle2 size={16} /> Settle Table
                    </button>
                </div>
            </div>
        </div>
    );
}
