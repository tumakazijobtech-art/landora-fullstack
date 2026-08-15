import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import ParcelCard from '../components/ParcelCard.jsx';
import LandoraMatch from '../components/LandoraMatch.jsx';
import { COUNTIES } from '../constants.js';

const DEFAULT_FILTERS = {
  county: '', crop: '', search: '', financingAvailable: '', insured: '',
  minScore: '', near: '', withinKm: '', minSize: '', maxSize: '', maxPrice: '', waterAccess: '',
};

export default function Marketplace() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [landUses, setLandUses] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchOpen, setMatchOpen] = useState(false);
  const [matched, setMatched] = useState(false);

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
    setMatched(true);
    setMatchOpen(false);
    setFilters((f) => ({ ...DEFAULT_FILTERS, ...matchFilters }));
  }

  function clearMatch() {
    setMatched(false);
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Find land</div>
        <h2 className="section-h2">Available parcels {filters.season ? '' : 'this season'}</h2>

        <div className="match-banner">
          <div className="match-banner-icon">⌕</div>
          <div className="match-banner-text">
            <div className="match-banner-title">Not sure which parcel fits, or would rather not browse manually?</div>
            <div className="match-banner-sub">Set your requirements once and let Landora Match rank every verified parcel for you.</div>
          </div>
          <button className="btn-match" onClick={() => setMatchOpen(true)}>⌕ Use Landora Match</button>
        </div>

        {matched && (
          <div className="info-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>Showing parcels ranked against your Landora Match requirements.</span>
            <button className="btn-outline-green" onClick={clearMatch}>Clear match</button>
          </div>
        )}

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

        {error && <div className="error-box">{error}</div>}
        {loading && <div>Loading parcels…</div>}
        {!loading && parcels.length === 0 && !error && (
          <div className="empty-state">
            No listings match these filters yet. Try widening your search, or check back soon —
            new parcels are added as landowners list them.
          </div>
        )}
        <div className="parcels-grid">
          {parcels.map((p) => (
            <ParcelCard key={p._id} parcel={p} />
          ))}
        </div>
      </div>

      <LandoraMatch open={matchOpen} onClose={() => setMatchOpen(false)} onMatch={handleMatch} />
    </div>
  );
}
