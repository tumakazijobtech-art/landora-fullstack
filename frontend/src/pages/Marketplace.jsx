import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import ParcelCard from '../components/ParcelCard.jsx';
import LandoraMatch from '../components/LandoraMatch.jsx';
import WaitlistModal from '../components/WaitlistModal.jsx';
import AIAgentWidget from '../components/AIAgentWidget.jsx';
import { COUNTIES } from '../constants.js';

const DEFAULT_FILTERS = {
  county: '', crop: '', search: '', financingAvailable: '', insured: '',
  minScore: '', near: '', withinKm: '', minSize: '', maxSize: '', maxPrice: '', waterAccess: '', match: '',
};

export default function Marketplace() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [landUses, setLandUses] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchOpen, setMatchOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const isMatchMode = filters.match === 'true';

  useEffect(() => {
    api.landUses().then((data) => setLandUses(data.landUses)).catch(() => setLandUses([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .listParcels(filters)
      .then((data) => {
        if (!cancelled) setParcels(data.parcels);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function update(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  function toggleBadge(field) {
    setFilters((f) => ({ ...f, [field]: f[field] === 'true' ? '' : 'true' }));
  }

  function toggleScore(score) {
    setFilters((f) => ({ ...f, minScore: f.minScore === score ? '' : score }));
  }

  function handleMatch(matchFilters) {
    setMatchOpen(false);
    setFilters({ ...DEFAULT_FILTERS, ...matchFilters });
  }

  function clearMatch() {
    setFilters(DEFAULT_FILTERS);
  }

  const bestMatch = isMatchMode && parcels.length > 0 ? parcels[0] : null;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Find land</div>
        <h2 className="section-h2">
          {isMatchMode ? 'Your Landora Match results' : 'Available parcels this season'}
        </h2>

        {!isMatchMode && (
          <div className="match-banner">
            <div className="match-banner-icon">⌕</div>
            <div className="match-banner-text">
              <div className="match-banner-title">Not sure which parcel fits, or would rather not browse manually?</div>
              <div className="match-banner-sub">Set your requirements once and let Landora's recommender engine rank every verified parcel for you.</div>
            </div>
            <button className="btn-match" onClick={() => setMatchOpen(true)}>⌕ Use Landora Match</button>
          </div>
        )}

        {isMatchMode && (
          <div className="match-header">
            <div>
              <div className="match-header-title">
                {loading
                  ? 'Scoring parcels against your requirements…'
                  : parcels.length > 0
                    ? `Ranked ${parcels.length} parcel${parcels.length === 1 ? '' : 's'} by fit${bestMatch ? ` — best match ${bestMatch.matchScore}%` : ''}`
                    : 'No parcels to rank yet'}
              </div>
              <div className="match-header-sub">
                Each parcel below is scored on land use, budget, acreage, distance, water access and its GIS plot
                rating — the closer to 100%, the better the fit.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-match" onClick={() => setMatchOpen(true)}>Adjust requirements</button>
              <button className="btn-outline-green" onClick={clearMatch}>Clear match</button>
            </div>
          </div>
        )}

        {!isMatchMode && (
          <div className="filter-bar">
            <select className="filter-select" value={filters.county} onChange={(e) => update('county', e.target.value)}>
              <option value="">All counties</option>
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={filters.crop} onChange={(e) => update('crop', e.target.value)}>
              <option value="">Any crop</option>
              {landUses.map((lu) => <option key={lu._id} value={lu.name}>{lu.name}</option>)}
            </select>
            <input
              className="filter-select"
              placeholder="Search listings…"
              value={filters.search}
              onChange={(e) => update('search', e.target.value)}
            />
            <span
              className={`filter-badge filter-badge-pill ${!filters.minScore && !filters.financingAvailable && !filters.insured ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, minScore: '', financingAvailable: '', insured: '' }))}
            >
              All
            </span>
            <span
              className={`filter-badge filter-badge-pill ${filters.minScore === 'A+' ? 'active' : ''}`}
              onClick={() => toggleScore('A+')}
            >
              Score A+
            </span>
            <span
              className={`filter-badge ${filters.financingAvailable === 'true' ? 'active' : ''}`}
              onClick={() => toggleBadge('financingAvailable')}
            >
              Financing available
            </span>
            <span
              className={`filter-badge ${filters.insured === 'true' ? 'active' : ''}`}
              onClick={() => toggleBadge('insured')}
            >
              Insured
            </span>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {loading && <div>Loading parcels…</div>}
        {!loading && parcels.length === 0 && !error && (
          <div className="empty-state">
            {isMatchMode
              ? 'No listings are available to rank yet. Try widening your requirements, or check back soon.'
              : 'No listings match these filters yet. Try widening your search, or check back soon — new parcels are added as landowners list them.'}
          </div>
        )}
        <div className="parcels-grid">
          {parcels.map((p) => (
            <ParcelCard key={p._id} parcel={p} />
          ))}
        </div>

        <div className="marketplace-waitlist-cta">
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Not finding the right parcel yet?</div>
            <div style={{ fontSize: 13, color: 'var(--s500)' }}>Join the waitlist and we will notify you the moment a match is listed.</div>
          </div>
          <button className="btn-outline-green" onClick={() => setWaitlistOpen(true)}>Join the waitlist</button>
        </div>
      </div>

      <LandoraMatch open={matchOpen} onClose={() => setMatchOpen(false)} onMatch={handleMatch} />
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
      <AIAgentWidget />
    </div>
  );
}
