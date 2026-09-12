import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, FileText, Check, CheckCircle, BellRing } from 'lucide-react';
import { useData } from '../context/DataContext';
import './Customer.css';

export default function CustomerTracking() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '1';
  const navigate = useNavigate();

  // Pull settings to display the dynamic Cafe Name
  const { orders = [], requestBill = () => { }, bills = [], settings } = useData() || {};

  const order = orders.find(o => o.id === orderId);
  const [billRequested, setBillRequested] = useState(false);

  useEffect(() => {
    if (bills && Array.isArray(bills)) {
      if (bills.some(b => b.orderId === orderId || String(b.tableId).replace(/\D/g, '') === String(tableNumber).replace(/\D/g, ''))) {
        setBillRequested(true);
      }
    }
  }, [bills, orderId, tableNumber]);

  if (!order) {
    return (
      <div className="tracking-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Order Not Found</h2>
        <button className="btn btn-primary" onClick={() => navigate(`/order?table=${tableNumber}`)}>Return to Menu</button>
      </div>
    );
  }

  const statusMap = { NEW: 0, PREPARING: 1, READY: 2, SERVED: 3 };
  const currentStep = statusMap[order?.status] ?? 0;

  const steps = [
    { label: 'Order Received', desc: 'Waiting for café to accept' },
    { label: 'Preparing', desc: 'Chef is preparing your order' },
    { label: 'Ready', desc: 'Your order is ready to be served' },
    { label: 'Served', desc: 'Enjoy your meal! ✨' },
  ];

  const handleBillRequest = () => {
    requestBill(tableNumber);
    setBillRequested(true);
  };

  const renderStatusHeader = () => {
    const status = order?.status;
    if (status === 'NEW') {
      return (
        <div className="status-header-content animate-fade-in">
          <div className="status-anim-wrapper animate-pulse">
            <Clock size={36} color="var(--color-accent)" />
          </div>
          <h2 className="success-title">Order Sent</h2>
          <p className="success-sub">Waiting for the kitchen to accept your order.</p>
        </div>
      );
    }
    if (status === 'PREPARING') {
      return (
        <div className="status-header-content animate-fade-in">
          <div className="status-anim-wrapper">
            <div className="steam-container">
              <div className="steam-smoke"></div>
              <div className="steam-smoke"></div>
              <div className="steam-smoke"></div>
              <div className="steam-cup"></div>
            </div>
          </div>
          <h2 className="success-title">Food is Preparing</h2>
          <p className="success-sub">Our chef is crafting your order with care.</p>
        </div>
      );
    }
    if (status === 'READY') {
      return (
        <div className="status-header-content animate-fade-in">
          <div className="status-anim-wrapper animate-bounce-it" style={{ background: 'rgba(197,138,58,0.15)', borderColor: 'var(--color-warning)' }}>
            <BellRing size={36} color="var(--color-warning)" />
          </div>
          <h2 className="success-title">Order is Ready!</h2>
          <p className="success-sub">Your food is fresh and on its way to your table.</p>
        </div>
      );
    }
    return (
      <div className="status-header-content animate-fade-in">
        <div className="status-anim-wrapper success animate-scale-up">
          <CheckCircle size={36} color="var(--color-success)" />
        </div>
        <h2 className="success-title">Served & Enjoy!</h2>

        {/* Dynamic Cafe Name injected here */}
        <p className="success-sub">Have a wonderful time at {settings?.cafeName || 'Afterhours POS'}. ✨</p>
      </div>
    );
  };

  return (
    <div className="tracking-page">
      <header className="tracking-header">
        <button className="back-btn" onClick={() => navigate(`/order?table=${tableNumber}`)}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="tracking-title">Order #{order?.id}</div>
          <div className="tracking-subtitle">Table {String(tableNumber).padStart(2, '0')}</div>
        </div>
      </header>

      <div className="tracking-body">
        <div className="success-wrap">
          {renderStatusHeader()}
          <div className="eta-pill" style={{ marginTop: '1.5rem' }}>
            <Clock size={16} className="eta-icon" />
            <span>Est. Time: 15–20 min</span>
          </div>
        </div>

        <div className="timeline-section animate-slide-up" style={{ animationDelay: '.1s' }}>
          <p className="section-label">Live Status</p>
          <div className="timeline">
            {steps.map((s, i) => {
              const isDone = currentStep > i;
              const isActive = currentStep === i;
              return (
                <div key={s.label} className={`tl-item ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="tl-dot"></div>
                  <div className="tl-title">{s.label}</div>
                  {(isDone || isActive) && <div className="tl-desc">{s.desc}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="order-summary animate-slide-up" style={{ animationDelay: '.2s' }}>
          <p className="section-label">Order Summary</p>
          {Array.isArray(order?.items) && order.items.map((item, idx) => (
            <div key={idx} className="summary-item">
              <div>
                <div className="summary-item-name">{item?.quantity} × {item?.name}</div>
                {item?.customizationString && <div className="summary-item-custom">{item.customizationString}</div>}
              </div>
              <div className="summary-item-price">₹{item?.calculatedPrice}</div>
            </div>
          ))}

          {/* ----- SUBTOTAL ----- */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: 'var(--color-text-secondary)' }}>
              <span>Subtotal</span>
              <span>₹{order?.subtotal || 0}</span>
            </div>
          </div>

          <div className="summary-total" style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1.5px solid var(--color-border)' }}>
            <span>Total Paid</span>
            <span>₹{order?.total}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="tracking-bottom-bar">
        {!billRequested && (
          <button className="btn btn-outline flex-1" style={{ flex: 1 }} onClick={() => navigate(`/order?table=${tableNumber}`)}>
            Order More
          </button>
        )}
        {billRequested ? (
          <div className="btn-bill-requested" style={{ width: '100%' }}>
            <Check size={18} /> Bill Requested (Ordering Locked)
          </div>
        ) : (
          <button className="btn btn-primary flex-1" style={{ flex: 1 }} onClick={handleBillRequest}>
            <FileText size={18} /> Request Bill
          </button>
        )}
      </div>
    </div>
  );
}