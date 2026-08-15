import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LightHeroBackground from '../components/LightHeroBackground.jsx';
import LandoraTour from '../components/LandoraTour.jsx';

function CheckDot({ light }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={light ? 'dot-light' : ''}>
      <circle cx="12" cy="12" r="11" fill={light ? 'rgba(255,255,255,.16)' : 'var(--g100)'} />
      <path d="M7.5 12.5l3 3 6-6.5" stroke={light ? '#fff' : 'var(--g600)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldDot() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V5l7-3z" fill="var(--g100)" stroke="var(--g600)" strokeWidth="1.3" /></svg>;
}
function DocDot() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" fill="var(--g100)" stroke="var(--g600)" strokeWidth="1.3" /><path d="M8.5 9h7M8.5 13h7M8.5 17h4" stroke="var(--g600)" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}

export default function Home() {
  const { user } = useAuth();
  const [flipped, setFlipped] = useState(false);

  return (
    <div>
      <div className="hero hero-light">
        <LightHeroBackground />
        <div className="hero-inner">
          <h1 className="hero-h1">A simpler way to accessing productive land</h1>
          <p className="hero-sub">
            Landora makes it easier to find and secure agricultural land, with verified parcels,
            transparent pricing, secure digital leases, weather protection and the resources you
            need to make every season count.
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" to="/marketplace">Find land to farm</Link>
            {!user && <Link className="btn-ghost" to="/register">List your land</Link>}
          </div>
          <div className="hero-trust-label">Why farmers and landowners trust us</div>
          <div className="hero-trust-badges">
            <span className="hero-trust-chip"><CheckDot />Verified land titles only</span>
            <span className="hero-trust-chip"><ShieldDot />Weather protected leases</span>
            <span className="hero-trust-chip"><DocDot />Legally enforceable contracts</span>
            <span className="hero-trust-chip"><ShieldDot />Licensed insurance partner</span>
          </div>
        </div>

        {/* Live-styled preview of the Land Productivity Report every listing carries —
            built as real markup (not a screenshot) so the numbers can change with the
            season without anyone touching an image file. Click or tap to flip it and see
            what actually feeds the score. */}
        <div className="hero-visual">
          <button
            type="button"
            className={`hero-report-flip ${flipped ? 'is-flipped' : ''}`}
            onClick={() => setFlipped((f) => !f)}
            aria-label="Flip the sample productivity report to see what's behind the score"
          >
            <div className="hero-report-flip-inner">
              <div className="hero-report-card hero-report-face hero-report-front">
                <div className="hero-report-head">
                  <div>
                    <div className="hero-report-eyebrow">Land productivity report</div>
                    <div className="hero-report-loc">Subukia, Nakuru County · 4.5 ac</div>
                  </div>
                  <span className="hero-report-badge">B+</span>
                </div>
                <div className="hero-report-metrics">
                  <div className="hero-report-metric"><span>Soil quality</span><div className="hero-report-bar"><i style={{ width: '84%' }} /></div></div>
                  <div className="hero-report-metric"><span>Rainfall reliability</span><div className="hero-report-bar"><i style={{ width: '78%' }} /></div></div>
                  <div className="hero-report-metric"><span>Market access</span><div className="hero-report-bar"><i style={{ width: '71%' }} /></div></div>
                  <div className="hero-report-metric"><span>Historical yield</span><div className="hero-report-bar"><i style={{ width: '80%' }} /></div></div>
                </div>
                <div className="hero-report-foot">
                  <div>
                    <div className="hero-report-rate-label">Fair lease rate · maize season</div>
                    <div className="hero-report-rate">KES 18,200 to 21,500 <span>/ ac</span></div>
                  </div>
                </div>
                <div className="hero-report-tap">Tap the report to see what is behind the score</div>
              </div>

              <div className="hero-report-card hero-report-face hero-report-back">
                <div className="hero-report-back-eyebrow">Behind the score</div>
                <div className="hero-report-back-title">A report you act on.</div>
                <div className="hero-report-back-sub">
                  This sample report turns signals behind a parcel score into a decision, before
                  any money moves or a lease is signed.
                </div>
                <ul className="hero-report-back-list">
                  <li><CheckDot light />Soil, rainfall and access signals in one view</li>
                  <li><CheckDot light />Fair rate guidance from comparable parcels</li>
                  <li><CheckDot light />A verified record both parties can trust</li>
                </ul>
                <div className="hero-report-back-note">Sample report · Subukia, Nakuru</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <LandoraTour />

      <div className="section home-steps-section">
        <div className="section-inner">
          <div className="section-eyebrow">The Landora rhythm</div>
          <h2 className="section-h2">From first look to signed lease</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
            <div className="panel">
              <div className="step-number">01</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Browse or list</div>
              <div style={{ color: 'var(--s500)', fontSize: 13 }}>
                Farmers search parcels by county, size and crop. Landowners publish a listing in minutes.
              </div>
            </div>
            <div className="panel">
              <div className="step-number">02</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Apply with context</div>
              <div style={{ color: 'var(--s500)', fontSize: 13 }}>
                Walk through the evidence, ask the right questions and apply directly on the parcel you want.
              </div>
            </div>
            <div className="panel">
              <div className="step-number">03</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Accept and lease</div>
              <div style={{ color: 'var(--s500)', fontSize: 13 }}>
                Landowners review applications and accept the one that fits.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer">Landora: every listing on this site comes from a real account.</div>
    </div>
  );
}
