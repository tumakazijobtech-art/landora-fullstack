import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ParcelDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [parcel, setParcel] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ intendedCrop: '', seasonsRequested: 1, message: '' });
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getParcel(id)
      .then((data) => setParcel(data.parcel))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApply(e) {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setApplyError('');
    setSubmitting(true);
    try {
      await api.applyToParcel({ parcelId: id, ...applyForm }, token);
      setApplySuccess('Application sent. The landowner will review it and respond.');
      setApplyOpen(false);
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;
  if (error) return <div className="section"><div className="section-inner"><div className="error-box">{error}</div></div></div>;
  if (!parcel) return null;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">{parcel.location}, {parcel.county} County</div>
        <h2 className="section-h2">{parcel.title}</h2>
        <p className="section-sub">
          {parcel.reference && `Parcel reference ${parcel.reference} · `}
          {parcel.sizeAcres} acres available{parcel.season ? ` · ${parcel.season}` : ''}
          {parcel.owner && ` · Listed by ${parcel.owner.name}`}
        </p>

        {parcel.photos && parcel.photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
            {parcel.photos.map((src, i) => (
              <img key={i} src={src} alt={`${parcel.title} photo ${i + 1}`} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12 }} />
            ))}
          </div>
        )}

        <div className="panel" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Price</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--g700)' }}>
                KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--s500)' }}>per ac / season</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Crop</div>
              <div style={{ fontWeight: 600 }}>{parcel.crop}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Size</div>
              <div style={{ fontWeight: 600 }}>{parcel.sizeAcres} acres</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Status</div>
              <span className={`status-pill status-${parcel.status}`}>{parcel.status.replace('_', ' ')}</span>
            </div>
          </div>
          {parcel.tags && parcel.tags.length > 0 && (
            <div className="parcel-tags" style={{ marginTop: 16 }}>
              {parcel.tags.map((t) => <span className="parcel-tag" key={t}>{t}</span>)}
            </div>
          )}
        </div>

        {parcel.description && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>About this parcel</div>
            <p style={{ color: 'var(--s700)', whiteSpace: 'pre-wrap' }}>{parcel.description}</p>
          </div>
        )}

        {applySuccess && <div className="info-box">{applySuccess}</div>}

        {parcel.status === 'available' && (!user || user.role === 'farmer') && !applySuccess && (
          <div className="panel">
            {!applyOpen ? (
              <button className="btn-green" onClick={() => (user ? setApplyOpen(true) : navigate('/login'))}>
                Apply for this parcel
              </button>
            ) : (
              <form onSubmit={handleApply}>
                <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Lease application</div>
                <div className="card-sub">Sent directly to the landowner for {parcel.title}.</div>
                {applyError && <div className="error-box">{applyError}</div>}
                <div className="field-group">
                  <div className="field">
                    <label>Intended crop</label>
                    <input
                      value={applyForm.intendedCrop}
                      onChange={(e) => setApplyForm((f) => ({ ...f, intendedCrop: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Seasons requested</label>
                    <input
                      type="number" min={1} max={20}
                      value={applyForm.seasonsRequested}
                      onChange={(e) => setApplyForm((f) => ({ ...f, seasonsRequested: parseInt(e.target.value, 10) || 1 }))}
                    />
                  </div>
                  <div className="field">
                    <label>Message to landowner</label>
                    <textarea
                      rows={4}
                      value={applyForm.message}
                      onChange={(e) => setApplyForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-green" type="submit" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Send application'}
                  </button>
                  <button className="btn-outline-green" type="button" onClick={() => setApplyOpen(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        {user && user.role === 'landowner' && (
          <div style={{ marginTop: 20 }}>
            <Link className="btn-outline-green" to="/dashboard">Go to your dashboard</Link>
          </div>
        )}
      </div>
    </div>
  );
}
