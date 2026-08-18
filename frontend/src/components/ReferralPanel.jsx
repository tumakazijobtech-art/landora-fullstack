import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const statusLabel = {
  submitted: 'Submitted',
  contacted: 'Partner in contact',
  approved: 'Approved',
  declined: 'Declined',
  disbursed: 'Completed',
};

// Embedded in both the farmer and landowner dashboards — Landora doesn't lend or
// underwrite anything itself, it just connects the user to a partner and tracks the
// introduction. No M-Pesa payment here: the partner pays Landora a commission
// off-platform once a referral converts (recorded by an admin).
export default function ReferralPanel() {
  const { token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [requesting, setRequesting] = useState(null); // partner being requested, or null
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    return Promise.all([api.referralPartners(undefined, token), api.myReferrals(token)]).then(([p, r]) => {
      setPartners(p.partners);
      setReferrals(r.referrals);
    });
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestedFor(partnerId) {
    return referrals.find((r) => r.partner?._id === partnerId);
  }

  async function submitRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.createReferral({ partnerId: requesting._id, note }, token);
      setRequesting(null);
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (partners.length === 0) return null;

  const financing = partners.filter((p) => p.type === 'financing');
  const insurance = partners.filter((p) => p.type === 'insurance');

  const partnerCard = (p) => {
    const existing = requestedFor(p._id);
    return (
      <div className="panel" key={p._id} style={{ padding: 14 }}>
        <div style={{ fontWeight: 600 }}>{p.name}</div>
        {p.description && <div style={{ fontSize: 13, color: 'var(--s600)', marginTop: 4 }}>{p.description}</div>}
        {existing ? (
          <span className="status-pill status-pending" style={{ marginTop: 10, display: 'inline-block' }}>
            {statusLabel[existing.status] || existing.status}
          </span>
        ) : (
          <button type="button" className="btn-outline-green" style={{ marginTop: 10, padding: '4px 10px', fontSize: 12 }}
            onClick={() => { setRequesting(p); setNote(''); }}>
            Request introduction
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>Financing &amp; insurance</div>
      <p className="card-sub" style={{ marginBottom: 12 }}>
        Get connected to a lending or insurance partner. Landora introduces you — the partner handles the rest.
      </p>
      {error && <div className="error-box">{error}</div>}

      {financing.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--s700)', margin: '10px 0 6px' }}>Financing</div>
          <div className="fee-settings-grid" style={{ marginBottom: 10 }}>{financing.map(partnerCard)}</div>
        </>
      )}
      {insurance.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--s700)', margin: '10px 0 6px' }}>Insurance</div>
          <div className="fee-settings-grid">{insurance.map(partnerCard)}</div>
        </>
      )}

      {requesting && (
        <div className="modal-scrim" onClick={() => setRequesting(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRequesting(null)} aria-label="Close">×</button>
            <div className="card-title" style={{ marginBottom: 4 }}>Request introduction: {requesting.name}</div>
            <p className="card-sub">We'll pass your contact details and note along to {requesting.name}.</p>
            <form onSubmit={submitRequest}>
              <label htmlFor="referral-note" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                What do you need? (optional)
              </label>
              <textarea
                id="referral-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', marginBottom: 14 }}
              />
              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
