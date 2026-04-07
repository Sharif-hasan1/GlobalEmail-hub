import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#2563EB" />
              <path d="M6 9.5L14 15.5L22 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="9" width="16" height="12" rx="2" stroke="white" strokeWidth="2" fill="none" />
            </svg>
            <strong>GlobalEmail Hub</strong>
          </span>
          <p>Your trusted source for temporary and aged email accounts. Fast delivery, verified stock.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Marketplace</h4>
            <Link to="/">Home</Link>
            <Link to="/products">Browse Products</Link>
            <Link to="/orders">My Orders</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/support">Contact Us</Link>
            <Link to="/support">FAQ</Link>
            <a href="https://t.me/sharifhasaan" target="_blank" rel="noopener noreferrer">
              💬 Telegram Chat
            </a>
            <a href="mailto:adminglobalemailhub@gmail.com">📧 adminglobalemailhub@gmail.com</a>
            <a href="tel:+8801733942373">📞 +8801733942373</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/refund">Refund Policy</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <span>© {new Date().getFullYear()} GlobalEmail Hub. All rights reserved.</span>
          <div className="footer-bottom-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refunds</Link>
            <Link to="/support">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
