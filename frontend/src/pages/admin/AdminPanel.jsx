import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AdminPanel.css';

/* ═══════════════════════════════════════ helpers ════ */
const fmtDate = d => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtMoney = n => `$${(n||0).toFixed(2)}`;
const short = id => '#'+id.slice(-6).toUpperCase();

const BADGE_MAP = {
  pending:'badge-orange', processing:'badge-blue', completed:'badge-green', cancelled:'badge-red',
  active:'badge-green', suspended:'badge-orange', banned:'badge-red', hidden:'badge-red',
  admin:'badge-purple', manager:'badge-blue', staff:'badge-teal', user:'badge-gray',
  gmail:'badge-red', outlook:'badge-blue', yahoo:'badge-purple', hotmail:'badge-blue', other:'badge-gray',
  percent:'badge-blue', fixed:'badge-green'
};
function Badge({s}){ return <span className={`badge ${BADGE_MAP[s?.toLowerCase()]||'badge-gray'}`}>{s}</span>; }

/* ═══════════════════════ Stat Card ═════════════════ */
function StatCard({icon,label,value,sub,color}){
  return(
    <div className={`stat-card sc-${color}`}>
      <div className="sc-icon">{icon}</div>
      <div className="sc-body">
        <div className="sc-label">{label}</div>
        <div className="sc-value">{value}</div>
        {sub && <div className="sc-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ═════════════════ Product Form Modal ══════════════ */
function ProductModal({initial, onSave, onClose}){
  const [f, setF] = useState(initial||{title:'',description:'',category:'Gmail',provider:'Gmail',icon:'gmail',stock:'',price:'',active:true,featured:false});
  const [iconFile,setIconFile]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const ch = e => { const{name,value,type,checked}=e.target; setF(p=>({...p,[name]:type==='checkbox'?checked:value})); };
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try{
      const data=new FormData();
      Object.keys(f).forEach(k=>data.append(k,f[k]));
      if(iconFile) data.append('iconFile',iconFile);
      if(initial?._id) await axios.put(`/api/admin/products/${initial._id}`,data,{headers:{'Content-Type':'multipart/form-data'}});
      else await axios.post('/api/admin/products',data,{headers:{'Content-Type':'multipart/form-data'}});
      onSave();
    }catch(err){ setError(err.response?.data?.msg||'Error saving'); }
    finally{ setLoading(false); }
  };
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <form className="modal-box" onSubmit={submit}>
        <div className="modal-hdr"><h3>{initial?'✏️ Edit Product':'➕ New Product'}</h3><button type="button" className="modal-x" onClick={onClose}>✕</button></div>
        {error&&<div className="alert alert-err">{error}</div>}
        <div className="modal-body">
          <div className="fg full"><label className="fl">Title</label><input name="title" className="fi" value={f.title} onChange={ch} required/></div>
          <div className="fg full"><label className="fl">Description</label><textarea name="description" className="fi" value={f.description} onChange={ch} required rows={3}/></div>
          <div className="fg"><label className="fl">Category</label>
            <select name="category" className="fi" value={f.category} onChange={ch}><option>Gmail</option><option>Outlook</option><option>Yahoo</option><option>Hotmail</option><option>Other</option></select>
          </div>
          <div className="fg"><label className="fl">Provider</label><input name="provider" className="fi" value={f.provider} onChange={ch}/></div>
          <div className="fg"><label className="fl">Stock</label><input type="number" name="stock" className="fi" value={f.stock} onChange={ch} required min={0}/></div>
          <div className="fg"><label className="fl">Price ($)</label><input type="number" name="price" className="fi" value={f.price} onChange={ch} required min={0} step="0.001"/></div>
          <div className="fg"><label className="fl">Icon</label>
            <select name="icon" className="fi" value={f.icon} onChange={ch}><option value="gmail">Gmail</option><option value="outlook">Outlook</option><option value="yahoo">Yahoo</option></select>
          </div>
          <div className="fg"><label className="fl">Custom Icon</label><input type="file" accept="image/*" className="fi" onChange={e=>setIconFile(e.target.files[0])}/></div>
          <div className="fg full chk-row">
            <label className="chk-label"><input type="checkbox" name="active" checked={f.active} onChange={ch}/>Active</label>
            <label className="chk-label"><input type="checkbox" name="featured" checked={f.featured} onChange={ch}/>Featured</label>
          </div>
        </div>
        <div className="modal-ft"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Saving…':(initial?'Save':'Add Product')}</button></div>
      </form>
    </div>
  );
}

/* ═════════════════ Coupon Modal ════════════════════ */
function CouponModal({initial, onSave, onClose}){
  const [f,setF]=useState(initial||{code:'',type:'percent',value:'',minOrder:'0',maxUses:'0',expiresAt:''});
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const ch = e => { const{name,value}=e.target; setF(p=>({...p,[name]:value})); };
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try{
      if(initial?._id) await axios.put(`/api/admin/coupons/${initial._id}`,f);
      else await axios.post('/api/admin/coupons',f);
      onSave();
    }catch(err){setError(err.response?.data?.msg||'Error');}
    finally{setLoading(false);}
  };
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <form className="modal-box modal-sm" onSubmit={submit}>
        <div className="modal-hdr"><h3>{initial?'Edit Coupon':'➕ New Coupon'}</h3><button type="button" className="modal-x" onClick={onClose}>✕</button></div>
        {error&&<div className="alert alert-err">{error}</div>}
        <div className="modal-body">
          <div className="fg full"><label className="fl">Code</label><input name="code" className="fi" value={f.code} onChange={ch} required placeholder="SAVE20"/></div>
          <div className="fg"><label className="fl">Type</label><select name="type" className="fi" value={f.type} onChange={ch}><option value="percent">Percent (%)</option><option value="fixed">Fixed ($)</option></select></div>
          <div className="fg"><label className="fl">Value</label><input type="number" name="value" className="fi" value={f.value} onChange={ch} required min={0}/></div>
          <div className="fg"><label className="fl">Min Order ($)</label><input type="number" name="minOrder" className="fi" value={f.minOrder} onChange={ch} min={0}/></div>
          <div className="fg"><label className="fl">Max Uses (0=∞)</label><input type="number" name="maxUses" className="fi" value={f.maxUses} onChange={ch} min={0}/></div>
          <div className="fg full"><label className="fl">Expires At</label><input type="date" name="expiresAt" className="fi" value={f.expiresAt?.split('T')[0]||''} onChange={ch}/></div>
        </div>
        <div className="modal-ft"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Saving…':'Save'}</button></div>
      </form>
    </div>
  );
}

