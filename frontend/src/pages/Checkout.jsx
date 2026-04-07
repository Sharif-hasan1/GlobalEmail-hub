import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Checkout.css';

const USDT_ADDRESS = 'TEusaJ3Ydiqyp89XVbQBBYZJysNzFRhWo1';
const BINANCE_PAY_ID = '428253228';

export default function Checkout() {
  const { cartItems, total, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [txId, setTxId] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/checkout');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && user && cartItems.length === 0 && !success) {
      navigate('/products');
    }
  }, [authLoading, user, cartItems.length, success, navigate]);

  if (authLoading) return null;
  if (!user) return null;
  if (cartItems.length === 0 && !success) return null;

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const isTxValid = () => {
    const t = txId.trim();
    if (!t) return false;
    if (paymentMethod === 'usdt_trc20') return /^[a-fA-F0-9]{10,}$/.test(t);
    if (paymentMethod === 'binance_pay') return t.length >= 8;
    return false;
  };

  const handlePlaceOrder = async () => {
    setError('');
    if (!paymentMethod) { setError('Please select a payment method'); return; }
    if (paymentMethod === 'usdt_trc20' && !/^[a-fA-F0-9]{10,}$/.test(txId.trim())) {
      setError('Please enter a valid TRC20 transaction hash (hex characters only, at least 10 characters)'); return;
    }
    if (paymentMethod === 'binance_pay' && txId.trim().length < 8) {
      setError('Please enter a valid Binance Pay reference (at least 8 characters)'); return;
    }
    setLoading(true);
    try {
      const items = cartItems.map(item => ({ productId: item._id, quantity: item.quantity }));
      const res = await axios.post('/api/orders', { items, paymentMethod, paymentTxId: txId.trim() });
      clearCart();
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Order failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="checkout-success card">
            <div className="success-icon">✅</div>
            <h2>Order Placed Successfully!</h2>
            <p>Your order <strong>#{success._id.slice(-8).toUpperCase()}</strong> has been received.</p>
            <p style={{marginTop:8, fontSize:13, color:'var(--text-secondary)'}}>We will verify your payment and process your order shortly.</p>
            <div className="success-total">
              Total: <strong>${success.total.toFixed(2)}</strong>
            </div>
            <div className="success-actions">
              <button className="btn btn-primary btn-rounded" onClick={() => navigate('/orders')}>View My Orders →</button>
              <button className="btn btn-secondary btn-rounded" onClick={() => navigate('/products')}>Continue Shopping</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="page-header">
          <h1>Checkout</h1>
          <p>Review your order, send payment, and confirm</p>
        </div>

        <div className="checkout-grid">
          {/* Order summary */}
          <div>
            <div className="card checkout-summary">
              <h2>Order Summary</h2>
              <div className="co-items">
                {cartItems.map(item => (
                  <div key={item._id} className="co-item">
                    <div className="co-item-info">
                      <strong>{item.title}</strong>
                      <span>× {item.quantity} pc{item.quantity !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="co-item-price">
                      ${(item.price * item.quantity).toFixed(2)}
                      <small>${item.price.toFixed(3)}/pc</small>
                    </div>
                  </div>
                ))}
              </div>
              <hr className="divider" />
              <div className="co-total">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>

            {/* Buyer info */}
            <div className="card checkout-payment" style={{marginTop: 16}}>
              <h3 style={{fontSize:15, fontWeight:700, marginBottom:12}}>Account</h3>
              <div className="buyer-info">
                <div className="buyer-row">
                  <span>Username</span>
                  <strong>{user.username}</strong>
                </div>
                <div className="buyer-row">
                  <span>Email</span>
                  <strong>{user.email}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <div className="card checkout-payment">
              <h2>💳 Payment</h2>

              {/* Step 1: Choose method */}
              <div className="pay-step">
                <div className="pay-step-num">1</div>
                <div className="pay-step-text">Choose payment method</div>
              </div>

              <div className="pay-methods">
                <button
                  className={`pay-method${paymentMethod === 'usdt_trc20' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('usdt_trc20')}
                >
                  <span className="pay-method-icon">💎</span>
                  <div>
                    <strong>USDT (TRC20)</strong>
                    <small>Tron network • Low fees</small>
                  </div>
                </button>
                <button
                  className={`pay-method${paymentMethod === 'binance_pay' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('binance_pay')}
                >
                  <span className="pay-method-icon">🟡</span>
                  <div>
                    <strong>Binance Pay</strong>
                    <small>Instant • Zero fees</small>
                  </div>
                </button>
              </div>

              {/* Step 2: Send payment */}
              {paymentMethod && (
                <>
                  <div className="pay-step">
                    <div className="pay-step-num">2</div>
                    <div className="pay-step-text">
                      Send <strong>${total.toFixed(2)} USDT</strong> to the address below
                    </div>
                  </div>

                  {paymentMethod === 'usdt_trc20' && (
                    <div className="pay-address-box">
                      <div className="pay-address-label">
                        <span className="pay-net-badge">TRC20</span>
                        USDT Wallet Address
                      </div>
                      <div className="pay-qr-wrapper">
                        <QRCodeSVG
                          value={USDT_ADDRESS}
                          size={180}
                          level="H"
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                        <span className="pay-qr-caption">Scan to get address</span>
                      </div>
                      <div className="pay-address-row">
                        <code className="pay-address">{USDT_ADDRESS}</code>
                        <button
                          className="pay-copy-btn"
                          onClick={() => copyText(USDT_ADDRESS, 'usdt')}
                        >
                          {copied === 'usdt' ? '✅ Copied!' : '📋 Copy'}
                        </button>
                      </div>
                      <div className="pay-warning">
                        ⚠️ Only send <strong>USDT</strong> on the <strong>TRC20 (Tron)</strong> network. Sending other tokens or using a different network will result in permanent loss.
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'binance_pay' && (
                    <div className="pay-address-box">
                      <div className="pay-address-label">
                        <span className="pay-net-badge binance">Binance</span>
                        Binance Pay ID
                      </div>
                      <div className="pay-qr-wrapper">
                        <QRCodeSVG
                          value={`https://app.binance.com/qr/${BINANCE_PAY_ID}`}
                          size={180}
                          level="H"
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          imageSettings={{
                            src: 'https://public.bnbstatic.com/static/images/common/favicon.ico',
                            height: 24,
                            width: 24,
                            excavate: true,
                          }}
                        />
                        <span className="pay-qr-caption">Scan with Binance App to pay</span>
                      </div>
                      <div className="pay-address-row">
                        <code className="pay-address">{BINANCE_PAY_ID}</code>
                        <button
                          className="pay-copy-btn"
                          onClick={() => copyText(BINANCE_PAY_ID, 'binance')}
                        >
                          {copied === 'binance' ? '✅ Copied!' : '📋 Copy'}
                        </button>
                      </div>
                      <div className="pay-instructions">
                        <strong>How to pay:</strong>
                        <ol>
                          <li>Open Binance App → Scan the QR code above, or go to Pay → Send</li>
                          <li>Enter Pay ID: <strong>{BINANCE_PAY_ID}</strong></li>
                          <li>Send exactly <strong>${total.toFixed(2)} USDT</strong></li>
                          <li>Copy the transaction reference below</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Enter TX ID */}
                  <div className="pay-step">
                    <div className="pay-step-num">3</div>
                    <div className="pay-step-text">Enter transaction ID / reference</div>
                  </div>

                  <div className="pay-tx-input">
                    <input
                      type="text"
                      placeholder={paymentMethod === 'usdt_trc20' ? 'Paste TRC20 transaction hash…' : 'Paste Binance Pay reference…'}
                      value={txId}
                      onChange={e => setTxId(e.target.value)}
                      className="form-input"
                    />
                    <small className="pay-tx-hint">You can find this in your wallet's transaction history</small>
                  </div>

                  {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

                  <button
                    className="btn btn-primary btn-full btn-lg btn-rounded"
                    onClick={handlePlaceOrder}
                    disabled={loading || !isTxValid()}
                    style={{ marginTop: 20 }}
                  >
                    {loading ? <><span className="spinner spinner-sm" /> Confirming order…</> : `✅ I've Paid — Place Order ($${total.toFixed(2)})`}
                  </button>
                </>
              )}

              {!paymentMethod && (
                <div className="pay-select-hint">
                  👆 Select a payment method to continue
                </div>
              )}

              <button className="btn btn-secondary btn-full btn-rounded" onClick={() => navigate('/products')} style={{ marginTop: 10 }}>
                ← Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
