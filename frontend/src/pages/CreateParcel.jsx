import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const TAG_OPTIONS = ['Financing', 'Insured', 'River access', 'Road access', 'Borehole', 'Export zone'];

const EMPTY = {
  title: '', reference: '', county: '', location: '', sizeAcres: '', pricePerAcrePerSeason: '',
  crop: '', season: '', landUse: '', description: '', photos: '', tags: [], financingAvailable: false, insured: false,
};

export default function CreateParcel() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [landUseOptions, setLandUseOptions] = useState([]);

  useEffect(() => {
    api.getLandUseOptions().then((data) => setLandUseOptions(data.options || [])).catch(() => {});
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        sizeAcres: parseFloat(form.sizeAcres),
        pricePerAcrePerSeason: parseFloat(form.pricePerAcrePerSeason),
        photos: form.photos.split(',').map((s) => s.trim()).filter(Boolean),
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
              <div className="field">
                <label>Land use</label>
                <input list="land-use-options" value={form.landUse} onChange={(e) => update('landUse', e.target.value)} placeholder="e.g. crop farming, grazing" />
                <datalist id="land-use-options">{landUseOptions.map((option) => <option key={option} value={option} />)}</datalist>
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
              <div className="field-row">
                <div className="field">
                  <label>Crop</label>
                  <input required value={form.crop} onChange={(e) => update('crop', e.target.value)} placeholder="e.g. Maize" />
                </div>
                <div className="field">
                  <label>Season</label>
                  <input value={form.season} onChange={(e) => update('season', e.target.value)} placeholder="e.g. Long rains 2026" />
                </div>
              </div>
              <div className="field">
                <label>Parcel reference (optional)</label>
                <input value={form.reference} onChange={(e) => update('reference', e.target.value)} />
              </div>
              <div className="info-box">You only need to provide the basics here. GIS evidence, verified key facts and a walkthrough video are added during Landora’s internal review.</div>
              <div className="field">
                <label>Photo URLs (comma separated, optional)</label>
                <input value={form.photos} onChange={(e) => update('photos', e.target.value)} placeholder="https://..., https://..." />
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