/* ═════════════════ Email Import Modal ══════════════ */
function EmailImportModal({ order, onClose, onDone }) {
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { setError('Only .xlsx, .xls, .csv files allowed'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('File size must be under 5MB'); return; }
    setFile(f);
    setError('');
  };

  const doPreview = async () => {
    if (!file) return;
    setLoading(true); setError('');
    const data = new FormData();
    data.append('file', file);
    try {
      const r = await axios.post(`/api/admin/orders/${order._id}/preview-emails`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(r.data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.msg || 'Preview failed');
    } finally { setLoading(false); }
  };

  const doImport = async () => {
    if (!file) return;
    setLoading(true); setError('');
    const data = new FormData();
    data.append('file', file);
    try {
      const r = await axios.post(`/api/admin/orders/${order._id}/import-emails`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(r.data);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.msg || 'Import failed');
    } finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    window.open('/api/admin/orders/email-template', '_blank');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-lg">
        <div className="modal-hdr">
          <h3>📧 Import Emails — Order {short(order._id)}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="eim-order-bar">
          <div><span className="eim-label">Customer</span><strong>{order.user?.username || 'N/A'}</strong></div>
          <div><span className="eim-label">Product</span><strong>{order.items.map(i => i.title).join(', ')}</strong></div>
          <div><span className="eim-label">Qty Needed</span><strong>{order.items.reduce((s, i) => s + i.quantity, 0)}</strong></div>
          <div><span className="eim-label">Status</span><Badge s={order.status} /></div>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-err">{error}<button className="alert-close" onClick={() => setError('')}>✕</button></div>}

          {step === 'upload' && (
            <div className="eim-upload">
              <div className="eim-drop" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden-input" onChange={handleFile} />
                <div className="eim-drop-icon">📁</div>
                {file ? (
                  <div className="eim-file-name">✅ {file.name} <small>({(file.size / 1024).toFixed(1)} KB)</small></div>
                ) : (
                  <>
                    <p className="eim-drop-text">Click to select Excel/CSV file</p>
                    <p className="eim-drop-hint">Accepts .xlsx, .xls, .csv — Max 5MB</p>
                  </>
                )}
              </div>
              <div className="eim-template-row">
                <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>📥 Download Sample Template</button>
              </div>
              <div className="eim-format-info">
                <strong>Accepted column headers:</strong>
                <table className="tbl tbl-compact eim-format-tbl">
                  <thead><tr><th>Field</th><th>Required</th><th>Accepted Column Names</th></tr></thead>
                  <tbody>
                    <tr><td>Username</td><td>✅ Yes</td><td>Email, User Name, Username, Login, Mail</td></tr>
                    <tr><td>Password</td><td>✅ Yes</td><td>Password, Pass, Pwd</td></tr>
                    <tr><td>Recovery Mail</td><td>Optional</td><td>Recovery, Recovery Mail, Recovery Email, Backup</td></tr>
                    <tr><td>App Password</td><td>Optional</td><td>App Password, App Pass</td></tr>
                    <tr><td>Security Key</td><td>Optional</td><td>Security Key, Security, 2FA, Backup Code</td></tr>
                  </tbody>
                </table>
                <p className="eim-format-note">Supports .xlsx, .xls, .csv — Max 5MB — UTF-8 encoding</p>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="eim-preview">
              {preview.detectedColumns && (
                <div className="eim-detected">
                  <strong>🔍 Detected column mapping:</strong>
                  <div className="eim-col-map">
                    <span>Email ← <code>{preview.detectedColumns.email || '—'}</code></span>
                    <span>Password ← <code>{preview.detectedColumns.password || '—'}</code></span>
                    <span>Recovery ← <code>{preview.detectedColumns.recovery || '—'}</code></span>
                    <span>App Password ← <code>{preview.detectedColumns.appPassword || '—'}</code></span>
                    <span>Security ← <code>{preview.detectedColumns.security || '—'}</code></span>
                  </div>
                </div>
              )}
              <div className="eim-preview-stats">
                <div className="eim-stat eim-stat-ok"><span>{preview.preview.length}</span> valid emails</div>
                <div className="eim-stat eim-stat-err"><span>{preview.errors.length}</span> errors</div>
                <div className="eim-stat eim-stat-info"><span>{preview.totalNeeded}</span> qty needed</div>
                <div className="eim-stat eim-stat-info"><span>{preview.alreadyDelivered}</span> already delivered</div>
              </div>
              {preview.errors.length > 0 && (
                <div className="eim-errors">
                  <strong>⚠️ Errors (these rows will be skipped):</strong>
                  <ul>{preview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {preview.preview.length > 0 && (
                <div className="table-wrap">
                  <table className="tbl tbl-compact">
                    <thead><tr><th>#</th><th>Email</th><th>Password</th><th>Recovery</th><th>App Pass</th><th>Security</th></tr></thead>
                    <tbody>{preview.preview.map((p, i) => (
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td>{p.email}</td>
                        <td className="mono">{p.password}</td>
                        <td>{p.recovery || '—'}</td>
                        <td>{p.appPassword || '—'}</td>
                        <td>{p.security || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === 'done' && result && (
            <div className="eim-done">
              <div className="eim-done-icon">✅</div>
              <h3>Emails imported successfully!</h3>
              <p>Imported <strong>{result.imported}</strong> emails. Order marked as <Badge s="completed" />.</p>
              {result.errors?.length > 0 && (
                <div className="eim-errors" style={{ marginTop: 12 }}>
                  <strong>Skipped rows:</strong>
                  <ul>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-ft">
          {step === 'upload' && (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={!file || loading} onClick={doPreview}>
                {loading ? <><span className="spinner spinner-sm" /> Previewing…</> : '👁️ Preview Data'}
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button className="btn btn-ghost" onClick={() => { setStep('upload'); setPreview(null); setFile(null); }}>← Back</button>
              <button className="btn btn-primary" disabled={loading || !preview?.preview?.length} onClick={doImport}>
                {loading ? <><span className="spinner spinner-sm" /> Importing…</> : `✅ Confirm Import (${preview?.preview?.length || 0} emails)`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button className="btn btn-primary" onClick={() => { onDone(); onClose(); }}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ Order File Upload Modal ═════════ */
function FileUploadModal({ order, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/admin/orders/${order._id}/files`)
      .then(r => setFiles(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [order._id]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'txt'].includes(ext)) { setError('Only .xlsx, .xls, .csv, .txt files allowed'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('File size must be under 10MB'); return; }
    setFile(f);
    setError('');
  };

  const doUpload = async () => {
    if (!file) return;
    setUploading(true); setError(''); setSuccess('');
    const data = new FormData();
    data.append('file', file);
    try {
      const r = await axios.post(`/api/admin/orders/${order._id}/upload-file`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(`File uploaded! Order marked as completed.`);
      setFiles(prev => [r.data.file, ...prev]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onDone();
    } catch (err) {
      setError(err.response?.data?.msg || 'Upload failed');
    } finally { setUploading(false); }
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await axios.delete(`/api/admin/orders/files/${fileId}`);
      setFiles(prev => prev.filter(f => f._id !== fileId));
    } catch { setError('Delete failed'); }
  };

  const fmtSize = (bytes) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-lg">
        <div className="modal-hdr">
          <h3>📁 Upload File — Order {short(order._id)}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="eim-order-bar">
          <div><span className="eim-label">Customer</span><strong>{order.user?.username || 'N/A'}</strong></div>
          <div><span className="eim-label">Product</span><strong>{order.items.map(i => i.title).join(', ')}</strong></div>
          <div><span className="eim-label">Qty</span><strong>{order.items.reduce((s, i) => s + i.quantity, 0)}</strong></div>
          <div><span className="eim-label">Status</span><Badge s={order.status} /></div>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-err">{error}<button className="alert-close" onClick={() => setError('')}>✕</button></div>}
          {success && <div className="alert alert-ok">{success}<button className="alert-close" onClick={() => setSuccess('')}>✕</button></div>}

          <div className="eim-upload">
            <div className="eim-drop" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden-input" onChange={handleFile} />
              <div className="eim-drop-icon">📁</div>
              {file ? (
                <div className="eim-file-name">✅ {file.name} <small>({fmtSize(file.size)})</small></div>
              ) : (
                <>
                  <p className="eim-drop-text">Click to select file</p>
                  <p className="eim-drop-hint">Accepts .xlsx, .xls, .csv, .txt — Max 10MB</p>
                </>
              )}
            </div>
          </div>

          {files.length > 0 && (
            <div className="ofd-files-section">
              <strong>📎 Uploaded Files ({files.length})</strong>
              <div className="ofd-files-list">
                {files.map(f => (
                  <div key={f._id} className="ofd-file-item">
                    <div className="ofd-file-info">
                      <span className="ofd-file-name">{f.originalName}</span>
                      <span className="ofd-file-meta">{fmtSize(f.fileSize)} · {new Date(f.createdAt).toLocaleDateString()} · {f.downloads||0} downloads</span>
                    </div>
                    <button className="btn btn-danger btn-xs" onClick={() => deleteFile(f._id)}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="ap-loading"><div className="spinner spinner-sm" /></div>}
        </div>

        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" disabled={!file || uploading} onClick={doUpload}>
            {uploading ? <><span className="spinner spinner-sm" /> Uploading…</> : '📤 Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ Delivered Emails Viewer ═════════ */
function ViewEmailsModal({ order, onClose }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`/api/admin/orders/${order._id}/emails`)
      .then(r => setEmails(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [order._id]);

  const copyAll = () => {
    const text = emails.map(e => `${e.email}\t${e.password}\t${e.recovery || ''}\t${e.appPassword || ''}\t${e.security || ''}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const startEdit = (em) => {
    setEditId(em._id);
    setEditData({ email: em.email, password: em.password, recovery: em.recovery || '', appPassword: em.appPassword || '', security: em.security || '' });
  };

  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`/api/admin/emails/${editId}`, editData);
      setEmails(prev => prev.map(e => e._id === editId ? r.data : e));
      setEditId(null); setEditData({});
    } catch {}
    setSaving(false);
  };

  const editCh = (field, val) => setEditData(p => ({ ...p, [field]: val }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-lg">
        <div className="modal-hdr">
          <h3>📧 Delivered Emails — Order {short(order._id)}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? <div className="ap-loading"><div className="spinner" /></div> : emails.length > 0 ? (
            <>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emails.length} email{emails.length !== 1 ? 's' : ''} delivered</span>
                <button className="btn btn-secondary btn-sm" onClick={copyAll}>📋 Copy All</button>
              </div>
              <div className="table-wrap">
                <table className="tbl tbl-compact">
                  <thead><tr><th>#</th><th>Username</th><th>Password</th><th>Recovery Mail</th><th>App Password</th><th>Security Key</th><th>Actions</th></tr></thead>
                  <tbody>{emails.map((e, i) => (
                    editId === e._id ? (
                      <tr key={e._id} className="edit-row">
                        <td className="center">{i + 1}</td>
                        <td><input className="fi fi-sm" value={editData.email} onChange={ev => editCh('email', ev.target.value)} /></td>
                        <td><input className="fi fi-sm" value={editData.password} onChange={ev => editCh('password', ev.target.value)} /></td>
                        <td><input className="fi fi-sm" value={editData.recovery} onChange={ev => editCh('recovery', ev.target.value)} /></td>
                        <td><input className="fi fi-sm" value={editData.appPassword} onChange={ev => editCh('appPassword', ev.target.value)} /></td>
                        <td><input className="fi fi-sm" value={editData.security} onChange={ev => editCh('security', ev.target.value)} /></td>
                        <td><div className="act-btns"><button className="btn btn-primary btn-xs" disabled={saving} onClick={saveEdit}>{saving ? '…' : '✅'}</button><button className="btn btn-ghost btn-xs" onClick={cancelEdit}>✕</button></div></td>
                      </tr>
                    ) : (
                      <tr key={e._id}>
                        <td className="center">{i + 1}</td>
                        <td>{e.email}</td>
                        <td className="mono">{e.password}</td>
                        <td>{e.recovery || '—'}</td>
                        <td>{e.appPassword || '—'}</td>
                        <td>{e.security || '—'}</td>
                        <td><button className="btn btn-secondary btn-xs" onClick={() => startEdit(e)}>✏️ Edit</button></td>
                      </tr>
                    )
                  ))}</tbody>
                </table>
              </div>
            </>
          ) : <div className="empty-state">No emails delivered yet</div>}
        </div>
        <div className="modal-ft"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

/* ═════════════════ User Detail Modal ═══════════════ */
function UserDetailModal({userId, onClose, onRefresh}){
  const [data,setData]=useState(null);
  const [newPw,setNewPw]=useState('');
  const [msg,setMsg]=useState('');
  useEffect(()=>{ if(userId) axios.get(`/api/admin/users/${userId}`).then(r=>setData(r.data)).catch(()=>{}); },[userId]);
  const resetPw = async()=>{
    if(!newPw||newPw.length<6){setMsg('Min 6 chars'); return;}
    try{ await axios.put(`/api/admin/users/${userId}/reset-password`,{newPassword:newPw}); setMsg('✅ Password reset!'); setNewPw(''); }
    catch(e){setMsg(e.response?.data?.msg||'Error');}
  };
  const changeStatus = async(status)=>{
    try{ await axios.put(`/api/admin/users/${userId}`,{status}); setData(d=>({...d,user:{...d.user,status}})); onRefresh(); }catch{}
  };
  const changeRole = async(role)=>{
    try{ await axios.put(`/api/admin/users/${userId}`,{role}); setData(d=>({...d,user:{...d.user,role}})); onRefresh(); }catch{}
  };
  if(!data) return null;
  const {user, orders}=data;
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box modal-lg">
        <div className="modal-hdr"><h3>👤 {user.username}</h3><button className="modal-x" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="ud-grid">
            <div className="ud-info">
              <div className="ud-avatar">{user.username[0].toUpperCase()}</div>
              <div>
                <div className="ud-name">{user.username}</div>
                <div className="ud-email">{user.email}</div>
                <div className="ud-meta"><Badge s={user.role}/> <Badge s={user.status||'active'}/></div>
                <div className="ud-meta-text">Joined {fmtDate(user.createdAt)}</div>
                {user.lastLogin && <div className="ud-meta-text">Last login: {fmtDate(user.lastLogin)}</div>}
              </div>
            </div>
            <div className="ud-actions">
              <div className="fg"><label className="fl">Change Role</label>
                <select className="fi fi-sm" value={user.role} onChange={e=>changeRole(e.target.value)}>
                  <option value="user">User</option><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </select>
              </div>
              <div className="fg"><label className="fl">Account Status</label>
                <div className="btn-row">
                  <button className={`btn btn-sm ${user.status==='active'?'btn-primary':'btn-ghost'}`} onClick={()=>changeStatus('active')}>Active</button>
                  <button className={`btn btn-sm ${user.status==='suspended'?'btn-warning':'btn-ghost'}`} onClick={()=>changeStatus('suspended')}>Suspend</button>
                  <button className={`btn btn-sm ${user.status==='banned'?'btn-danger':'btn-ghost'}`} onClick={()=>changeStatus('banned')}>Ban</button>
                </div>
              </div>
              <div className="fg"><label className="fl">Reset Password</label>
                <div className="pw-row"><input className="fi fi-sm" placeholder="New password (min 6)" value={newPw} onChange={e=>setNewPw(e.target.value)}/><button type="button" className="btn btn-sm btn-secondary" onClick={resetPw}>Reset</button></div>
                {msg && <small className="pw-msg">{msg}</small>}
              </div>
            </div>
          </div>
          <h4 className="ud-orders-title">Order History ({orders.length})</h4>
          {orders.length>0?(
            <table className="tbl">
              <thead><tr><th>ID</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.slice(0,15).map(o=>(
                  <tr key={o._id}><td className="mono">{short(o._id)}</td><td>{o.items.length}</td><td className="money">{fmtMoney(o.total)}</td><td><Badge s={o.status}/></td><td className="dt">{fmtDate(o.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          ):(<div className="empty-sm">No orders</div>)}
        </div>
        <div className="modal-ft"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN ADMIN PANEL
   ═══════════════════════════════════════════════════ */
export default function AdminPanel(){
  const {user, loading:authLoading}=useAuth();
  const navigate=useNavigate();
  const [tab,setTab]=useState('dashboard');
  const [dark,setDark]=useState(()=>localStorage.getItem('admin-theme')==='dark');
  const [sideOpen,setSideOpen]=useState(false);
  const [search,setSearch]=useState('');

  /* data */
  const [stats,setStats]=useState(null);
  const [products,setProducts]=useState([]);
  const [orders,setOrders]=useState([]);
  const [users,setUsers]=useState([]);
  const [coupons,setCoupons]=useState([]);
  const [logs,setLogs]=useState([]);
  const [importLogs,setImportLogs]=useState([]);
  const [settings,setSettings]=useState({});
  const [salesReport,setSalesReport]=useState(null);
  const [loading,setLoading]=useState(false);

  /* modals */
  const [productModal,setProductModal]=useState(null); // null | {} | product
  const [couponModal,setCouponModal]=useState(null);
  const [userDetail,setUserDetail]=useState(null);

  /* filters */
  const [orderFilter,setOrderFilter]=useState('all');
  const [logFilter,setLogFilter]=useState('all');
  const [reportRange,setReportRange]=useState({from:'',to:''});

  /* bulk import */
  const bulkRef = useRef();
  const [bulkResult,setBulkResult]=useState(null);

  /* order excel import */
  const orderImportRef = useRef();
  const [orderImportResult, setOrderImportResult] = useState(null);
  const [emailImportOrder, setEmailImportOrder] = useState(null); // order object for per-order email import
  const [fileUploadOrder, setFileUploadOrder] = useState(null); // order object for file upload
  const [viewEmailsOrder, setViewEmailsOrder] = useState(null); // order object for viewing delivered emails

  // Auth guard
  useEffect(()=>{
    if(!authLoading && (!user || !['admin','manager','staff'].includes(user.role))) navigate('/');
  },[user,authLoading,navigate]);

  // Theme
  useEffect(()=>{
    document.documentElement.setAttribute('data-admin-theme', dark?'dark':'light');
    localStorage.setItem('admin-theme', dark?'dark':'light');
  },[dark]);

  /* fetchers */
  const fetchStats=useCallback(async()=>{try{const r=await axios.get('/api/admin/stats');setStats(r.data);}catch{}},[]);
  const fetchProducts=useCallback(async()=>{setLoading(true);try{const r=await axios.get('/api/admin/products');setProducts(r.data);}catch{}finally{setLoading(false);}},[]);
  const fetchOrders=useCallback(async()=>{setLoading(true);try{const r=await axios.get('/api/admin/orders');setOrders(r.data);}catch{}finally{setLoading(false);}},[]);
  const fetchUsers=useCallback(async()=>{setLoading(true);try{const r=await axios.get('/api/admin/users');setUsers(r.data);}catch{}finally{setLoading(false);}},[]);
  const fetchCoupons=useCallback(async()=>{setLoading(true);try{const r=await axios.get('/api/admin/coupons');setCoupons(r.data);}catch{}finally{setLoading(false);}},[]);
  const fetchLogs=useCallback(async()=>{setLoading(true);try{const r=await axios.get(`/api/admin/logs?category=${logFilter}`);setLogs(r.data);}catch{}finally{setLoading(false);}},[logFilter]);
  const fetchImportLogs=useCallback(async()=>{setLoading(true);try{const r=await axios.get('/api/admin/import-logs');setImportLogs(r.data);}catch{}finally{setLoading(false);}},[]);
  const fetchSettings=useCallback(async()=>{try{const r=await axios.get('/api/admin/settings');setSettings(r.data);}catch{}},[]);
  const fetchReports=useCallback(async()=>{setLoading(true);try{const r=await axios.get(`/api/admin/reports/sales?from=${reportRange.from}&to=${reportRange.to}`);setSalesReport(r.data);}catch{}finally{setLoading(false);}},[reportRange]);

  useEffect(()=>{
    setSearch('');
    if(tab==='dashboard') fetchStats();
    if(tab==='products') fetchProducts();
    if(tab==='orders') fetchOrders();
    if(tab==='users') fetchUsers();
    if(tab==='coupons') fetchCoupons();
    if(tab==='logs') fetchLogs();
    if(tab==='import-logs') fetchImportLogs();
    if(tab==='settings') fetchSettings();
    if(tab==='reports') fetchReports();
  },[tab, fetchStats, fetchProducts, fetchOrders, fetchUsers, fetchCoupons, fetchLogs, fetchImportLogs, fetchSettings, fetchReports]);

  /* actions */
  const delProduct=async id=>{if(!window.confirm('Delete product?'))return;await axios.delete(`/api/admin/products/${id}`);fetchProducts();fetchStats();};
  const updateOrderStatus=async(id,status)=>{await axios.put(`/api/admin/orders/${id}`,{status});fetchOrders();};
  const delUser=async id=>{if(!window.confirm('Delete this user?'))return;try{await axios.delete(`/api/admin/users/${id}`);fetchUsers();fetchStats();}catch(e){alert(e.response?.data?.msg||'Error');}};
  const delCoupon=async id=>{if(!window.confirm('Delete coupon?'))return;await axios.delete(`/api/admin/coupons/${id}`);fetchCoupons();};
  const toggleCoupon=async(id,active)=>{await axios.put(`/api/admin/coupons/${id}`,{active:!active});fetchCoupons();};
  const saveSettings=async()=>{try{await axios.put('/api/admin/settings',settings);alert('Settings saved!');}catch{alert('Error saving');}};

  const bulkImport=async e=>{
    const file=e.target.files[0]; if(!file)return;
    const data=new FormData(); data.append('file',file);
    try{const r=await axios.post('/api/admin/products/bulk-import',data,{headers:{'Content-Type':'multipart/form-data'}});setBulkResult(r.data);fetchProducts();}
    catch(err){setBulkResult({error:err.response?.data?.msg||'Import failed'});}
    finally{if(bulkRef.current) bulkRef.current.value='';}
  };

  const orderImport=async e=>{
    const file=e.target.files[0]; if(!file)return;
    const data=new FormData(); data.append('file',file);
    try{const r=await axios.post('/api/admin/orders/import-excel',data,{headers:{'Content-Type':'multipart/form-data'}});setOrderImportResult(r.data);fetchOrders();fetchStats();}
    catch(err){setOrderImportResult({error:err.response?.data?.msg||'Import failed'});}
    finally{if(orderImportRef.current) orderImportRef.current.value='';}
  };

  const exportOrders=()=>{window.open(`/api/admin/orders/export?status=${orderFilter}`,'_blank');};
  const exportReport=()=>{window.open(`/api/admin/reports/export-csv?from=${reportRange.from}&to=${reportRange.to}`,'_blank');};

  /* filters on frontend */
  const q = search.toLowerCase();
  const fProducts = products.filter(p=>!q||p.title.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
  const fOrders = orders.filter(o=>{
    if(orderFilter!=='all'&&o.status!==orderFilter) return false;
    if(!q) return true;
    return o._id.toLowerCase().includes(q)||(o.user?.username||'').toLowerCase().includes(q)||(o.user?.email||'').toLowerCase().includes(q);
  });
  const fUsers = users.filter(u=>!q||u.username.toLowerCase().includes(q)||u.email.toLowerCase().includes(q));

  const goTab=t=>{setTab(t);setProductModal(null);setCouponModal(null);setUserDetail(null);setSideOpen(false);setBulkResult(null);};

  const NAV=[
    {id:'dashboard',icon:'📊',label:'Dashboard'},
    {id:'products',icon:'📦',label:'Products'},
    {id:'orders',icon:'🧾',label:'Orders'},
    {id:'users',icon:'👥',label:'Users'},
    {id:'coupons',icon:'🎟️',label:'Coupons'},
    {id:'reports',icon:'📈',label:'Reports'},
    {id:'logs',icon:'📋',label:'Activity Logs'},
    {id:'import-logs',icon:'📥',label:'Import Logs'},
    {id:'settings',icon:'⚙️',label:'Settings'},
  ];

  if(authLoading) return <div className="ap-loading"><div className="spinner"/></div>;
  if(!user||!['admin','manager','staff'].includes(user.role)) return null;

  return(
    <div className={`ap ${dark?'ap-dark':'ap-light'}`}>
      {sideOpen && <div className="ap-overlay" onClick={()=>setSideOpen(false)}/>}

      {/* ─── SIDEBAR ─── */}
      <aside className={`ap-side${sideOpen?' open':''}`}>
        <div className="ap-brand">
          <span className="ap-brand-icon">⚙️</span>
          <div><div className="ap-brand-t">GlobalEmail</div><div className="ap-brand-s">Hub Admin</div></div>
        </div>
        <nav className="ap-nav">
          {NAV.map(n=>(
            <button key={n.id} className={`ap-nav-btn${tab===n.id?' active':''}`} onClick={()=>goTab(n.id)}>
              <span className="nv-i">{n.icon}</span><span className="nv-l">{n.label}</span>
              {n.id==='orders'&&stats?.pendingOrders>0&&<span className="nv-badge">{stats.pendingOrders}</span>}
            </button>
          ))}
        </nav>
        <div className="ap-side-ft">
          <button className="ap-nav-btn" onClick={()=>navigate('/')}><span className="nv-i">←</span><span className="nv-l">Back to Site</span></button>
          <div className="ap-user">
            <div className="ap-user-av">{user.username?.[0]?.toUpperCase()||'A'}</div>
            <div><div className="ap-user-n">{user.username}</div><div className="ap-user-r">{user.role}</div></div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className="ap-main">
        {/* Topbar */}
        <header className="ap-topbar">
          <button className="ap-burger" onClick={()=>setSideOpen(s=>!s)}>☰</button>
          <div className="ap-tb-title">{NAV.find(n=>n.id===tab)?.icon} {NAV.find(n=>n.id===tab)?.label}</div>
          {['products','orders','users'].includes(tab)&&(
            <div className="ap-search"><span>🔍</span><input placeholder={`Search ${tab}…`} value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')}>✕</button>}</div>
          )}
          <div className="ap-tb-right">
            <button className="theme-toggle" onClick={()=>setDark(d=>!d)} title="Toggle theme">{dark?'☀️':'🌙'}</button>
          </div>
        </header>

        <div className="ap-content">

          {/* ═══ DASHBOARD ═══ */}
          {tab==='dashboard'&&(stats?(
            <div className="dash">
              <div className="stat-grid">
                <StatCard icon="📦" label="Total Products" value={stats.totalProducts} sub={`${stats.activeProducts} active`} color="blue"/>
                <StatCard icon="🧾" label="Total Orders" value={stats.totalOrders} sub={`${stats.pendingOrders} pending`} color="green"/>
                <StatCard icon="👥" label="Users" value={stats.totalUsers} sub="registered" color="purple"/>
                <StatCard icon="💰" label="Revenue" value={fmtMoney(stats.totalRevenue)} sub="excl. cancelled" color="amber"/>
                <StatCard icon="📅" label="Today's Sales" value={fmtMoney(stats.todaySales)} sub={`${stats.todayOrders} orders`} color="teal"/>
                <StatCard icon="⚠️" label="Low Stock" value={stats.lowStock?.length||0} sub="products < 10" color="red"/>
              </div>

              <div className="dash-grid">
                {/* Recent Orders */}
                <div className="panel">
                  <div className="panel-hdr"><h3>🕒 Recent Orders</h3><button className="link-btn" onClick={()=>goTab('orders')}>View all →</button></div>
                  {stats.recentOrders?.length>0?(
                    <table className="tbl tbl-compact">
                      <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                      <tbody>{stats.recentOrders.map(o=>(
                        <tr key={o._id}><td className="mono">{short(o._id)}</td><td>{o.user?.username||'Guest'}</td><td className="money">{fmtMoney(o.total)}</td><td><Badge s={o.status}/></td></tr>
                      ))}</tbody>
                    </table>
                  ):<div className="empty-sm">No orders yet</div>}
                </div>

                {/* Low Stock */}
                <div className="panel">
                  <div className="panel-hdr"><h3>⚠️ Low Stock Alert</h3><button className="link-btn" onClick={()=>goTab('products')}>Manage →</button></div>
                  {stats.lowStock?.length>0?(
                    <div className="ls-list">{stats.lowStock.map(p=>(
                      <div key={p._id} className="ls-item"><span className="ls-name">{p.title}</span><span className={`ls-count${p.stock===0?' oos':''}`}>{p.stock===0?'OUT OF STOCK':`${p.stock} left`}</span></div>
                    ))}</div>
                  ):<div className="empty-sm">✅ All stocked</div>}
                </div>

                {/* Top Products */}
                <div className="panel">
                  <div className="panel-hdr"><h3>🏆 Top Sellers</h3></div>
                  {stats.topProducts?.length>0?(
                    <table className="tbl tbl-compact"><thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                    <tbody>{stats.topProducts.map((p,i)=>(
                      <tr key={i}><td>{p._id}</td><td>{p.totalSold}</td><td className="money">{fmtMoney(p.totalRevenue)}</td></tr>
                    ))}</tbody></table>
                  ):<div className="empty-sm">No data</div>}
                </div>

                {/* Activity Feed */}
                <div className="panel">
                  <div className="panel-hdr"><h3>📋 Recent Activity</h3><button className="link-btn" onClick={()=>goTab('logs')}>View all →</button></div>
                  {stats.recentLogs?.length>0?(
                    <div className="log-feed">{stats.recentLogs.map((l,i)=>(
                      <div key={i} className="log-item"><Badge s={l.category}/><span className="log-action">{l.action}</span><span className="log-time">{fmtDate(l.createdAt)}</span></div>
                    ))}</div>
                  ):<div className="empty-sm">No activity</div>}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="panel qa-panel">
                <h3>⚡ Quick Actions</h3>
                <div className="qa-btns">
                  <button className="qa-btn" onClick={()=>{goTab('products');setTimeout(()=>setProductModal({}),50);}}>📦 Add Product</button>
                  <button className="qa-btn" onClick={()=>goTab('orders')}>🧾 View Orders</button>
                  <button className="qa-btn" onClick={()=>goTab('users')}>👥 Manage Users</button>
                  <button className="qa-btn" onClick={()=>goTab('coupons')}>🎟️ Coupons</button>
                  <button className="qa-btn" onClick={()=>goTab('reports')}>📈 Reports</button>
                  <button className="qa-btn qa-refresh" onClick={fetchStats}>🔄 Refresh</button>
                </div>
              </div>
            </div>
          ):<div className="ap-loading"><div className="spinner"/></div>)}

          {/* ═══ PRODUCTS ═══ */}
          {tab==='products'&&(
            <div>
              <div className="tab-bar">
                <button className="btn btn-primary btn-sm" onClick={()=>setProductModal({})}>+ Add Product</button>
                <button className="btn btn-secondary btn-sm" onClick={()=>bulkRef.current?.click()}>📄 Bulk Import CSV</button>
                <input ref={bulkRef} type="file" accept=".csv,.txt" className="hidden-input" onChange={bulkImport}/>
              </div>
              {bulkResult&&(
                <div className={`alert ${bulkResult.error?'alert-err':'alert-ok'}`}>
                  {bulkResult.error||`✅ Imported ${bulkResult.imported}/${bulkResult.total} products. ${bulkResult.errors?.length?`Errors: ${bulkResult.errors.length}`:''}`}
                  <button className="alert-close" onClick={()=>setBulkResult(null)}>✕</button>
                </div>
              )}
              {loading?<div className="ap-loading"><div className="spinner"/></div>:(
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{fProducts.map(p=>(
                      <tr key={p._id}>
                        <td className="td-title"><strong>{p.title}</strong><small>{p.description?.substring(0,60)}…</small></td>
                        <td><Badge s={p.category}/></td>
                        <td className="center"><span className={p.stock<5?'stock-low':''}>{p.stock}</span></td>
                        <td className="money">${p.price.toFixed(3)}</td>
                        <td><Badge s={p.active?'active':'hidden'}/></td>
                        <td><div className="act-btns"><button className="btn btn-secondary btn-xs" onClick={()=>setProductModal(p)}>Edit</button><button className="btn btn-danger btn-xs" onClick={()=>delProduct(p._id)}>Del</button></div></td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {fProducts.length===0&&<div className="empty-state">📭 {search?'No matches':'No products'}</div>}
                </div>
              )}
            </div>
          )}

          {/* ═══ ORDERS ═══ */}
          {tab==='orders'&&(
            <div>
              <div className="tab-bar">
                <div className="filter-row">
                  {['all','pending','processing','completed','cancelled'].map(s=>(
                    <button key={s} className={`filter-btn${orderFilter===s?' active':''}`} onClick={()=>setOrderFilter(s)}>{s}</button>
                  ))}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={()=>orderImportRef.current?.click()}>📥 Bulk Import</button>
                <input ref={orderImportRef} type="file" accept=".xlsx,.xls" className="hidden-input" onChange={orderImport}/>
              </div>
              {orderImportResult&&(
                <div className={`alert ${orderImportResult.error?'alert-err':'alert-ok'}`}>
                  {orderImportResult.error||`✅ Imported ${orderImportResult.imported}/${orderImportResult.total} orders. ${orderImportResult.errors?.length?`Errors: ${orderImportResult.errors.length}`:''}`}
                  {orderImportResult.errors?.length>0&&<ul style={{margin:'8px 0 0',paddingLeft:18,fontSize:12}}>{orderImportResult.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}
                  <button className="alert-close" onClick={()=>setOrderImportResult(null)}>✕</button>
                </div>
              )}
              {loading?<div className="ap-loading"><div className="spinner"/></div>:(
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{fOrders.map(o=>(
                      <tr key={o._id}>
                        <td className="mono">{short(o._id)}</td>
                        <td><strong>{o.user?.username||'N/A'}</strong><small>{o.user?.email}</small></td>
                        <td className="td-title">{o.items.map(i=>i.title).join(', ')}</td>
                        <td className="center">{o.items.reduce((s,i)=>s+i.quantity,0)}</td>
                        <td className="money">{fmtMoney(o.total)}</td>
                        <td>{o.paymentMethod==='usdt_trc20'?'USDT TRC20':o.paymentMethod==='binance_pay'?'Binance Pay':'-'}</td>
                        <td className="dt">{fmtDate(o.createdAt)}</td>
                        <td>
                          <select className="status-sel" value={o.status} onChange={e=>updateOrderStatus(o._id,e.target.value)}>
                            <option value="pending">Pending</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <div className="act-btns">
                            {o.emailsDelivered>0&&<button className="btn btn-secondary btn-xs" onClick={()=>setViewEmailsOrder(o)}>📧 {o.emailsDelivered}</button>}
                            {user.role==='admin'&&o.status!=='cancelled'&&(
                              <>
                                <button className="btn btn-primary btn-xs" onClick={()=>setEmailImportOrder(o)}>📥 Import</button>
                                <button className="btn btn-secondary btn-xs" onClick={()=>setFileUploadOrder(o)}>📁 File</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {fOrders.length===0&&<div className="empty-state">🧾 {search?'No matches':'No orders'}</div>}
                </div>
              )}
            </div>
          )}

          {/* ═══ USERS ═══ */}
          {tab==='users'&&(
            <div>
              {loading?<div className="ap-loading"><div className="spinner"/></div>:(
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                    <tbody>{fUsers.map(u=>(
                      <tr key={u._id}>
                        <td><div className="user-cell"><div className="user-av">{u.username?.[0]?.toUpperCase()}</div><strong>{u.username}</strong></div></td>
                        <td className="td-email">{u.email}</td>
                        <td><Badge s={u.role}/></td>
                        <td><Badge s={u.status||'active'}/></td>
                        <td className="dt">{fmtDate(u.createdAt)}</td>
                        <td><div className="act-btns">
                          <button className="btn btn-secondary btn-xs" onClick={()=>setUserDetail(u._id)}>View</button>
                          {u.role!=='admin'&&<button className="btn btn-danger btn-xs" onClick={()=>delUser(u._id)}>Del</button>}
                        </div></td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {fUsers.length===0&&<div className="empty-state">👥 {search?'No matches':'No users'}</div>}
                </div>
              )}
            </div>
          )}

          {/* ═══ COUPONS ═══ */}
          {tab==='coupons'&&(
            <div>
              <div className="tab-bar"><button className="btn btn-primary btn-sm" onClick={()=>setCouponModal({})}>+ New Coupon</button></div>
              {loading?<div className="ap-loading"><div className="spinner"/></div>:(
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{coupons.map(c=>(
                      <tr key={c._id}>
                        <td className="mono">{c.code}</td>
                        <td><Badge s={c.type}/></td>
                        <td className="center">{c.type==='percent'?`${c.value}%`:`$${c.value}`}</td>
                        <td className="center">{fmtMoney(c.minOrder)}</td>
                        <td className="center">{c.usedCount}/{c.maxUses||'∞'}</td>
                        <td className="dt">{c.expiresAt?fmtDate(c.expiresAt):'Never'}</td>
                        <td><Badge s={c.active?'active':'hidden'}/></td>
                        <td><div className="act-btns">
                          <button className="btn btn-secondary btn-xs" onClick={()=>toggleCoupon(c._id,c.active)}>{c.active?'Disable':'Enable'}</button>
                          <button className="btn btn-secondary btn-xs" onClick={()=>setCouponModal(c)}>Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={()=>delCoupon(c._id)}>Del</button>
                        </div></td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {coupons.length===0&&<div className="empty-state">🎟️ No coupons</div>}
                </div>
              )}
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {tab==='reports'&&(
            <div>
              <div className="tab-bar">
                <div className="filter-row">
                  <label className="fl">From</label><input type="date" className="fi fi-sm" value={reportRange.from} onChange={e=>setReportRange(r=>({...r,from:e.target.value}))}/>
                  <label className="fl">To</label><input type="date" className="fi fi-sm" value={reportRange.to} onChange={e=>setReportRange(r=>({...r,to:e.target.value}))}/>
                  <button className="btn btn-primary btn-sm" onClick={fetchReports}>Generate</button>
                  <button className="btn btn-secondary btn-sm" onClick={exportReport}>📥 Export CSV</button>
                </div>
              </div>
              {loading?<div className="ap-loading"><div className="spinner"/></div>:salesReport?(
                <div className="reports-grid">
                  {/* By Status */}
                  <div className="panel">
                    <div className="panel-hdr"><h3>📊 Orders by Status</h3></div>
                    <table className="tbl tbl-compact">
                      <thead><tr><th>Status</th><th>Count</th><th>Total</th></tr></thead>
                      <tbody>{salesReport.byStatus?.map((s,i)=>(
                        <tr key={i}><td><Badge s={s._id}/></td><td className="center">{s.count}</td><td className="money">{fmtMoney(s.total)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>

                  {/* Daily Revenue */}
                  <div className="panel">
                    <div className="panel-hdr"><h3>📅 Daily Revenue</h3></div>
                    {salesReport.daily?.length>0?(
                      <div className="chart-bars">{salesReport.daily.map((d,i)=>{
                        const max=Math.max(...salesReport.daily.map(dd=>dd.revenue));
                        return(<div key={i} className="chart-bar-row"><span className="chart-date">{d._id}</span><div className="chart-bar-wrap"><div className="chart-bar" style={{width:`${max>0?(d.revenue/max*100):0}%`}}/></div><span className="chart-val">{fmtMoney(d.revenue)}</span></div>);
                      })}</div>
                    ):<div className="empty-sm">No data</div>}
                  </div>

                  {/* By Product */}
                  <div className="panel full-span">
                    <div className="panel-hdr"><h3>🏆 Revenue by Product</h3></div>
                    <table className="tbl tbl-compact">
                      <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                      <tbody>{salesReport.byProduct?.map((p,i)=>(
                        <tr key={i}><td>{p._id}</td><td className="center">{p.sold}</td><td className="money">{fmtMoney(p.revenue)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              ):<div className="empty-state">📈 Set a date range and click Generate</div>}
            </div>
          )}

          {/* ═══ ACTIVITY LOGS ═══ */}
          {tab==='logs'&&(
            <div>
              <div className="tab-bar">
                <div className="filter-row">
                  {['all','auth','product','order','user','settings','system'].map(c=>(
                    <button key={c} className={`filter-btn${logFilter===c?' active':''}`} onClick={()=>{setLogFilter(c);}}>{c}</button>
                  ))}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>Refresh</button>
              </div>
              {loading?<div className="ap-loading"><div className="spinner"/></div>:(
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Time</th><th>User</th><th>Category</th><th>Action</th><th>IP</th></tr></thead>
                    <tbody>{logs.map((l,i)=>(
                      <tr key={i}>
                        <td className="dt">{new Date(l.createdAt).toLocaleString()}</td>
                        <td>{l.user?.username||'System'}</td>
                        <td><Badge s={l.category}/></td>
                        <td>{l.action}</td>
                        <td className="mono td-ip">{l.ip||'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {logs.length===0&&<div className="empty-state">📋 No logs</div>}
                </div>
              )}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab==='import-logs'&&(
            <div>
              <div className="panel-hdr"><h3>📥 Import Logs</h3><button className="btn btn-secondary" onClick={fetchImportLogs}>🔄 Refresh</button></div>
              {loading?<div className="ap-loading"><div className="spinner"/></div>:(
                <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Time</th><th>Admin</th><th>Order</th><th>File</th><th>Total</th><th>Imported</th><th>Errors</th></tr></thead><tbody>
                  {importLogs.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'2rem'}}>No import logs yet</td></tr>:
                    importLogs.map(l=>(<tr key={l._id}>
                      <td>{new Date(l.createdAt).toLocaleString()}</td>
                      <td>{l.admin?.name||'—'}</td>
                      <td>{l.order?._id?.slice(-6)||'—'}</td>
                      <td>{l.fileName}</td>
                      <td>{l.totalRows}</td>
                      <td style={{color:'#22c55e'}}>{l.importedRows}</td>
                      <td style={{color:l.errorRows?'#ef4444':'inherit'}}>{l.errorRows}{l.errors?.length>0&&<details style={{marginTop:4}}><summary>Details</summary><ul style={{fontSize:12,margin:0,paddingLeft:16}}>{l.errors.map((e,i)=><li key={i}>Row {e.row}: {e.message}</li>)}</ul></details>}</td>
                    </tr>))}
                </tbody></table></div>
              )}
            </div>
          )}

          {tab==='settings'&&(
            <div className="settings-page">
              <div className="settings-grid">
                <div className="panel">
                  <div className="panel-hdr"><h3>🌐 Website</h3></div>
                  <div className="settings-body">
                    <div className="fg"><label className="fl">Site Name</label><input className="fi" value={settings.siteName||''} onChange={e=>setSettings(s=>({...s,siteName:e.target.value}))}/></div>
                    <div className="fg"><label className="fl">Site Description</label><textarea className="fi" rows={2} value={settings.siteDescription||''} onChange={e=>setSettings(s=>({...s,siteDescription:e.target.value}))}/></div>
                    <div className="fg"><label className="fl">Contact Email</label><input className="fi" value={settings.contactEmail||''} onChange={e=>setSettings(s=>({...s,contactEmail:e.target.value}))}/></div>
                    <div className="fg chk-row"><label className="chk-label"><input type="checkbox" checked={settings.maintenanceMode||false} onChange={e=>setSettings(s=>({...s,maintenanceMode:e.target.checked}))}/>🔧 Maintenance Mode</label></div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-hdr"><h3>💳 Payment</h3></div>
                  <div className="settings-body">
                    <div className="fg"><label className="fl">Payment Methods</label><input className="fi" placeholder="crypto, paypal, manual" value={settings.paymentMethods||''} onChange={e=>setSettings(s=>({...s,paymentMethods:e.target.value}))}/></div>
                    <div className="fg"><label className="fl">Minimum Order ($)</label><input type="number" className="fi" value={settings.minOrder||''} onChange={e=>setSettings(s=>({...s,minOrder:e.target.value}))}/></div>
                    <div className="fg chk-row"><label className="chk-label"><input type="checkbox" checked={settings.manualPayment||false} onChange={e=>setSettings(s=>({...s,manualPayment:e.target.checked}))}/>Enable Manual Payment</label></div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-hdr"><h3>📧 Email / SMTP</h3></div>
                  <div className="settings-body">
                    <div className="fg"><label className="fl">SMTP Host</label><input className="fi" value={settings.smtpHost||''} onChange={e=>setSettings(s=>({...s,smtpHost:e.target.value}))}/></div>
                    <div className="fg"><label className="fl">SMTP Port</label><input className="fi" value={settings.smtpPort||''} onChange={e=>setSettings(s=>({...s,smtpPort:e.target.value}))}/></div>
                    <div className="fg"><label className="fl">SMTP User</label><input className="fi" value={settings.smtpUser||''} onChange={e=>setSettings(s=>({...s,smtpUser:e.target.value}))}/></div>
                    <div className="fg"><label className="fl">SMTP Password</label><input type="password" className="fi" value={settings.smtpPass||''} onChange={e=>setSettings(s=>({...s,smtpPass:e.target.value}))}/></div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-hdr"><h3>🔑 Security</h3></div>
                  <div className="settings-body">
                    <div className="fg"><label className="fl">Session Timeout (hours)</label><input type="number" className="fi" value={settings.sessionTimeout||''} onChange={e=>setSettings(s=>({...s,sessionTimeout:e.target.value}))}/></div>
                    <div className="fg chk-row"><label className="chk-label"><input type="checkbox" checked={settings.enforceStrongPasswords||false} onChange={e=>setSettings(s=>({...s,enforceStrongPasswords:e.target.checked}))}/>Enforce Strong Passwords</label></div>
                    <div className="fg chk-row"><label className="chk-label"><input type="checkbox" checked={settings.logAllActions||false} onChange={e=>setSettings(s=>({...s,logAllActions:e.target.checked}))}/>Log All Admin Actions</label></div>
                  </div>
                </div>
              </div>
              <div className="settings-save"><button className="btn btn-primary" onClick={saveSettings}>💾 Save All Settings</button></div>
            </div>
          )}

        </div>{/* /ap-content */}
      </div>{/* /ap-main */}

      {/* ─── MODALS ─── */}
      {productModal!==null&&<ProductModal initial={productModal._id?productModal:null} onSave={()=>{setProductModal(null);fetchProducts();fetchStats();}} onClose={()=>setProductModal(null)}/>}
      {couponModal!==null&&<CouponModal initial={couponModal._id?couponModal:null} onSave={()=>{setCouponModal(null);fetchCoupons();}} onClose={()=>setCouponModal(null)}/>}
      {userDetail&&<UserDetailModal userId={userDetail} onClose={()=>setUserDetail(null)} onRefresh={fetchUsers}/>}
      {emailImportOrder&&<EmailImportModal order={emailImportOrder} onClose={()=>setEmailImportOrder(null)} onDone={()=>{fetchOrders();fetchStats();}}/>}
      {fileUploadOrder&&<FileUploadModal order={fileUploadOrder} onClose={()=>setFileUploadOrder(null)} onDone={()=>{fetchOrders();fetchStats();}}/>}
      {viewEmailsOrder&&<ViewEmailsModal order={viewEmailsOrder} onClose={()=>setViewEmailsOrder(null)}/>}
    </div>
  );
}
