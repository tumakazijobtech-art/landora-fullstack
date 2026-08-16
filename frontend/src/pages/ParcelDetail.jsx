import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import MediaTabs from '../components/MediaTabs.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import RainfallHistory from '../components/RainfallHistory.jsx';
import WishlistButton from '../components/WishlistButton.jsx';
import ShareMenu from '../components/ShareMenu.jsx';
import ApplyLeaseWizard from '../components/ApplyLeaseWizard.jsx';
import WaitlistModal from '../components/WaitlistModal.jsx';
import CountdownTimer, { ApplicantCount } from '../components/UrgencyBadges.jsx';
import { ShieldIcon } from '../components/Icons.jsx';

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

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function ParcelDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [parcel, setParcel] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyType, setApplyType] = useState('lease');
  const [applySuccess, setApplySuccess] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const applyRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api
      .getParcel(id)
      .then((data) => setParcel(data.parcel))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function goToApply(type = 'lease') {
    if (!user) {
      navigate('/login');
      return;
    }
    setApplyType(type);
    setApplyOpen(true);
    setTimeout(() => applyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  }

  function handleApplySuccess(application, type) {
    setApplySuccess(
      type === 'prebooking'
        ? "You're booked in. We'll reach out as soon as this parcel opens for leasing."
        : 'Application sent. The landowner will review it and respond.'
    );
    setApplyOpen(false);
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;
  if (error) return <div className="section"><div className="section-inner"><div className="error-box">{error}</div></div></div>;
  if (!parcel) return null;

  const kf = parcel.keyFacts;
  const tv = parcel.titleVerification;
  const pr = parcel.productivityReport;
  const map = parcel.mapData;
  const video = parcel.videoWalkthrough;
  const canApply = parcel.status === 'available' && (!user || user.role === 'farmer');
  const canPreBook = parcel.status !== 'available' && parcel.status !== 'leased' && parcel.preBookingEnabled !== false && (!user || user.role === 'farmer');
  const totalAcres = parcel.totalAcres || kf?.acreageTotal || parcel.sizeAcres;

  return (
    <div className="section parcel-detail-section">
      <div className="section-inner">
        <div className="parcel-topbar">
          <div className="parcel-breadcrumb">
            <Link to="/marketplace">Marketplace</Link>
            <span className="crumb-sep">/</span>
            <span>{parcel.county} County</span>
          </div>
          <div className="parcel-topbar-actions">
            <WishlistButton parcelId={parcel._id} variant="icon" />
            <ShareMenu
              title={`${parcel.title} · Landora`}
              text={`${parcel.title} in ${parcel.county} County on Landora.`}
              url={window.location.href}
            />
            {shareStatus && <span className="share-toast">{shareStatus}</span>}
          </div>
        </div>

        <div className="parcel-title-row">
          <div>
            <span className={`listing-tag listing-tag-${parcel.status}`}>
              {parcel.status === 'available' ? 'Available to lease' : parcel.status.replace('_', ' ')}
            </span>
            <h1 className="parcel-h1">{parcel.title}</h1>
            <div className="parcel-meta-line">
              {parcel.reference && <span>Property ID {parcel.reference}</span>}
              <span>{parcel.sizeAcres} acres</span>
              {parcel.season && <span>{parcel.season}</span>}
              {parcel.location && <span>{parcel.location}</span>}
            </div>
            {(parcel.status === 'available' || parcel.leaseDeadline) && (
              <div className="urgency-row" style={{ marginTop: 10 }}>
                <ApplicantCount count={parcel.applicantCount} maxApplicants={parcel.maxApplicants} size="md" />
                <CountdownTimer deadline={parcel.leaseDeadline} compact />
              </div>
            )}
          </div>
          {parcel.score && (
            <div className="parcel-title-score">
              <ScoreBadge score={parcel.score} size="md" />
              <div className="parcel-title-score-label">Plot rating</div>
            </div>
          )}
        </div>

        <MediaTabs
          photos={parcel.photos}
          altPrefix={parcel.title}
          video={video}
          posterFallback={parcel.photos && parcel.photos[0]}
          map={map}
          county={parcel.county}
          location={parcel.location}
        />

        <div className="parcel-layout">
          <div className="parcel-main">
            {parcel.description && (
              <div className="panel">
                <div className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>About this parcel</div>
                <p style={{ color: 'var(--s700)', whiteSpace: 'pre-wrap' }}>{parcel.description}</p>
              </div>
            )}

            {parcel.highlights && parcel.highlights.length > 0 && (
              <div className="panel">
                <div className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Highlights</div>
                <ul className="highlight-list">
                  {parcel.highlights.map((h, i) => (
                    <li key={i}>
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <circle cx="10" cy="10" r="10" fill="var(--g100)" />
                        <path d="M6 10.2l2.5 2.5L14 7.5" stroke="var(--g700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key facts, plus landowner identity and land title verification — checked
                against the Ministry of Lands' Ardhisasa portal, or via a manual search
                when a parcel isn't yet reachable there. */}
            {kf || parcel.titleVerification ? (
              <div className="panel">
                <div className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Key facts</div>
                <div className="kv-table">
                  <div className="kv-row"><span>Acreage available</span><strong>{parcel.sizeAcres} acres of {totalAcres} total</strong></div>
                  <div className="kv-row"><span>Listed rate</span><strong>KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} per ac per season</strong></div>
                  {kf?.suggestedCrop && <div className="kv-row"><span>Suggested crop</span><strong>{kf.suggestedCrop}</strong></div>}
                  {kf?.waterAccessDetail && <div className="kv-row"><span>Water access</span><strong>{kf.waterAccessDetail}</strong></div>}
                  {kf?.tenure && <div className="kv-row"><span>Tenure</span><strong>{kf.tenure}</strong></div>}
                  {kf?.financingDetail && <div className="kv-row"><span>Financing</span><strong>{kf.financingDetail}</strong></div>}
                  {kf?.insuranceDetail && <div className="kv-row"><span>Insurance</span><strong>{kf.insuranceDetail}</strong></div>}
                </div>
                {tv && tv.status === 'verified' && (
                  <div className="verified-strip">
                    <span className="verified-shield"><ShieldIcon size={16} /></span>
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
              <div className="info-box">
                Key facts for this parcel are being verified by our GIS engine and field team and will appear here shortly.
              </div>
            )}

            {/* Land productivity report — generated by the GIS + actuarial engine. */}
            {pr && (
              <div className="panel">
                <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Land productivity report</div>
                <div style={{ fontSize: 13, color: 'var(--s500)', marginBottom: 16 }}>
                  Generated by the GIS and actuarial engine from rainfall records, vegetation indices, soil data, elevation
                  models and road network data. This is the same report the landowner received at listing.
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
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>
                      Rainfall history at this parcel, {pr.rainfallHistory.length} recent seasons
                    </div>
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

            {(canApply || canPreBook) && (
              <div className="panel" ref={applyRef}>
                {applySuccess ? (
                  <div className="info-box" style={{ marginBottom: 0 }}>{applySuccess}</div>
                ) : !applyOpen ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    {canApply ? (
                      <button className="btn-green" onClick={() => goToApply('lease')}>Apply to lease this parcel</button>
                    ) : (
                      <button className="btn-green" onClick={() => goToApply('prebooking')}>Pre book this parcel</button>
                    )}
                    <button className="btn-outline-green" onClick={() => setWaitlistOpen(true)}>Message the landowner</button>
                  </div>
                ) : (
                  <>
                    <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>
                      {applyType === 'prebooking' ? 'Pre book this parcel' : 'Lease application'}
                    </div>
                    <div className="card-sub">
                      {applyType === 'prebooking'
                        ? `Reserve ${parcel.title} ahead of its next season.`
                        : `Sent directly to the landowner for ${parcel.title}.`}
                    </div>
                    <ApplyLeaseWizard
                      parcel={parcel}
                      user={user}
                      type={applyType}
                      onSuccess={handleApplySuccess}
                      onCancel={() => setApplyOpen(false)}
                    />
                  </>
                )}
                {!applySuccess && (
                  <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--s100)' }}>
                    <div style={{ fontSize: 13, color: 'var(--s500)', marginBottom: 10 }}>Not ready to apply, or this parcel is not quite right?</div>
                    <button type="button" className="btn-outline-green" onClick={() => setWaitlistOpen(true)}>Join the land waitlist instead</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="parcel-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-price-label">Lease rate</div>
              <div className="sidebar-price">
                KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()}
                <span>per acre, per season</span>
              </div>

              <div className="sidebar-divider" />

              <div className="sidebar-rows">
                <div className="sidebar-row"><span>Available</span><strong>{parcel.sizeAcres} of {totalAcres} acres</strong></div>
                <div className="sidebar-row"><span>Land use</span><strong>{parcel.crop}</strong></div>
                <div className="sidebar-row"><span>Status</span><span className={`status-pill status-${parcel.status}`}>{parcel.status.replace('_', ' ')}</span></div>
              </div>

              {(parcel.financingAvailable || parcel.insured || parcel.waterAccess || (parcel.tags && parcel.tags.length > 0)) && (
                <ul className="sidebar-bullets">
                  {parcel.financingAvailable && <li>Financing available for a qualifying tenant farmer</li>}
                  {parcel.insured && <li>Covered by the licensed weather insurance partner</li>}
                  {parcel.waterAccess && <li>Water access confirmed on the ground</li>}
                  {parcel.tags && parcel.tags.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}

              {parcel.owner && (
                <div className="sidebar-owner">
                  {parcel.owner.profilePicture ? (
                    <img className="sidebar-owner-avatar sidebar-owner-avatar-img" src={parcel.owner.profilePicture} alt={parcel.owner.name} />
                  ) : (
                    <div className="sidebar-owner-avatar">{initials(parcel.owner.name)}</div>
                  )}
                  <div>
                    <div className="sidebar-owner-name">{parcel.owner.name}</div>
                    <div className="sidebar-owner-sub">Verified landowner{parcel.owner.county ? ` · ${parcel.owner.county}` : ''}</div>
                  </div>
                </div>
              )}

              {canApply && !applySuccess && (
                <div className="sidebar-cta-group">
                  <button className="btn-green" onClick={() => goToApply('lease')}>Apply to lease this parcel</button>
                  <button className="btn-outline-green" onClick={() => setWaitlistOpen(true)}>Message the landowner</button>
                </div>
              )}
              {canPreBook && !applySuccess && (
                <div className="sidebar-cta-group">
                  <button className="btn-green" onClick={() => goToApply('prebooking')}>Pre book this parcel</button>
                  <div style={{ fontSize: 12, color: 'var(--s500)', marginTop: 8, textAlign: 'center' }}>
                    Not currently listed for lease. Reserve your place for the next season.
                  </div>
                </div>
              )}
              {applySuccess && <div className="info-box" style={{ marginTop: 4, marginBottom: 0 }}>{applySuccess}</div>}

              {user && user.role === 'landowner' && parcel.owner && (
                <Link className="btn-outline-green" to="/dashboard" style={{ marginTop: 14, display: 'block', textAlign: 'center' }}>Go to your dashboard</Link>
              )}
              {user && user.role === 'admin' && (
                <Link className="btn-outline-green" to={`/admin/parcels/${parcel._id}`} style={{ marginTop: 14, display: 'block', textAlign: 'center' }}>Edit this listing (admin)</Link>
              )}

              {parcel.reference && <div className="sidebar-note">Property ID {parcel.reference}</div>}
            </div>
          </aside>
        </div>
      </div>
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} parcelId={null} parcelTitle={parcel.title} />
    </div>
  );
}
