import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Minus } from 'lucide-react';
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
  const [activeAddId, setActiveAddId] = useState(null);

  const categories = ['All', ...new Set(menu.map(item => item.category))];
  const filteredMenu = menu.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && item.available;
  });

  const addToCart = (item, quantity, customizations, calculatedPrice) => {
    setCart(prev => [...prev, {
      ...item,
      cartItemId: Math.random().toString(36).substr(2, 9),
      quantity, customizations, calculatedPrice
    }]);
    setSelectedProduct(null);
  };

  const removeFromCart = (cartItemId) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  const cartTotal = cart.reduce((sum, item) => sum + item.calculatedPrice, 0);

  const handleQuickAdd = (e, item) => {
    e.stopPropagation();
    if ((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0)) {
      setSelectedProduct(item); return;
    }
    setActiveAddId(item.id);
    addToCart(item, 1, { variants: {}, addons: {}, instructions: '' }, item.price);
    setTimeout(() => setActiveAddId(null), 2500);
  };

  return (
    <div className="customer-app">
      {/* Hero */}
      <header className="customer-hero animate-fade-in">
        <h1>Good Coffee.<br/>Great Food.<br/>Good Moments.</h1>
        <p style={{ color:'rgba(255,255,255,0.78)', fontSize:'.875rem', marginTop:'.5rem' }}>
          Freshly prepared, just for you.
        </p>
        <div className="table-badge">
          <span className="table-dot"></span>
          TABLE {tableNumber.padStart(2, '0')} · OPEN
        </div>
      </header>

      {/* Search + Categories */}
      <div className="sticky-nav">
        <div className="input-with-icon" style={{ marginBottom:'.75rem' }}>
          <span className="input-icon"><Search size={16}/></span>
          <input
            type="search"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'category-pill-active' : 'category-pill-inactive'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <main>
        <div className="menu-grid">
          {filteredMenu.map((item, index) => {
            const itemCount = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.quantity, 0);
            const showQty = activeAddId === item.id || itemCount > 0;
            return (
              <div
                key={item.id}
                className="menu-card animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedProduct(item)}
              >
                <div className="menu-info">
                  <div>
                    <div className="menu-name">{item.name}</div>
                    <div className="menu-desc">{item.description}</div>
                  </div>
                  <div className="menu-price">₹{item.price}</div>
                </div>
                <div className="menu-image-wrap">
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <div className="qty-control-zone" onClick={e => e.stopPropagation()}>
                    {showQty ? (
                      <div className="qty-pill">
                        <button className="qty-btn" onClick={e => {
                          e.stopPropagation();
                          const last = [...cart].reverse().find(c => c.id === item.id);
                          if (last) removeFromCart(last.cartItemId);
                          if (itemCount <= 1) setActiveAddId(null);
                        }}>
                          <Minus size={14} strokeWidth={3}/>
                        </button>
                        <span className="qty-value">{itemCount || 1}</span>
                        <button className="qty-btn" onClick={e => {
                          e.stopPropagation();
                          addToCart(item, 1, { variants:{}, addons:{}, instructions:'' }, item.price);
                          setActiveAddId(item.id);
                        }}>
                          <Plus size={14} strokeWidth={3}/>
                        </button>
                      </div>
                    ) : (
                      <button className="add-btn" onClick={e => handleQuickAdd(e, item)}>
                        <Plus size={20}/>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart}/>
      )}
      {cart.length > 0 && (
        <FloatingCart itemCount={cart.length} total={cartTotal} onClick={() => setIsCartOpen(true)}/>
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
