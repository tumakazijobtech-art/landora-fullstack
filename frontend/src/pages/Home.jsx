import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import InteractiveHeroBackground from '../components/InteractiveHeroBackground.jsx';
import LandoraTour from '../components/LandoraTour.jsx';

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <div className="hero hero-centered">
        <InteractiveHeroBackground />
        <div className="hero-inner">
          <div className="hero-eyebrow">Land leasing, seen from every angle</div>
          <h1 className="hero-h1">A better way to lease productive land.</h1>
          <p className="hero-sub">
            Find and secure agricultural land with confidence — GIS-backed listings, secure digital
            leases, weather-smart insurance, and everything you need to make every season count.
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" to="/marketplace">Explore available land</Link>
            {!user && <Link className="btn-ghost" to="/register">List your land</Link>}
          </div>
          <div className="hero-proof-row">
            <span><strong>✓</strong> GIS-verified listings</span>
            <span><strong>✓</strong> Protected leases</span>
            <span><strong>✓</strong> Licensed insurance partner</span>
          </div>
        </div>

        {/* Live-styled preview of the Land Productivity Report every listing carries —
            built as real markup (not a screenshot) so the numbers can change with the
            season without anyone touching an image file. */}
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-report-card">
            <div className="hero-report-head">
              <div>
                <div className="hero-report-eyebrow">Land productivity report</div>
                <div className="hero-report-loc">Subukia, Nakuru County · 4.5 ac</div>
              </div>
              <span className="hero-report-badge">A+</span>
            </div>
            <div className="hero-report-metrics">
              <div className="hero-report-metric"><span>Soil quality</span><div className="hero-report-bar"><i style={{ width: '88%' }} /></div></div>
              <div className="hero-report-metric"><span>Rainfall reliability</span><div className="hero-report-bar"><i style={{ width: '81%' }} /></div></div>
              <div className="hero-report-metric"><span>Market access</span><div className="hero-report-bar"><i style={{ width: '74%' }} /></div></div>
              <div className="hero-report-metric"><span>Historical yield</span><div className="hero-report-bar"><i style={{ width: '90%' }} /></div></div>
            </div>
            <div className="hero-report-foot">
              <div>
                <div className="hero-report-rate-label">Fair lease rate · maize season</div>
                <div className="hero-report-rate">KES 18,200 <span>/ acre</span></div>
              </div>
              <span className="hero-report-cta">Tap the report to see why →</span>
            </div>
          </div>
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
                Farmers search parcels by county, size, and crop. Landowners publish a listing in minutes.
              </div>
            </div>
            <div className="panel">
              <div className="step-number">02</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Apply with context</div>
              <div style={{ color: 'var(--s500)', fontSize: 13 }}>
                Walk through the evidence, ask the right questions, and apply directly on the parcel you want.
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
      <div className="footer">Landora — every listing on this site comes from a real account.</div>
    </div>
  );
}
