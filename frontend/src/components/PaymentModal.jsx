import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldIcon } from './Icons.jsx';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90 * 1000;

// Generic "Pay with M-Pesa" modal used for every fee in the business model —
// transaction commission, land verification, digital lease contracts, and
// subscriptions. Pass a `type` (and optional `tier`, `applicationId`/`parcelId`);
// the fee amount itself is never computed here — the backend derives it from the
// live admin fee settings and returns it once the STK push is sent, so this
// component never has to know the current price of anything.
//
// title/description are shown before the user enters their number; onSuccess fires
// once the payment record flips to "success" so the parent can refresh its data.
export default function PaymentModal({ open, onClose, type, tier, applicationId, parcelId, county, crop, title, description, onSuccess }) {
  const { token, user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [stage, setStage] = useState('form'); // form | pushing | waiting | success | failed
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const pollTimer = useRef(null);
  const pollDeadline = useRef(0);

  useEffect(() => {
    if (!open) {
      clearInterval(pollTimer.current);
      setStage('form');
      setPayment(null);
      setError('');
    }
    return () => clearInterval(pollTimer.current);
  }, [open]);

  if (!open) return null;

  function stopPolling() {
    clearInterval(pollTimer.current);
    pollTimer.current = null;
  }

  function pollStatus(paymentId) {
    pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
    pollTimer.current = setInterval(async () => {
      try {
        const data = await api.getPaymentStatus(paymentId, token);
        setPayment(data.payment);
        if (data.payment.status === 'success') {
          stopPolling();
          setStage('success');
          onSuccess && onSuccess(data.payment);
        } else if (data.payment.status === 'failed' || data.payment.status === 'cancelled') {
          stopPolling();
          setStage('failed');
          setError(data.payment.resultDesc || 'The payment was not completed.');
        } else if (Date.now() > pollDeadline.current) {
          stopPolling();
          setStage('failed');
          setError('We did not receive a confirmation in time. If you completed the prompt, check My payments shortly — it may still arrive.');
        }
      } catch (err) {
        // Transient network hiccup — keep polling until the deadline.
        if (Date.now() > pollDeadline.current) {
          stopPolling();
          setStage('failed');
          setError(err.message);
        }
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStage('pushing');
    try {
      const data = await api.initiatePayment(
        { type, tier, applicationId, parcelId, county, crop, phone },
        token
      );
      setPayment(data.payment);
      setStage('waiting');
      pollStatus(data.payment._id);
    } catch (err) {
      setError(err.message);
      setStage('form');
    }
  }

  function handleClose() {
    stopPolling();
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={handleClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose} aria-label="Close">×</button>
        <div className="match-icon"><ShieldIcon size={20} /></div>
        <div className="card-title" style={{ marginBottom: 4 }}>{title || 'Pay with M-Pesa'}</div>
        {description && <div className="card-sub" style={{ maxWidth: 460 }}>{description}</div>}

        {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}

        {(stage === 'form' || stage === 'pushing') && (
          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            <label htmlFor="mpesa-phone" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              M-Pesa phone number
            </label>
            <input
              id="mpesa-phone"
              type="tel"
              required
              placeholder="07XXXXXXXX"
              value={phone}
              disabled={stage === 'pushing'}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', marginBottom: 14 }}
            />
            <button type="submit" className="btn-primary" disabled={stage === 'pushing'} style={{ width: '100%' }}>
              {stage === 'pushing' ? 'Sending prompt…' : 'Send M-Pesa prompt'}
            </button>
          </form>
        )}

        {stage === 'waiting' && (
          <div style={{ marginTop: 16 }}>
            <div className="info-box">
              Check {payment?.phone || phone} — enter your M-Pesa PIN on the prompt to complete this payment
              {payment?.amount ? ` of KES ${Number(payment.amount).toLocaleString()}` : ''}.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--s500)' }}>
              <span className="spinner" aria-hidden="true" />
              Waiting for confirmation…
            </div>
          </div>
        )}

        {stage === 'success' && (
          <div className="info-box" style={{ marginTop: 16 }}>
            Payment received{payment?.mpesaReceiptNumber ? ` — M-Pesa receipt ${payment.mpesaReceiptNumber}` : ''}.
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn-primary" onClick={handleClose}>Done</button>
            </div>
          </div>
        )}

        {stage === 'failed' && (
          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn-outline-green" onClick={() => setStage('form')}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
