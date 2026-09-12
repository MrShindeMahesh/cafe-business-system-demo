import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import ProductModal from '../components/customer/ProductModal';
import CartDrawer from '../components/customer/CartDrawer';
import FloatingCart from '../components/customer/FloatingCart';
import './Customer.css';

export default function CustomerMenu() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '1';
  const { menu } = useData();

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const categories = ['All', ...new Set(menu.map(item => item.category))];

  const filteredMenu = menu.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && (item.available !== false);
  });

  const addToCart = (item, quantity = 1, customizations = { variants: {}, addons: {}, instructions: '' }, calculatedPrice = item.price) => {
    setCart(prev => [...prev, {
      ...item,
      cartItemId: Math.random().toString(36).substr(2, 9),
      quantity, customizations, calculatedPrice
    }]);
    setSelectedProduct(null);
  };

  const removeFromCart = (cartItemId) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  const cartTotal = cart.reduce((sum, item) => sum + item.calculatedPrice, 0);

  const handleCardClick = (item) => {
    setSelectedProduct(item);
  };

  return (
    <div className="customer-app" style={{ minHeight: '100vh', paddingBottom: '5rem', background: '#fdfbf7' }}>
      {/* Hero */}
      <header className="customer-hero animate-fade-in">
        <h1>Good Coffee.<br />Great Food.<br />Good Moments.</h1>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '.875rem', marginTop: '.5rem' }}>
          Freshly prepared, just for you.
        </p>
        <div className="table-badge">
          <span className="table-dot"></span>
          TABLE {String(tableNumber).padStart(2, '0')} · OPEN
        </div>
      </header>

      {/* Search + Categories */}
      <div className="sticky-nav" style={{ background: '#fdfbf7', padding: '1rem 2rem', borderBottom: '1px solid #eae5dc', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="input-with-icon" style={{ marginBottom: '.75rem', position: 'relative' }}>
          <span className="input-icon" style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }}><Search size={16} /></span>
          <input
            type="search"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '10px', border: '1px solid #dcd5cc', outline: 'none', background: '#ffffff' }}
          />
        </div>
        <div className="category-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'category-pill-active' : 'category-pill-inactive'}`}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeCategory === cat ? '#1c1917' : '#f0ece1',
                color: activeCategory === cat ? '#fff' : '#57534e',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <main style={{ padding: '2rem' }}>
        <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
          {Array.isArray(filteredMenu) && filteredMenu.length > 0 ? (
            filteredMenu.map(item => (
              <div 
                key={item.id} 
                className="menu-card" 
                onClick={() => handleCardClick(item)}
                style={{ background: '#ffffff', borderRadius: '14px', overflow: 'hidden', border: '1px solid #eae5dc', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s' }}
              >
                <div style={{ position: 'relative', height: '160px', width: '100%', background: '#f3f4f6' }}>
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1c1917', margin: '0 0 4px 0' }}>{item.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#78716c', margin: '0 0 1rem 0', lineHeight: '1.3', flexGrow: 1 }}>{item.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f5f2eb' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1c1917' }}>₹{item.price}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCardClick(item); }}
                      style={{ background: '#1c1917', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Add +
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#78716c' }}>
              No menu items found.
            </div>
          )}
        </div>
      </main>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
      )}
      {cart.length > 0 && (
        <FloatingCart itemCount={cart.length} total={cartTotal} onClick={() => setIsCartOpen(true)} />
      )}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        removeFromCart={removeFromCart}
        tableNumber={tableNumber}
        onClearCart={() => setCart([])}
      />
    </div>
  );
}