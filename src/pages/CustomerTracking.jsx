import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, FileText, Check, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import './Customer.css';

export default function CustomerTracking() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '1';
  const navigate = useNavigate();
  const { orders, requestBill, bills } = useData();

  const order = orders.find(o => o.id === orderId);
  const [billRequested, setBillRequested] = useState(false);

  useEffect(() => {
    if (bills.some(b => b.orderId === orderId || b.tableId === tableNumber)) setBillRequested(true);
  }, [bills, orderId, tableNumber]);

  if (!order) return (
    <div className="tracking-page" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', textAlign:'center', padding:'2rem' }}>
      <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.75rem', color:'var(--color-primary)', marginBottom:'1rem' }}>Order Not Found</h2>
      <button className="btn btn-primary" onClick={() => navigate(`/order?table=${tableNumber}`)}>Return to Menu</button>
    </div>
  );

  const statusMap = { NEW:0, PREPARING:1, READY:2, SERVED:3 };
  const currentStep = statusMap[order.status] ?? 0;

  const steps = [
    { label:'Order Received', desc:'Waiting for café to accept' },
    { label:'Preparing',      desc:'Chef is preparing your order' },
    { label:'Ready',          desc:'Your order is ready to be served' },
    { label:'Served',         desc:'Enjoy your meal! 🍽️' },
  ];

  const handleBillRequest = () => { requestBill(tableNumber); setBillRequested(true); };

  return (
    <div className="tracking-page">
      <header className="tracking-header">
        <button className="back-btn" onClick={() => navigate(`/order?table=${tableNumber}`)}>
          <ChevronLeft size={20}/>
        </button>
        <div>
          <div className="tracking-title">Order #{order.id}</div>
          <div className="tracking-subtitle">Table {tableNumber.padStart(2,'0')}</div>
        </div>
      </header>

      <div className="tracking-body">
        {/* Success */}
        <div className="success-wrap animate-scale-up">
          <div className="success-icon"><CheckCircle size={40}/></div>
          <h2 className="success-title">Order Confirmed</h2>
          <p className="success-sub">Your order has been sent to our kitchen.</p>
          <div className="eta-pill">
            <Clock size={16} className="eta-icon"/>
            <span>Est. Time: 15–20 min</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline-section animate-slide-up" style={{ animationDelay:'.1s' }}>
          <p className="section-label">Live Status</p>
          <div className="timeline">
            {steps.map((s, i) => {
              const isDone   = currentStep > i;
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

        {/* Order Summary */}
        <div className="order-summary animate-slide-up" style={{ animationDelay:'.2s' }}>
          <p className="section-label">Order Summary</p>
          {order.items.map((item, idx) => (
            <div key={idx} className="summary-item">
              <div>
                <div className="summary-item-name">{item.quantity} × {item.name}</div>
                {item.customizationString && <div className="summary-item-custom">{item.customizationString}</div>}
              </div>
              <div className="summary-item-price">₹{item.calculatedPrice}</div>
            </div>
          ))}
          <div className="summary-total">
            <span>Total Paid</span>
            <span>₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="tracking-bottom-bar">
        <button className="btn btn-outline flex-1" style={{ flex:1 }} onClick={() => navigate(`/order?table=${tableNumber}`)}>
          Order More
        </button>
        {billRequested ? (
          <div className="btn-bill-requested">
            <Check size={18}/> Bill Requested
          </div>
        ) : (
          <button className="btn btn-primary flex-1" style={{ flex:1 }} onClick={handleBillRequest}>
            <FileText size={18}/> Request Bill
          </button>
        )}
      </div>
    </div>
  );
}
