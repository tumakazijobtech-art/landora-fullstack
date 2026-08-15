import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'farmer', phone: '', county: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.register(form);
      if (data.requiresVerification) {
        navigate(`/verify?email=${encodeURIComponent(form.email)}&purpose=signup`, { state: { email: form.email, purpose: 'signup' } });
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
        <div className="card-title">Create your account</div>
        <div className="card-sub">Join as a farmer looking to lease, or a landowner listing land.</div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <div className="field">
              <label>I am a</label>
              <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                <option value="farmer">Farmer / tenant</option>
                <option value="landowner">Landowner</option>
              </select>
            </div>
            <div className="field">
              <label>Full name</label>
              <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input required minLength={8} type="password" value={form.password} onChange={(e) => update('password', e.target.value)} />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="07XX XXX XXX" />
            </div>
            <div className="field">
              <label>County (optional)</label>
              <input value={form.county} onChange={(e) => update('county', e.target.value)} />
            </div>
          </div>
          <button className="btn-green" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--s500)' }}>
           Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
