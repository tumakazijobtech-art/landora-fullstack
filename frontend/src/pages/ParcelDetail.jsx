import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ImageSlider from '../components/ImageSlider.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import ParcelMap from '../components/ParcelMap.jsx';
import RainfallHistory from '../components/RainfallHistory.jsx';

const METRIC_LABELS = {
  soilQuality: 'Soil quality',
  rainfallReliability: 'Rainfall reliability',
  marketAccess: 'Market access',
  historicalYield: 'Historical yield',
};

function MetricBar({ label, value }) {
  if (value == null) return null;
  return (
    <div className="metric-row">
      <div className="metric-label">{label}</div>
      <div className="metric-track"><div className="metric-fill" style={{ width: `${value}%` }} /></div>
      <div className="metric-value">{value}%</div>
    </div>
  );
}

function StatCard({ label, value, note }) {
  if (!value) return null;
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

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
    setLoading(true);
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

  const kf = parcel.keyFacts;
  const tv = parcel.titleVerification;
  const pr = parcel.productivityReport;
  const map = parcel.mapData;
  const video = parcel.videoWalkthrough;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">{parcel.county} County</div>
        <h2 className="section-h2" style={{ marginBottom: 6 }}>{parcel.title}</h2>
        <p className="section-sub">
          {parcel.reference && `Parcel reference ${parcel.reference} · `}
          {parcel.sizeAcres} acres available{parcel.season ? ` · ${parcel.season}` : ''}
          {parcel.owner && ` · Listed by ${parcel.owner.name}, verified landowner`}
        </p>

        <div className="detail-media" style={{ marginBottom: 24 }}>
          <ImageSlider images={parcel.photos} altPrefix={parcel.title} />
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Price</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--g700)' }}>
                KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--s500)' }}>per ac / season</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Land use</div>
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
            {parcel.score && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--s500)', marginBottom: 4 }}>Plot rating</div>
                <ScoreBadge score={parcel.score} size="md" />
              </div>
            )}
          </div>
          {parcel.tags && parcel.tags.length > 0 && (
            <div className="parcel-tags" style={{ marginTop: 16 }}>
              {parcel.tags.map((t) => <span className="parcel-tag" key={t}>{t}</span>)}
              {parcel.financingAvailable && <span className="parcel-tag">Financing</span>}
              {parcel.insured && <span className="parcel-tag">Insured</span>}
              {parcel.waterAccess && <span className="parcel-tag">Water access</span>}
            </div>
          )}
        </div>

        {parcel.description && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>About this parcel</div>
            <p style={{ color: 'var(--s700)', whiteSpace: 'pre-wrap' }}>{parcel.description}</p>
          </div>
        )}

        {/* Key facts, plus landowner identity and land title verification — checked
            against the Ministry of Lands' Ardhisasa portal, or via a manual search
            when a parcel isn't yet reachable there. */}
        {kf || parcel.titleVerification ? (
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Key facts</div>
            <div className="kv-table">
              <div className="kv-row"><span>Acreage available</span><strong>{parcel.sizeAcres} acres of {parcel.totalAcres || kf?.acreageTotal || parcel.sizeAcres} total</strong></div>
              <div className="kv-row"><span>Listed rate</span><strong>KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} per ac per season</strong></div>
              {kf?.suggestedCrop && <div className="kv-row"><span>Suggested crop</span><strong>{kf.suggestedCrop}</strong></div>}
              {kf?.waterAccessDetail && <div className="kv-row"><span>Water access</span><strong>{kf.waterAccessDetail}</strong></div>}
              {kf?.tenure && <div className="kv-row"><span>Tenure</span><strong>{kf.tenure}</strong></div>}
              {kf?.financingDetail && <div className="kv-row"><span>Financing</span><strong>{kf.financingDetail}</strong></div>}
              {kf?.insuranceDetail && <div className="kv-row"><span>Insurance</span><strong>{kf.insuranceDetail}</strong></div>}
            </div>
            {tv && tv.status === 'verified' && (
              <div className="verified-strip">
                <span className="verified-shield">🛡</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Landowner identity and title verified</div>
                  <div style={{ fontSize: 12, color: 'var(--g700)' }}>
                    {[
                      tv.landownerNameOnTitle || parcel.owner?.name,
                      tv.method === 'manual' ? 'Manually checked with the Lands Ministry' : 'Ardhisasa checked',
                      tv.disbursementRecordLabel,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )}
            {tv && tv.status === 'pending' && (
              <div className="info-box" style={{ marginTop: 16, marginBottom: 0 }}>
                Title verification with the Lands Ministry (Ardhisasa) is in progress for this parcel.
              </div>
            )}
            {tv && tv.status === 'flagged' && (
              <div className="error-box" style={{ marginTop: 16, marginBottom: 0 }}>
                Our title check flagged something on this parcel that needs to be resolved before it can be leased.
                {tv.notes ? ` ${tv.notes}` : ''}
              </div>
            )}
          </div>
        ) : (
          <div className="info-box" style={{ marginBottom: 24 }}>
            Key facts for this parcel are being verified by our GIS engine and field team and will appear here shortly.
          </div>
        )}

        {/* Parcel map — sourced from the GIS Land Productivity Report engine. */}
        {map && (
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Parcel map and boundary</div>
            <ParcelMap mapData={map} />
          </div>
        )}

        {/* Video walkthrough — added internally after the base listing is submitted. */}
        {video && video.url && (
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Video walkthrough</div>
            <div className="video-frame">
              <video controls poster={parcel.photos && parcel.photos[0]} src={video.url} />
              {video.durationLabel && <span className="video-duration">{video.durationLabel}</span>}
            </div>
            {video.caption && <div style={{ fontWeight: 600, fontSize: 13, marginTop: 10 }}>{video.caption}</div>}
            <div style={{ fontSize: 13, color: 'var(--s500)', marginTop: 4 }}>
              Watching the full walkthrough is recommended before you apply. It shows the parcel condition, boundary markers, and access route exactly as they are on the ground.
            </div>
          </div>
        )}

        {/* Land productivity report — generated by the GIS + actuarial engine. */}
        {pr && (
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Land productivity report</div>
            <div style={{ fontSize: 13, color: 'var(--s500)', marginBottom: 16 }}>
              Generated by the GIS and actuarial engine from rainfall records, vegetation indices, soil data, elevation
              models, and road network data. This is the same report the landowner received at listing.
            </div>

            {(pr.scoreLabel || parcel.score) && (
              <div className="score-hero">
                <div className="score-hero-letter">{pr.scoreLabel || parcel.score}</div>
                <div style={{ fontSize: 12, color: 'var(--s500)' }}>
                  Parcel score{parcel.reference ? ` · ${parcel.reference}` : ''}{parcel.location ? ` · ${parcel.location}` : ''}
                </div>
                {(pr.rateRangeMin || pr.rateRangeMax) && (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>
                      KES {Number(pr.rateRangeMin).toLocaleString()} to {Number(pr.rateRangeMax).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>Fair market lease rate per acre per season, {parcel.crop}</div>
                  </>
                )}
              </div>
            )}

            {pr.metrics && (
              <div style={{ marginTop: 20, marginBottom: 20 }}>
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <MetricBar key={key} label={label} value={pr.metrics[key]} />
                ))}
              </div>
            )}

            <div className="stat-grid">
              <StatCard label="Soil classification" value={pr.soilClassification} note={pr.soilNote} />
              <StatCard label="Average seasonal rainfall" value={pr.avgSeasonalRainfall} note={pr.rainfallNote} />
              <StatCard label="Vegetation health, NDVI" value={pr.vegetationHealth} note={pr.vegetationNote} />
              <StatCard label="Elevation and terrain" value={pr.elevationTerrain} note={pr.terrainNote} />
              <StatCard label="Market access" value={pr.marketAccessSummary} note={pr.marketAccessNote} />
              <StatCard label="Demand signal" value={pr.demandSignal} note={pr.demandNote} />
              <StatCard label="Comparable parcels nearby" value={pr.comparableParcels} note={pr.comparableNote} />
              <StatCard label="Previous crop rotation" value={pr.previousCropRotation} note={pr.cropRotationNote} />
              <StatCard label="Water access" value={pr.waterAccessSummary} note={pr.waterAccessNote} />
            </div>

            {pr.rainfallHistory && pr.rainfallHistory.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Five season rainfall history at this parcel</div>
                <RainfallHistory seasons={pr.rainfallHistory} />
              </div>
            )}

            {pr.agronomicNotes && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Agronomic notes</div>
                <p style={{ color: 'var(--s700)', fontSize: 14, whiteSpace: 'pre-wrap' }}>{pr.agronomicNotes}</p>
              </div>
            )}
          </div>
        )}

        {applySuccess && <div className="info-box">{applySuccess}</div>}

        {parcel.status === 'available' && (!user || user.role === 'farmer') && !applySuccess && (
          <div className="panel">
            {!applyOpen ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <button className="btn-green" onClick={() => (user ? setApplyOpen(true) : navigate('/login'))}>
                  Apply to lease this parcel
                </button>
                <button className="btn-outline-green" onClick={() => (user ? setApplyOpen(true) : navigate('/login'))}>
                  Message the landowner
                </button>
              </div>
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
            <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--s100)' }}>
              <div style={{ fontSize: 13, color: 'var(--s500)', marginBottom: 10 }}>Not ready to apply, or this parcel isn't quite right?</div>
              <Link className="btn-outline-green" to="/marketplace">Join the land waitlist instead</Link>
            </div>
          </div>
        )}

        {user && user.role === 'landowner' && parcel.owner && (
          <div style={{ marginTop: 20 }}>
            <Link className="btn-outline-green" to="/dashboard">Go to your dashboard</Link>
          </div>
        )}
        {user && user.role === 'admin' && (
          <div style={{ marginTop: 20 }}>
            <Link className="btn-outline-green" to={`/admin/parcels/${parcel._id}`}>Edit this listing (admin)</Link>
          </div>
        )}
      </div>
    </div>
  );
}
