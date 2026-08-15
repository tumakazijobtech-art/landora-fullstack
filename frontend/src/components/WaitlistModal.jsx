import React, { useState } from 'react';
import { api } from '../api.js';
import { COUNTIES } from '../constants.js';

const EMPTY = { name: '', email: '', phone: '', county: '', cropInterest: '', message: '' };

// Site wide "Join the waitlist" popup, and the per parcel pre booking form (when a
// parcelId is passed the entry is tagged as a pre booking and tied to that listing,
// otherwise it is a general waitlist signup). Submitting saves straight to the admin
// console's Waitlist tab and, when the backend has an email webhook configured,
// notifies the admin inbox too.
export default function WaitlistModal({ open, onClose, parcelId, parcelTitle }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.joinWaitlist({
        ...form,
        type: parcelId ? 'prebooking' : 'general',
        parcelId: parcelId || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(EMPTY);
    setSuccess(false);
    setError('');
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={handleClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose} aria-label="Close">×</button>
        <div className="match-icon">☰</div>
        <div className="card-title" style={{ marginBottom: 4 }}>
          {parcelId ? `Pre book ${parcelTitle || 'this parcel'}` : 'Join the Landora waitlist'}
        </div>
        <div className="card-sub" style={{ maxWidth: 460 }}>
          {parcelId
            ? 'Reserve your place on this parcel ahead of the next planting season. We will reach out as soon as it opens for leasing.'
            : "Tell us what you're looking for and we will let you know the moment a matching parcel is listed."}
        </div>

        {success ? (
          <div className="info-box" style={{ marginTop: 4, marginBottom: 0 }}>
            Thanks{form.name ? `, ${form.name.split(' ')[0]}` : ''}. You're on the list, and our team has been notified.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            <div className="field-row">
              <div className="field">
                <label>Full name</label>
                <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div className="field">
                <label>Email</label>
                <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="07..." />
              </div>
              <div className="field">
                <label>County of interest</label>
                <select value={form.county} onChange={(e) => update('county', e.target.value)}>
                  <option value="">Any county</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Crop or land use interest</label>
              <input value={form.cropInterest} onChange={(e) => update('cropInterest', e.target.value)} placeholder="e.g. Maize, horticulture" />
            </div>
            <div className="field">
              <label>Anything else we should know</label>
              <textarea rows={3} value={form.message} onChange={(e) => update('message', e.target.value)} />
            </div>
            <button className="btn-green" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : parcelId ? 'Reserve my place' : 'Join the waitlist'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
