import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForgotPassword() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', phone: '', emailCode: '', phoneCode: '', newPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [developmentCodes, setDevelopmentCodes] = useState(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function requestReset(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const data = await api.requestPasswordReset({ email: form.email, phone: form.phone });
      setDevelopmentCodes(data.reset?.developmentCodes || null);
      setNotice('If those details match an account, both reset codes have been sent. Enter both below.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const data = await api.resetPassword(form);
      login(data.token, data.user);
      navigate(data.user.role === 'landowner' ? '/dashboard' : data.user.role === 'admin' ? '/admin' : '/marketplace');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-mark">L</div>
        <div className="section-eyebrow">Account recovery</div>
        <h1 className="card-title">Reset your password</h1>
        <p className="card-sub">
          Landora checks both your email and phone so a lost password never becomes a lost lease.
        </p>
        {error && <div className="error-box">{error}</div>}
        {notice && <div className="info-box">{notice}</div>}
        {developmentCodes && (
          <div className="dev-code-box">
            <strong>Local development codes</strong>
            <span>Email: {developmentCodes.email}</span>
            <span>Phone: {developmentCodes.phone}</span>
          </div>
        )}
        {step === 1 ? (
          <form onSubmit={requestReset}>
            <div className="field">
              <label htmlFor="resetEmail">Account email</label>
              <input id="resetEmail" required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="resetPhone">Account phone number</label>
              <input id="resetPhone" required type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="07XX XXX XXX" />
            </div>
            <button className="btn-green" type="submit" disabled={submitting}>
              {submitting ? 'Sending codes…' : 'Send both reset codes'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <div className="field">
              <label htmlFor="resetEmailCode">Email reset code</label>
              <input id="resetEmailCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.emailCode} onChange={(event) => update('emailCode', event.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="field">
              <label htmlFor="resetPhoneCode">Phone reset code</label>
              <input id="resetPhoneCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.phoneCode} onChange={(event) => update('phoneCode', event.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <input id="newPassword" required minLength={8} type="password" value={form.newPassword} onChange={(event) => update('newPassword', event.target.value)} />
            </div>
            <button className="btn-green" type="submit" disabled={submitting}>
              {submitting ? 'Updating password…' : 'Set new password'}
            </button>
            <button className="text-button" type="button" onClick={() => setStep(1)}>Use different account details</button>
          </form>
        )}
        <Link className="auth-back-link" to="/login">Back to log in</Link>
      </div>
    </div>
  );
}