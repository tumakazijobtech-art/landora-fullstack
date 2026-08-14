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
  const [slide, setSlide] = useState(0);

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
  useEffect(() => {
    if (!parcel?.photos?.length) return undefined;
    const photoCount = Math.min(parcel.photos.length, 6);
    const timer = setInterval(() => setSlide((s) => (s + 1) % photoCount), 5000);
    return () => clearInterval(timer);
  }, [parcel]);

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

  if (loading) return <div className="section"><div className="section-inner"><div className="skeleton-block" /></div></div>;
  if (error) return <div className="section"><div className="section-inner"><div className="error-box">{error}</div></div></div>;
  if (!parcel) return null;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">{parcel.location}, {parcel.county} County · {parcel.reference || 'Reference pending'}</div>
        <h2 className="section-h2">{parcel.title}</h2>
        <p className="section-sub">
          {parcel.reference && `Parcel reference ${parcel.reference} · `}
          {parcel.sizeAcres} acres available{parcel.season ? ` · ${parcel.season}` : ''}
          {parcel.owner && ` · Listed by ${parcel.owner.name}`}
        </p>

        {parcel.photos?.length > 0 ? <div className="detail-slider"><img src={parcel.photos[slide % Math.min(parcel.photos.length, 6)]} alt={`${parcel.title} view ${(slide % Math.min(parcel.photos.length, 6)) + 1}`} /><div className="slider-controls"><button onClick={() => setSlide((slide - 1 + parcel.photos.length) % Math.min(parcel.photos.length, 6))} aria-label="Previous photo">←</button><span>{(slide % Math.min(parcel.photos.length, 6)) + 1} / {Math.min(parcel.photos.length, 6)}</span><button onClick={() => setSlide((slide + 1) % Math.min(parcel.photos.length, 6))} aria-label="Next photo">→</button></div></div> : <div className="detail-placeholder">Land photos will be added during review.</div>}

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="facts-grid">
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Price</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--g700)' }}>
                KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--s500)' }}>per ac / season</span>
              </div>
            </div>
            <div><div className="fact-label">Land use</div><div className="fact-value">{parcel.landUse || 'Under review'}</div></div>
            <div><div className="fact-label">Plot rating</div><div className="fact-value">{parcel.plotRating != null ? `${Number(parcel.plotRating).toFixed(1)} / 5` : 'Not rated yet'}</div></div>
            <div><div className="fact-label">Landora match</div><div className="fact-value">{parcel.matchScore != null ? `${parcel.matchScore}%` : 'Personalise your match'}</div></div>
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
        <div className="verification-grid">
          <div className="verification-callout"><strong>Verification status</strong><span>{parcel.status === 'available' ? 'Available for applications' : (parcel.status || 'Review in progress').replace('_', ' ')}</span><small>Landora publishes evidence as it is reviewed, not as a promise.</small></div>
          <div className="panel"><div className="fact-label">Verified key facts</div>{parcel.keyFacts?.length ? <ul className="facts-list">{parcel.keyFacts.map((fact, index) => <li key={`${fact.label || fact}-${index}`}><span>{fact.label || 'Reviewed note'}</span><strong>{fact.value || fact}</strong></li>)}</ul> : <p className="muted">Key facts are added by the internal review team.</p>}{parcel.keyFactsVerified && <small className="verified-text">Verified by {parcel.keyFactsVerifiedBy || 'GIS Engine + human intelligence'}</small>}</div>
        </div>
        <div className="evidence-strip"><strong>Evidence & sources</strong><span>{parcel.ministryVerification?.status === 'verified' ? `Ministry title verified via ${parcel.ministryVerification.method}` : 'Ministry verification pending'}</span><span>{parcel.gisReportStatus === 'completed' ? 'GIS report completed' : 'GIS report pending'}</span>{parcel.ministryVerification?.reference && <span>Ref {parcel.ministryVerification.reference}</span>}</div>
        <section className="panel evidence-section">
          <div className="section-eyebrow">GIS evidence</div>
          <h3>Parcel map and boundary</h3>
          {parcel.parcelMapUrl ? <img className="parcel-map" src={parcel.parcelMapUrl} alt={`GIS parcel map for ${parcel.title}`} /> : <div className="map-placeholder"><strong>GIS Land Productivity Report Engine</strong><span>The parcel map is added after the landowner submission is reviewed.</span></div>}
          <p className="muted">{parcel.parcelMapSource || 'Boundary source will be recorded by the internal GIS review team.'}</p>
        </section>
        {parcel.videoUrl && <section className="panel evidence-section"><div className="section-eyebrow">Walkthrough</div><h3>See the parcel in context</h3><video className="walkthrough-video" controls preload="metadata" src={parcel.videoUrl}>Your browser cannot play this walkthrough.</video><a className="text-link" href={parcel.videoUrl} target="_blank" rel="noreferrer">Open walkthrough in a new tab</a></section>}

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
