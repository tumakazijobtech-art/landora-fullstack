import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COUNTIES, LOGO_URL } from '../constants.js';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'farmer', phone: '', county: '', profilePicture: '', agreedToTerms: false,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.agreedToTerms) {
      setError('You must agree to the Terms & Conditions and Privacy Policy to create an account');
      return;
    }
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
              <label>County</label>
              <select required value={form.county} onChange={(e) => update('county', e.target.value)}>
                <option value="">Select your county</option>
                {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Profile picture URL (optional)</label>
              <input
                value={form.profilePicture}
                onChange={(e) => update('profilePicture', e.target.value)}
                placeholder="https://... — leave blank to use the Landora logo"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                {form.profilePicture ? (
                  <img src={form.profilePicture} alt="Profile preview" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--s100)' }} />
                ) : (
                  <img src={LOGO_URL} alt="Default Landora avatar" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--s100)' }} />
                )}
                <span style={{ fontSize: 11.5, color: 'var(--s500)' }}>Preview — this shows up in your navbar and dashboard</span>
              </div>
            </div>
          </div>
          <div className="checkbox-row" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              id="agreedToTerms"
              checked={form.agreedToTerms}
              onChange={(e) => update('agreedToTerms', e.target.checked)}
              required
              style={{ marginTop: 3 }}
            />
            <label htmlFor="agreedToTerms" style={{ margin: 0 }}>
              I agree to Landora's <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>
            </label>
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
