import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PricingCalculator from '../components/PricingCalculator.jsx';

const TAG_OPTIONS = ['Financing', 'Insured', 'River access', 'Road access', 'Borehole', 'Export zone'];

const EMPTY = {
  title: '', reference: '', county: '', location: '', sizeAcres: '', pricePerAcrePerSeason: '',
  crop: '', season: '', description: '', photos: '', tags: [],
  financingAvailable: false, insured: false, waterAccess: false,
  leaseDeadline: '', preBookingEnabled: true,
};

export default function CreateParcel() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [landUses, setLandUses] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.landUses().then((data) => {
      setLandUses(data.landUses);
      if (data.landUses.length > 0) setForm((f) => ({ ...f, crop: f.crop || data.landUses[0].name }));
    }).catch(() => setLandUses([]));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleTag(tag) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  const photoCount = form.photos.split(',').map((s) => s.trim()).filter(Boolean).length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (photoCount > 6) {
      setError('You can add up to 6 photos per listing.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        sizeAcres: parseFloat(form.sizeAcres),
        pricePerAcrePerSeason: parseFloat(form.pricePerAcrePerSeason),
        photos: form.photos.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6),
      };
      await api.createParcel(payload, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">List your land</div>
        <h2 className="section-h2">New parcel listing</h2>
        <div className="panel" style={{ maxWidth: 640 }}>
          <div className="info-box">
            Once you publish, our GIS engine and field team verify the parcel and add the key facts,
            productivity report, boundary map, and a video walkthrough, usually within a few days.
            You'll see those appear on your listing automatically.
          </div>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div className="field">
                <label>Title</label>
                <input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Kamau Farm Upper Block" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>County</label>
                  <input required value={form.county} onChange={(e) => update('county', e.target.value)} />
                </div>
                <div className="field">
                  <label>Location / area</label>
                  <input required value={form.location} onChange={(e) => update('location', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Size (acres)</label>
                  <input required type="number" step="0.1" min="0.1" value={form.sizeAcres} onChange={(e) => update('sizeAcres', e.target.value)} />
                </div>
                <div className="field">
                  <label>Price (KES per acre per season)</label>
                  <input required type="number" step="1" min="0" value={form.pricePerAcrePerSeason} onChange={(e) => update('pricePerAcrePerSeason', e.target.value)} />
                </div>
              </div>

              <PricingCalculator
                county={form.county}
                crop={form.crop}
                waterAccess={form.waterAccess}
                financingAvailable={form.financingAvailable}
                onApply={(price) => update('pricePerAcrePerSeason', String(price))}
              />

              <div className="field-row">
                <div className="field">
                  <label>Land use</label>
                  <select required value={form.crop} onChange={(e) => update('crop', e.target.value)}>
                    {landUses.length === 0 && <option value="">No land uses configured yet</option>}
                    {landUses.map((lu) => <option key={lu._id} value={lu.name}>{lu.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Season</label>
                  <input value={form.season} onChange={(e) => update('season', e.target.value)} placeholder="e.g. Long rains 2026" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Planting season deadline</label>
                  <input
                    type="date"
                    value={form.leaseDeadline}
                    onChange={(e) => update('leaseDeadline', e.target.value)}
                  />
                  <div style={{ fontSize: 12, color: 'var(--s500)', marginTop: 4 }}>
                    Optional. The listing comes off the board on its own once this date passes.
                  </div>
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" checked={form.preBookingEnabled} onChange={(e) => update('preBookingEnabled', e.target.checked)} />
                    Allow pre booking ahead of the next season
                  </label>
                </div>
              </div>
              <div className="field">
                <label>Parcel reference (optional, we'll generate one if left blank)</label>
                <input value={form.reference} onChange={(e) => update('reference', e.target.value)} />
              </div>
              <div className="field">
                <label>Photo URLs, comma separated (up to 6, these auto slide on your listing)</label>
                <input value={form.photos} onChange={(e) => update('photos', e.target.value)} placeholder="https://..., https://..." />
                <div style={{ fontSize: 12, color: photoCount > 6 ? '#A3392A' : 'var(--s500)', marginTop: 4 }}>
                  {photoCount} / 6 photos
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
              </div>
              <div className="field">
                <label>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TAG_OPTIONS.map((tag) => (
                    <span
                      key={tag}
                      className={`filter-badge ${form.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" checked={form.financingAvailable} onChange={(e) => update('financingAvailable', e.target.checked)} id="financingAvailable" />
                <label htmlFor="financingAvailable" style={{ margin: 0 }}>Financing available for this parcel</label>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" checked={form.insured} onChange={(e) => update('insured', e.target.checked)} id="insured" />
                <label htmlFor="insured" style={{ margin: 0 }}>Insurance available for this parcel</label>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" checked={form.waterAccess} onChange={(e) => update('waterAccess', e.target.checked)} id="waterAccess" />
                <label htmlFor="waterAccess" style={{ margin: 0 }}>This parcel has water access</label>
              </div>
            </div>
            <button className="btn-green" type="submit" disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish listing'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
