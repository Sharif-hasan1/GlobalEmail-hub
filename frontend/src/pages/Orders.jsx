import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Orders.css';

const STATUS_BADGE = {
  pending: 'badge-yellow',
  processing: 'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-red'
};

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [emails, setEmails] = useState({}); // { orderId: [...emails] }
  const [emailLoading, setEmailLoading] = useState({});
  const [copiedId, setCopiedId] = useState('');
  const [files, setFiles] = useState({}); // { orderId: [...files] }
  const [filesLoading, setFilesLoading] = useState({});
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login?redirect=/orders'); return; }
    if (user) {
      axios.get('/api/orders/my')
        .then(res => setOrders(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, navigate]);

  const loadEmails = async (orderId) => {
    if (emails[orderId]) return;
    setEmailLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await axios.get(`/api/orders/${orderId}/emails`);
      setEmails(prev => ({ ...prev, [orderId]: res.data }));
    } catch {}
    setEmailLoading(prev => ({ ...prev, [orderId]: false }));
  };

  const loadFiles = async (orderId) => {
    if (files[orderId]) return;
    setFilesLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await axios.get(`/api/orders/${orderId}/files`);
      setFiles(prev => ({ ...prev, [orderId]: res.data }));
    } catch {}
    setFilesLoading(prev => ({ ...prev, [orderId]: false }));
  };

  const downloadFile = async (orderId, file) => {
    setDownloading(file._id);
    try {
      const res = await axios.get(`/api/orders/${orderId}/files/${file._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
    setDownloading('');
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleExpand = (orderId, order) => {
    const newId = expandedId === orderId ? null : orderId;
    setExpandedId(newId);
    if (newId) {
      if (order.status === 'completed' && order.emailsDelivered > 0) loadEmails(orderId);
      loadFiles(orderId);
    }
  };

  const copyEmails = (orderId) => {
    const list = emails[orderId];
    if (!list) return;
    const text = list.map(e => `${e.email}\t${e.password}\t${e.recovery || ''}\t${e.appPassword || ''}\t${e.security || ''}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const downloadCSV = (orderId) => {
    const list = emails[orderId];
    if (!list || !list.length) return;
    const header = 'Username,Password,Recovery Mail,App Password,Security Key';
    const rows = list.map(e =>
      `"${e.email}","${e.password}","${e.recovery || ''}","${e.appPassword || ''}","${e.security || ''}"`
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${orderId.slice(-8).toUpperCase()}-credentials.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadXLSX = async (orderId) => {
    try {
      const res = await axios.get(`/api/orders/${orderId}/download-xlsx`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderId.slice(-8).toUpperCase()}-credentials.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  };

  if (authLoading || loading) {
    return <div className="page-loading"><div className="spinner" /></div>;
  }

  return (
    <div className="orders-page">
      <div className="container">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>View and track all your purchases</p>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state card" style={{ padding: 60 }}>
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Start shopping to see your orders here.</p>
            <Link to="/products" className="btn btn-primary btn-rounded" style={{ marginTop: 16 }}>
              Browse Products →
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card card">
                <div className="order-header" onClick={() => handleExpand(order._id, order)}>
                  <div className="order-id">
                    <span className="order-hash">#</span>
                    <span>{order._id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="order-info">
                    <span className="order-date">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>{order.status}</span>
                  </div>
                  <div className="order-total">
                    <strong>${order.total.toFixed(2)}</strong>
                    <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <button className={`order-expand-btn${expandedId === order._id ? ' open' : ''}`} aria-label="Toggle details">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {expandedId === order._id && (
                  <div className="order-body">
                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, i) => (
                          <tr key={i}>
                            <td className="item-title">{item.title}</td>
                            <td className="item-center">{item.quantity}</td>
                            <td className="item-center">${item.price.toFixed(3)}</td>
                            <td className="item-center item-subtotal">${(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="order-total-label">Total</td>
                          <td className="order-total-value">${order.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Delivered Files Section */}
                    {filesLoading[order._id] && (
                      <div className="delivered-files-section">
                        <div className="del-emails-loading"><div className="spinner spinner-sm" /> Loading files...</div>
                      </div>
                    )}
                    {files[order._id]?.length > 0 && (
                      <div className="delivered-files-section">
                        <div className="delivered-files-header">
                          <h4>📁 Your Files</h4>
                        </div>
                        <div className="delivered-files-list">
                          {files[order._id].map(f => (
                            <div key={f._id} className="delivered-file-item">
                              <div className="delivered-file-info">
                                <span className="delivered-file-name">{f.originalName}</span>
                                <span className="delivered-file-meta">{formatSize(f.fileSize)}</span>
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={downloading === f._id}
                                onClick={() => downloadFile(order._id, f)}
                              >
                                {downloading === f._id ? '⏳ Downloading...' : '📥 Download'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivered Emails Section */}
                    {order.status === 'completed' && order.emailsDelivered > 0 && (
                      <div className="delivered-emails-section">
                        <div className="delivered-emails-header">
                          <h4>📧 Your Email Credentials</h4>
                          {emails[order._id]?.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => downloadCSV(order._id)}>
                                📥 CSV
                              </button>
                              <button className="btn btn-primary btn-sm" onClick={() => downloadXLSX(order._id)}>
                                📥 Excel
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => copyEmails(order._id)}>
                                {copiedId === order._id ? '✅ Copied!' : '📋 Copy All'}
                              </button>
                            </div>
                          )}
                        </div>
                        {emailLoading[order._id] ? (
                          <div className="del-emails-loading"><div className="spinner spinner-sm" /> Loading...</div>
                        ) : emails[order._id]?.length > 0 ? (
                          <div className="del-emails-table-wrap">
                            <table className="del-emails-table">
                              <thead>
                                <tr><th>#</th><th>Username</th><th>Password</th><th>Recovery Mail</th><th>App Password</th><th>Security Key</th></tr>
                              </thead>
                              <tbody>
                                {emails[order._id].map((e, i) => (
                                  <tr key={e._id}>
                                    <td>{i + 1}</td>
                                    <td className="del-email-cell">{e.email}</td>
                                    <td className="del-pw-cell">{e.password}</td>
                                    <td>{e.recovery || '—'}</td>
                                    <td>{e.appPassword || '—'}</td>
                                    <td>{e.security || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="del-emails-empty">Loading email data...</p>
                        )}
                      </div>
                    )}

                    {order.status === 'pending' && (
                      <div className="order-pending-note">
                        ⏳ Your payment is being verified. You'll receive your emails once confirmed.
                      </div>
                    )}
                    {order.status === 'processing' && (
                      <div className="order-processing-note">
                        🔄 Your order is being processed. Emails will be delivered shortly.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
