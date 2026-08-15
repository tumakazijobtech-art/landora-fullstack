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
          <h1 className="hero-h1">Meet the land before you lease it.</h1>
          <p className="hero-sub">
            A clearer route to productive land across Kenya. Explore real parcels, understand the
            evidence behind a listing, and make your next lease feel like an informed decision.
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" to="/marketplace">Explore available land</Link>
            {!user && <Link className="btn-ghost" to="/register">List your land</Link>}
          </div>
          <div className="hero-proof-row">
            <span><strong>01</strong> Satellite context</span>
            <span><strong>02</strong> Field evidence</span>
            <span><strong>03</strong> Lease-ready facts</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual-card hero-visual-main">
            <img src="/assets/image_1786763028438.png" alt="" />
            <div className="hero-visual-overlay">
              <span>LAND PRODUCTIVITY REPORT</span>
              <strong>See the story behind the soil.</strong>
            </div>
          </div>
          <div className="hero-visual-card hero-visual-map">
            <img src="/assets/image_1786763049012.png" alt="" />
            <span>Mapped parcel · Nakuru</span>
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
