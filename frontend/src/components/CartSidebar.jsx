import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './CartSidebar.css';

export default function CartSidebar() {
  const { cartItems, isOpen, setIsOpen, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay" onClick={() => setIsOpen(false)} />
      <aside className="cart-sidebar">
        <div className="cart-header">
          <h2>Shopping Cart {cartItems.length > 0 && <span className="cart-count">{cartItems.length}</span>}</h2>
          <button className="cart-close" onClick={() => setIsOpen(false)} aria-label="Close cart">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <p>Your cart is empty</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setIsOpen(false); navigate('/products'); }}>
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item._id} className="cart-item">
                  <div className="cart-item-icon">
                    <ProviderIcon provider={item.provider || item.category} />
                  </div>
                  <div className="cart-item-info">
                    <p className="cart-item-title">{item.title}</p>
                    <span className="cart-item-price">${item.price.toFixed(3)}/pc</span>
                  </div>
                  <div className="cart-item-qty">
                    <button className="qty-btn" onClick={() => updateQuantity(item._id, item.quantity - 1)}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item._id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                  </div>
                  <div className="cart-item-subtotal">${(item.price * item.quantity).toFixed(2)}</div>
                  <button className="cart-item-remove" onClick={() => removeFromCart(item._id)} aria-label="Remove item">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              <button className="btn btn-primary btn-full btn-rounded" onClick={handleCheckout}>
                Proceed to Checkout →
              </button>
              <button className="btn btn-secondary btn-sm" onClick={clearCart} style={{ marginTop: 8, width: '100%' }}>
                Clear Cart
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function ProviderIcon({ provider }) {
  const p = (provider || '').toLowerCase();
  if (p.includes('gmail')) return <span className="picon picon-gmail">G</span>;
  if (p.includes('outlook') || p.includes('hotmail')) return <span className="picon picon-outlook">O</span>;
  if (p.includes('yahoo')) return <span className="picon picon-yahoo">Y</span>;
  return <span className="picon picon-default">@</span>;
}
