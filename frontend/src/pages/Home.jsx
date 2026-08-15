import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import InteractiveHeroBackground from '../components/InteractiveHeroBackground.jsx';

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <div className="hero">
        <InteractiveHeroBackground />
        <div className="hero-inner">
          <div className="hero-eyebrow">Land leasing, done properly</div>
          <h1 className="hero-h1">Lease farmland with confidence.</h1>
          <p className="hero-sub">
            Landora connects farmers with verified landowners across Kenya. Browse real listings,
            apply for a lease, and manage everything in one place.
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" to="/marketplace">Browse available parcels</Link>
            {!user && <Link className="btn-ghost" to="/register">List your land</Link>}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-inner">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-h2">Three steps to a signed lease</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
            <div className="panel">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>1. Browse or list</div>
              <div style={{ color: 'var(--s500)', fontSize: 13 }}>
                Farmers search parcels by county, size, and crop. Landowners publish a listing in minutes.
              </div>
            </div>
            <div className="panel">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>2. Apply</div>
              <div style={{ color: 'var(--s500)', fontSize: 13 }}>
                Farmers submit a lease application directly on the parcel they want.
              </div>
            </div>
            <div className="panel">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>3. Accept and lease</div>
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
