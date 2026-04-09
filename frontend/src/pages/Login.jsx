import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const { login, githubLogin, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Handle GitHub OAuth callback code
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return;
    (async () => {
      setLoading(true);
      try {
        const user = await githubLogin(code);
        navigate(user.role === 'admin' ? '/admin' : (redirect || '/products'), { replace: true });
      } catch (err) {
        setError(err.response?.data?.msg || 'GitHub login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : (redirect || '/products'));
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = () => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
    if (!clientId) return;
    const redirectUri = `${window.location.origin}/login`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  };

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const user = await googleLogin(response.credential);
      navigate(user.role === 'admin' ? '/admin' : (redirect || '/products'));
    } catch (err) {
      setError(err.response?.data?.msg || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [googleLogin, navigate, redirect]);

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    let attempts = 0;
    const init = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleResponse });
        const btnEl = document.getElementById('google-login-btn');
        if (btnEl) window.google.accounts.id.renderButton(btnEl, { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' });
      } else if (attempts < 20) {
        attempts++;
        setTimeout(init, 300);
      }
    };
    init();
  }, [handleGoogleResponse]);

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#2563EB" />
            <path d="M6 9.5L14 15.5L22 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="6" y="9" width="16" height="12" rx="2" stroke="white" strokeWidth="2" fill="none" />
          </svg>
          <h1>GlobalEmail Hub</h1>
        </div>

        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to your account to continue</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-rounded" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <div className="oauth-buttons">
          <div id="google-login-btn" className="google-btn-wrap"></div>
          {process.env.REACT_APP_GITHUB_CLIENT_ID && (
            <button type="button" className="btn btn-full btn-rounded github-btn" onClick={handleGitHub} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Sign in with GitHub
            </button>
          )}
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one →</Link>
        </p>
      </div>
    </div>
  );
}
