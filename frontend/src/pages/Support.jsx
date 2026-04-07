import React, { useState } from 'react';
import './Support.css';

const FAQS = [
  { q: 'How quickly will I receive my accounts?', a: 'Orders are processed automatically. After your order is confirmed, you will receive your accounts immediately through the platform.' },
  { q: 'Are 2FA codes included?', a: 'Yes! All our Gmail accounts include 2FA backup codes. Details vary by product — check the product description before purchasing.' },
  { q: 'What if an account doesn\'t work?', a: 'We test all accounts before listing them. If you encounter an issue, contact our support team within 24 hours of purchase for a replacement or refund.' },
  { q: 'What payment methods do you accept?', a: 'We accept cryptocurrency (Bitcoin, USDT, ETH) and other digital payment methods. Details are provided at checkout.' },
  { q: 'Can I buy in bulk?', a: 'Absolutely! Our stock is available for bulk purchases. Use the quantity picker on each product. For very large orders, contact us directly.' },
  { q: 'Are the accounts registered to real IP addresses?', a: 'Yes, all accounts are registered using IP addresses from real countries, not datacenter IPs, making them high-quality and realistic.' }
];

export default function Support() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    // In production, wire this to an API endpoint
    setSent(true);
  };

  return (
    <div className="support-page">
      <div className="container">
        <div className="page-header">
          <h1>Support Center</h1>
          <p>We're here to help — browse our FAQ or send us a message</p>
        </div>

        <div className="support-grid">
          {/* FAQ */}
          <section className="faq-section card">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {FAQS.map((item, i) => (
                <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                  <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {item.q}
                    <svg className="faq-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="faq-answer">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Contact form */}
          <section className="contact-section">
            {/* Telegram direct contact card */}
            <div className="card telegram-card">
              <div className="telegram-card-inner">
                <div className="telegram-icon-wrap">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div className="telegram-card-text">
                  <h3>Chat on Telegram</h3>
                  <p>Get instant help directly from us — fastest response.</p>
                </div>
                <a
                  href="https://t.me/sharifhasaan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-rounded"
                >
                  Open Chat →
                </a>
              </div>
            </div>

            {/* Direct contact info */}
            <div className="card contact-info-card">
              <h3>📬 Direct Contact</h3>
              <div className="contact-info-list">
                <a href="mailto:adminglobalemailhub@gmail.com" className="contact-info-item">
                  <span className="contact-info-icon">📧</span>
                  <div>
                    <strong>Email</strong>
                    <span>adminglobalemailhub@gmail.com</span>
                  </div>
                </a>
                <a href="tel:+8801733942373" className="contact-info-item">
                  <span className="contact-info-icon">📞</span>
                  <div>
                    <strong>Phone / WhatsApp</strong>
                    <span>+8801733942373</span>
                  </div>
                </a>
                <a href="https://t.me/sharifhasaan" target="_blank" rel="noopener noreferrer" className="contact-info-item">
                  <span className="contact-info-icon">💬</span>
                  <div>
                    <strong>Telegram</strong>
                    <span>@sharifhasaan</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="card contact-card">
              <h2>Send Us a Message</h2>
              <p className="contact-sub">We usually reply within a few hours.</p>

              {sent ? (
                <div className="alert alert-success" style={{ marginTop: 16 }}>
                  ✓ Message sent! We'll get back to you shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Your Name</label>
                    <input type="text" name="name" className="form-input" placeholder="John Doe" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select name="subject" className="form-select" value={form.subject} onChange={handleChange} required>
                      <option value="">Select a subject…</option>
                      <option value="order">Order Issue</option>
                      <option value="account">Account Problem</option>
                      <option value="refund">Refund Request</option>
                      <option value="bulk">Bulk Purchase Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea name="message" className="form-textarea" placeholder="Describe your issue in detail…" value={form.message} onChange={handleChange} required rows={5} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full btn-rounded">
                    Send Message →
                  </button>
                </form>
              )}
            </div>

            {/* Quick links */}
            <div className="card quick-links-card">
              <h3>Quick Links</h3>
              <div className="quick-links">
                <a href="#tos" className="quick-link">📄 Terms of Service</a>
                <a href="#privacy" className="quick-link">🔒 Privacy Policy</a>
                <a href="#refund" className="quick-link">💰 Refund Policy</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
