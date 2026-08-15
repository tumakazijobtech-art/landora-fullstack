import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.login({ email, password });
      if (data.requiresVerification) {
        navigate(`/verify?email=${encodeURIComponent(email)}&purpose=signin`, { state: { email, purpose: 'signin' } });
        return;
      }
      login(data.token, data.user);
      navigate(data.user.role === 'landowner' ? '/dashboard' : '/marketplace');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section">
      <div className="card">
        <div className="card-title">Log in</div>
        <div className="card-sub">Welcome back to Landora.</div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <div className="field">
              <label>Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <button className="btn-green" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <span>New to Landora? <Link to="/register">Create an account</Link></span>
        </div>
      </div>
    </div>
  );
}
