import React, { useState, useMemo } from 'react';
import { Printer, Plus, Trash2, IndianRupee, FileBarChart } from 'lucide-react';
import { useData } from '../../context/DataContext';

// Expenses tracking (Reception + Admin) — daily café expenses (supplies, rent,
// salary, etc.). Full panel: add expenses, today's running total, and a
// date-wise REPORT section (pick any date → list, category split, total, print).
const CATEGORIES = ['Supplies', 'Rent', 'Salary', 'Electricity', 'Repairs', 'Marketing', 'Other'];
const dateStamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Expenses() {
  const { expenses, addExpense, deleteExpense, settings } = useData();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportDate, setReportDate] = useState(dateStamp(new Date()));

  const dayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todaysExpenses = useMemo(
    () => expenses.filter((e) => e.createdAt && new Date(e.createdAt) >= dayStart),
    [expenses, dayStart]
  );
  const dayTotal = todaysExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // ======== Date-wise report ========
  const reportExpenses = useMemo(
    () => expenses
      .filter((e) => e.createdAt && new Date(e.createdAt).toLocaleDateString('en-CA') === reportDate)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
    [expenses, reportDate]
  );
  const reportTotal = reportExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCategory = useMemo(() => {
    const map = {};
    for (const e of reportExpenses) {
      const c = e.category || 'Other';
      map[c] = (map[c] || 0) + (Number(e.amount) || 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reportExpenses]);

  // Month-to-date total
  const monthTotal = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    return expenses.filter((e) => e.createdAt && new Date(e.createdAt) >= start)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!title.trim()) { alert('Enter an expense title.'); return; }
    if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
    setSaving(true);
    await addExpense({ title: title.trim(), category, amount: amt, note: note.trim() });
    setTitle(''); setAmount(''); setNote('');
    setSaving(false);
  };

  const printExpenseReport = (forDate = null, list = null, total = null) => {
    // Single continuous receipt-style printout: header + expense list + totals
    const useList = list || todaysExpenses;
    const useTotal = total !== null ? total : dayTotal;
    const rep = document.createElement('div');
    rep.id = 'printable-receipt';
    const rows = useList.map((e) =>
      '<div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:.3rem">' +
        '<span>' + (e.title || '—') + (e.category ? ' <span style="color:#888;font-size:.75rem">[' + e.category + ']</span>' : '') +
        '<span style="color:#888;font-size:.72rem;margin-left:.4rem">' + new Date(e.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '</span></span>' +
        '<span style="font-weight:600">₹' + (Number(e.amount) || 0) + '</span>' +
      '</div>'
    ).join('');
    const catRows = (forDate ? byCategory : []).map(([c, v]) =>
      '<div style="display:flex;justify-content:space-between;font-size:.8rem;color:#555"><span>' + c + '</span><span>₹' + v + '</span></div>'
    ).join('');
    rep.innerHTML =
      '<div style="text-align:center;margin-bottom:.6rem">' +
        '<h4 style="font-size:1.1rem;font-weight:700;margin:2px 0">' + (settings?.cafeName || 'La Casa') + '</h4>' +
        '<div style="font-size:.85rem;font-weight:700;letter-spacing:.5px">' + (forDate ? 'EXPENSES REPORT' : 'DAY EXPENSES REPORT') + '</div>' +
        '<div style="font-size:.75rem;color:#555">' + (forDate ? forDate : new Date().toLocaleString('en-IN')) + '</div>' +
      '</div>' +
      '<div style="border-top:1px dashed #999;margin-bottom:.4rem"></div>' +
      (rows || '<div style="font-size:.85rem;color:#555;margin-bottom:.5rem">No expenses recorded.</div>') +
      (forDate && catRows ? '<div style="border-top:1px dashed #999;margin:.4rem 0;padding-top:.35rem">' + catRows + '</div>' : '') +
      '<div style="display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;border-top:1px solid #111;padding-top:.5rem">' +
        '<span>TOTAL EXPENSES</span><span>₹' + useTotal + '</span>' +
      '</div>' +
      '<div style="font-size:.75rem;color:#555;margin-top:.6rem">' + useList.length + ' expense(s) recorded</div>';
    const portal = document.createElement('div');
    portal.id = 'print-portal';
    portal.appendChild(rep);
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
          <h2 className="admin-page-title">Daily Expenses</h2>
          <p className="admin-page-sub">Record café expenses as they happen — printed with the Day-Close (Z) report.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={printExpenseReport}>
          <Printer size={16} /> Print Day Expenses
        </button>
      </div>

      {/* Add expense */}
      <form
        className="card"
        style={{ padding: '1.25rem', display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.5rem' }}
        onSubmit={handleAdd}
      >
        <div style={{ flex: '2 1 180px', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Title *</label>
          <input
            type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Milk supply / Napkins / Petrol"
            style={{ padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          />
        </div>
        <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Category</label>
          <select
            value={category} onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: 600 }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Amount ₹ *</label>
          <input
            type="number" required min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            style={{ padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          />
        </div>
        <div style={{ flex: '2 1 160px', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Note (optional)</label>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Any detail…"
            style={{ padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Plus size={16} /> {saving ? 'Adding…' : 'Add Expense'}
        </button>
      </form>

      {/* Today's running total */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-label"><IndianRupee size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Today's Total</div>
          <span className="kpi-value">₹{dayTotal.toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entries Today</div>
          <span className="kpi-value">{todaysExpenses.length}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">This Month</div>
          <span className="kpi-value">₹{monthTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* ===== Date-wise REPORT section ===== */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <FileBarChart size={17} /> Expense Report
          </h3>
          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={reportDate}
              max={dateStamp(new Date())}
              onChange={(e) => setReportDate(e.target.value)}
              style={{ padding: '.4rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: 600 }}
            />
            <button className="btn btn-outline btn-sm" onClick={() => printExpenseReport(reportDate, reportExpenses, reportTotal)}>
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* List for the selected date */}
          <div style={{ flex: '2 1 320px' }}>
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>Title</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
              </thead>
              <tbody>
                {reportExpenses.length ? reportExpenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '.8rem' }}>{new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 600 }}>{e.title}{e.note ? <span style={{ color: 'var(--color-text-muted)', fontSize: '.75rem' }}> · {e.note}</span> : ''}</td>
                    <td><span className="badge badge-warning">{e.category || 'Other'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{Number(e.amount) || 0}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>No expenses on {reportDate}.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary for the selected date */}
          <div style={{ flex: '1 1 180px', borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem', minWidth: '170px' }}>
            <p style={{ fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--color-text-muted)', marginBottom: '.5rem' }}>
              Category split
            </p>
            {byCategory.length ? byCategory.map(([c, v]) => (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
                <span>{c}</span><b>₹{v.toLocaleString()}</b>
              </div>
            )) : <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>—</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid var(--color-border)', marginTop: '.6rem', paddingTop: '.5rem' }}>
              <span>Total</span><span style={{ color: 'var(--color-danger)' }}>₹{reportTotal.toLocaleString()}</span>
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--color-text-muted)', marginTop: '.4rem' }}>{reportExpenses.length} entries on {reportDate}</p>
          </div>
        </div>
      </div>

      {/* Expense list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Note</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {todaysExpenses.length ? todaysExpenses.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.title}</td>
                <td><span className="badge badge-warning">{e.category || 'Other'}</span></td>
                <td style={{ fontWeight: 700 }}>₹{Number(e.amount) || 0}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>{e.note || '—'}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>
                  {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <button
                    className="action-icon-btn"
                    title="Delete expense"
                    onClick={() => { if (window.confirm(`Delete "${e.title}" (₹${e.amount})?`)) deleteExpense(e.id); }}
                  >
                    <Trash2 size={16} color="var(--color-danger)" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No expenses recorded today yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}