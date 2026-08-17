import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LOGO_URL } from '../constants.js';
import PaymentModal from '../components/PaymentModal.jsx';

export default function LandownerDashboard() {
  const { token, user } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeParcel, setActiveParcel] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Which paid action is currently open in the payment modal, e.g.
  // { type: 'verification', tier: 'basic', parcelId } or { type: 'lease_contract', tier: 'professional', applicationId }.
  const [payAction, setPayAction] = useState(null);

  function loadParcels() {
    return api.myParcels(token).then((data) => setParcels(data.parcels));
  }

  function loadApplications(parcelId) {
    return api.receivedApplications(token, parcelId).then((data) => setApplications(data.applications));
  }

  function loadPayments() {
    return api.myPayments(token).then((data) => setPayments(data.payments));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadParcels(), loadApplications(), loadPayments()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hasSuccessfulPayment(type, matchField, id) {
    return payments.some((p) => p.type === type && p.status === 'success' && p[matchField]?._id === id);
  }

  async function handleFilterByParcel(id) {
    setActiveParcel(id);
    try {
      await loadApplications(id || undefined);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Landowner dashboard</div>
            <h2 className="section-h2" style={{ marginBottom: 0 }}>Your listings</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link className="dash-profile-chip" to="/profile" title="Edit your profile picture">
              <img src={user.profilePicture || LOGO_URL} alt="" />
              <span>Edit profile photo</span>
            </Link>
            <Link className="btn-green" to="/parcels/new">+ New listing</Link>
          </div>
        </div>
        {error && <div className="error-box">{error}</div>}

        {parcels.length === 0 ? (
          <div className="empty-state">
            You haven't listed any land yet. <Link to="/parcels/new">Create your first listing</Link>.
          </div>
        ) : (
          <div className="panel" style={{ marginBottom: 32, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcel</th><th>County</th><th>Size</th><th>Price / ac / season</th><th>Status</th><th>Applications</th><th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((p) => (
                  <tr key={p._id}>
                    <td style={{ cursor: 'pointer' }} onClick={() => handleFilterByParcel(p._id)}>{p.title}</td>
                    <td>{p.county}</td>
                    <td>{p.sizeAcres} ac</td>
                    <td>KES {Number(p.pricePerAcrePerSeason).toLocaleString()}</td>
                    <td><span className={`status-pill status-${p.status}`}>{p.status.replace('_', ' ')}</span></td>
                    <td>{p.applicationCount}</td>
                    <td>
                      {p.titleVerification?.status === 'verified' ? (
                        <span className="status-pill status-accepted">Verified</span>
                      ) : hasSuccessfulPayment('verification', 'parcel', p._id) ? (
                        <span className="status-pill status-pending">Verification in progress</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setPayAction({ type: 'verification', tier: 'basic', parcelId: p._id, parcelTitle: p.title })}>
                            Basic
                          </button>
                          <button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setPayAction({ type: 'verification', tier: 'premium', parcelId: p._id, parcelTitle: p.title })}>
                            Premium
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-h2" style={{ marginBottom: 0, fontSize: 22 }}>
            Applications received {activeParcel ? '(filtered)' : ''}
          </h2>
          {activeParcel && (
            <button className="btn-outline-green" onClick={() => handleFilterByParcel(null)}>Show all</button>
          )}
        </div>
        <div className="info-box" style={{ marginBottom: 20 }}>
          The Landora team reviews and qualifies every applicant on your behalf. You can see who has applied
          and their status here. Accepting or declining is handled by our team once an applicant is verified.
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">No applications yet for this filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applications.map((a) => (
              <div className="panel" key={a._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {a.farmer?.profilePicture ? (
                      <img src={a.farmer.profilePicture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="sidebar-owner-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {(a.farmer?.name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.farmer?.name} · {a.parcel?.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--s500)' }}>
                        {a.farmer?.phone && `${a.farmer.phone} · `}{a.farmer?.email}
                      </div>
                    </div>
                  </div>
                  <span className={`status-pill status-${a.status}`}>{a.status}</span>
                </div>
                {a.intendedCrop && <div style={{ fontSize: 13, marginTop: 8 }}>Intended crop: {a.intendedCrop}</div>}
                {a.seasonsRequested && <div style={{ fontSize: 13 }}>Seasons requested: {a.seasonsRequested}</div>}
                {a.message && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--s700)' }}>"{a.message}"</div>}
                {a.landownerNote && (
                  <div style={{ fontSize: 13, marginTop: 8, color: 'var(--s700)' }}>Landora team note: {a.landownerNote}</div>
                )}
                {a.status === 'accepted' && (
                  hasSuccessfulPayment('lease_contract', 'application', a._id) ? (
                    <div className="info-box" style={{ marginTop: 12, marginBottom: 0 }}>
                      Digital lease contract generated for this lease.
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-outline-green"
                        onClick={() => setPayAction({ type: 'lease_contract', tier: 'basic', applicationId: a._id, parcelTitle: a.parcel?.title })}>
                        Generate basic lease contract
                      </button>
                      <button type="button" className="btn-outline-green"
                        onClick={() => setPayAction({ type: 'lease_contract', tier: 'professional', applicationId: a._id, parcelTitle: a.parcel?.title })}>
                        Generate professional lease package
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentModal
        open={!!payAction}
        onClose={() => setPayAction(null)}
        type={payAction?.type}
        tier={payAction?.tier}
        applicationId={payAction?.applicationId}
        parcelId={payAction?.parcelId}
        title={
          payAction?.type === 'verification'
            ? `${payAction?.tier === 'premium' ? 'Premium' : 'Basic'} land verification`
            : 'Digital lease contract'
        }
        description={
          payAction?.type === 'verification'
            ? `Have Landora verify ${payAction?.parcelTitle || 'this listing'} — ownership, boundaries, and risk flags. The amount is shown once the M-Pesa prompt is sent.`
            : `Generate a standardized digital lease agreement for ${payAction?.parcelTitle || 'this lease'}. The amount is shown once the M-Pesa prompt is sent.`
        }
        onSuccess={() => {
          loadPayments().catch((err) => setError(err.message));
        }}
      />
    </div>
  );
}
