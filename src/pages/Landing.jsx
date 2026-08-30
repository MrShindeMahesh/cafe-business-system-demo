import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ChefHat, BellRing, Coffee, ArrowRight } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  const steps = [
    { icon: <Smartphone size={28} />, step: '01', title: 'Scan', desc: 'Customer scans the elegant QR code placed on their table.' },
    { icon: <Coffee size={28} />, step: '02', title: 'Order', desc: 'They browse the beautifully designed digital menu and place their order.' },
    { icon: <BellRing size={28} />, step: '03', title: 'Receive', desc: 'The café instantly receives the order on the live dashboard.' },
    { icon: <ChefHat size={28} />, step: '04', title: 'Serve', desc: 'Staff prepares and serves the order — no confusion, no delays.' },
  ];

  return (
    <div className="landing-page">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon"><Coffee size={20} /></div>
          <span className="landing-logo-text">Brew & Bite</span>
        </div>
        <button className="landing-nav-btn" onClick={() => navigate('/admin')}>
          Café Login
        </button>
      </nav>

      {/* Hero */}
      <section className="hero animate-fade-in">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-heading">
            Turn Every Table Into a<br />
            <span className="hero-heading-accent">Smart Ordering System</span>
          </h1>
          <p className="hero-subtitle">
            Customers scan. Orders arrive. Your staff serves. No waiting. No confusion.
          </p>
          <div className="hero-cta-group">
            <button className="btn-hero-primary" onClick={() => navigate('/order?table=7')}>
              Try Customer Demo <ArrowRight size={18} />
            </button>
            <button className="btn-hero-outline" onClick={() => navigate('/admin')}>
              Open Café Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-it-works-section">
        <div className="container">
          <h2 className="font-heading text-center text-primary" style={{ fontSize: '2rem', fontWeight: 700 }}>
            How It Works
          </h2>
          <div className="hiw-grid">
            {steps.map((s, i) => (
              <div className="hiw-card animate-slide-up" key={s.step} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="hiw-icon">{s.icon}</div>
                <p className="hiw-step">{s.step}</p>
                <h3 className="hiw-title">{s.title}</h3>
                <p className="hiw-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="landing-footer">
        <h2>One QR Code. A Smarter Café.</h2>
        <p className="powered-by">Powered by AFTERHOURS - COMPLETE BUSIENSS SYSTEM </p>
      </section>
    </div>
  );
}
