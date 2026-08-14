import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import ParcelCard from '../components/ParcelCard.jsx';

const COUNTIES = ['All counties', 'Nakuru', 'Nyeri', 'Uasin Gishu', 'Meru', 'Nyandarua'];
const CROPS = ['Any crop', 'Maize', 'Wheat', 'Horticulture', 'Tea', 'Potatoes'];

export default function Marketplace() {
  const [filters, setFilters] = useState({ county: '', crop: '', search: '', financingAvailable: '', insured: '' });
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Find land</div>
        <h2 className="section-h2">Available parcels</h2>
        <div className="filter-bar">
          <select className="filter-select" value={filters.county} onChange={(e) => update('county', e.target.value)}>
            {COUNTIES.map((c) => (
              <option key={c} value={c === 'All counties' ? '' : c}>{c}</option>
            ))}
          </select>
          <select className="filter-select" value={filters.crop} onChange={(e) => update('crop', e.target.value)}>
            {CROPS.map((c) => (
              <option key={c} value={c === 'Any crop' ? '' : c}>{c}</option>
            ))}
          </select>
          <input
            className="filter-select"
            placeholder="Search listings…"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
          />
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
    </div>
  );
}
