import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyAccount() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const email = searchParams.get('email') || location.state?.email || '';
  const purpose = searchParams.get('purpose') || location.state?.purpose || 'signup';
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) setError('This verification link is missing the account email.');
  }, [email]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const data = await api.confirmVerification({ email, emailCode, phoneCode, purpose });
      login(data.token, data.user);
      navigate(data.user.role === 'landowner' ? '/dashboard' : data.user.role === 'admin' ? '/admin' : '/marketplace');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const data = await api.resendVerification({ email, purpose });
      setNotice(`New codes sent. They expire in ${Math.round(data.verification.expiresInSeconds / 60)} minutes.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-mark">L</div>
        <div className="section-eyebrow">Two-channel check</div>
        <h1 className="card-title">Confirm it’s really you</h1>
        <p className="card-sub">
          Enter the separate codes sent to your email and phone. Both are required before you continue.
        </p>
        <div className="verification-destination">
          <span>Account</span>
          <strong>{email || 'your Landora account'}</strong>
        </div>
        {error && <div className="error-box">{error}</div>}
        {notice && <div className="info-box">{notice}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="emailCode">Email verification code</label>
            <input id="emailCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, ''))} placeholder="6 digits" />
          </div>
          <div className="field">
            <label htmlFor="phoneCode">Phone verification code</label>
            <input id="phoneCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ''))} placeholder="6 digits" />
          </div>
          <button className="btn-green" type="submit" disabled={submitting || !email}>
            {submitting ? 'Checking codes…' : 'Verify and continue'}
          </button>
        </form>
        <button className="text-button" type="button" onClick={resend} disabled={resending || !email}>
          {resending ? 'Sending new codes…' : 'Resend both codes'}
        </button>
        <Link className="auth-back-link" to="/login">Back to log in</Link>
      </div>
    </div>
  );
}