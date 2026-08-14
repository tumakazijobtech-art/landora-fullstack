import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ParcelCard from '../components/ParcelCard.jsx';

export default function Match() {
  const [form, setForm] = useState({ county: '', crop: '', minAcres: '', maxPrice: '', landUse: '' });
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ranked = useMemo(() => parcels.map((p) => {
    let score = Number(p.matchScore);
    if (!Number.isFinite(score)) score = 0;
    let extra = 0;
    if (form.county && p.county?.toLowerCase() === form.county.toLowerCase()) extra += 25;
    if (form.crop && p.crop?.toLowerCase().includes(form.crop.toLowerCase())) extra += 25;
    if (form.landUse && p.landUse?.toLowerCase().includes(form.landUse.toLowerCase())) extra += 20;
    if (form.minAcres && Number(p.sizeAcres) >= Number(form.minAcres)) extra += 15;
    if (form.maxPrice && Number(p.pricePerAcrePerSeason) <= Number(form.maxPrice)) extra += 15;
     const combined = score > 0 && extra > 0 ? score * 0.6 + extra * 0.4 : score || extra;
     return { ...p, matchScore: Math.min(99, Math.round(combined)) };
  }).sort((a, b) => b.matchScore - a.matchScore), [parcels, form]);
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError(''); setSearched(true);
    try { const data = await api.listParcels({ county: form.county, crop: form.crop }); setParcels(data.parcels || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  return <main className="section match-page"><div className="section-inner">
    <div className="section-eyebrow">A considered starting point</div>
    <h1 className="section-h2">Find land that fits the way you farm.</h1>
    <p className="section-sub">Tell us what matters. We rank available parcels using Landora’s score where provided, then show exactly how your preferences influence the result.</p>
    <form className="panel match-form" onSubmit={submit}>
      <div className="field-row"><div className="field"><label>Preferred county</label><input value={form.county} onChange={e => update('county', e.target.value)} placeholder="e.g. Nakuru" /></div><div className="field"><label>Crop</label><input value={form.crop} onChange={e => update('crop', e.target.value)} placeholder="e.g. maize" /></div></div>
      <div className="field-row"><div className="field"><label>Minimum acres</label><input type="number" value={form.minAcres} onChange={e => update('minAcres', e.target.value)} /></div><div className="field"><label>Maximum KES / acre / season</label><input type="number" value={form.maxPrice} onChange={e => update('maxPrice', e.target.value)} /></div></div>
      <div className="field"><label>Land use</label><input value={form.landUse} onChange={e => update('landUse', e.target.value)} placeholder="e.g. horticulture, grazing" /></div>
      <button className="btn-green" disabled={loading}>{loading ? 'Reviewing parcels…' : 'Show my matches'}</button>
    </form>
    {error && <div className="error-box">{error}</div>}
    {searched && !loading && !ranked.length && <div className="empty-state">No available parcels matched that search. Try a wider county or budget.</div>}
    {!!ranked.length && <><div className="results-heading"><div><div className="section-eyebrow">Your shortlist</div><h2 className="section-h2">Parcels worth a closer look</h2></div><span className="muted">{ranked.length} available</span></div><div className="parcels-grid">{ranked.map(p => <ParcelCard parcel={p} key={p._id} />)}</div></>}
    {!searched && <div className="match-note"><strong>How the score works</strong><span>County, crop, size, budget and land use each contribute to a transparent preference score. Verified listings remain clearly marked.</span><Link to="/marketplace">Browse all available land →</Link></div>}
  </div></main>;
}