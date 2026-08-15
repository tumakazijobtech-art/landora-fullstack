import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { COUNTIES, WITHIN_OPTIONS } from '../constants.js';

const EMPTY = {
  near: 'Nairobi',
  withinKm: '20',
  minSize: '',
  maxSize: '',
  landUse: '',
  maxPrice: '',
  waterAccess: false,
};

export default function LandoraMatch({ open, onClose, onMatch }) {
  const [landUses, setLandUses] = useState([]);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) api.landUses().then((data) => setLandUses(data.landUses)).catch(() => setLandUses([]));
  }, [open]);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onMatch({
      match: 'true',
      near: form.near,
      withinKm: form.withinKm,
      minSize: form.minSize,
      maxSize: form.maxSize,
      crop: form.landUse,
      maxPrice: form.maxPrice,
      waterAccess: form.waterAccess ? 'true' : '',
    });
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="match-icon">⌕</div>
        <div className="card-title" style={{ marginBottom: 4 }}>Landora Match</div>
        <div className="card-sub" style={{ maxWidth: 460 }}>
          Set what you need once. Landora's recommender engine scores and ranks every verified
          parcel against it — so instead of a plain filter, you get a personalised match
          percentage and the reasons behind it.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label>Near</label>
              <select value={form.near} onChange={(e) => update('near', e.target.value)}>
                {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Within</label>
              <select value={form.withinKm} onChange={(e) => update('withinKm', e.target.value)}>
                {WITHIN_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Acres, minimum</label>
              <input type="number" min="0" step="0.5" value={form.minSize} onChange={(e) => update('minSize', e.target.value)} />
            </div>
            <div className="field">
              <label>Acres, maximum</label>
              <input type="number" min="0" step="0.5" value={form.maxSize} onChange={(e) => update('maxSize', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Land use</label>
            <select value={form.landUse} onChange={(e) => update('landUse', e.target.value)}>
              <option value="">Any agricultural use</option>
              {landUses.map((lu) => <option key={lu._id} value={lu.name}>{lu.name}</option>)}
            </select>
          </div>

          <div className="field-row" style={{ alignItems: 'end' }}>
            <div className="field">
              <label>Budget, KES per acre per season, maximum</label>
              <input type="number" min="0" step="500" value={form.maxPrice} onChange={(e) => update('maxPrice', e.target.value)} />
            </div>
            <div className="checkbox-row" style={{ paddingBottom: 12 }}>
              <input
                type="checkbox"
                id="matchWaterAccess"
                checked={form.waterAccess}
                onChange={(e) => update('waterAccess', e.target.checked)}
              />
              <label htmlFor="matchWaterAccess" style={{ margin: 0 }}>Water access required</label>
            </div>
          </div>

          <button className="btn-match" type="submit">Find my matches</button>
        </form>
      </div>
    </div>
  );
}
