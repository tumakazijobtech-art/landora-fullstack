import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const FIELDS = [
  'title',
  'reference',
  'county',
  'location',
  'landUse',
  'plotRating',
  'matchScore',
  'gisReportStatus',
  'parcelMapUrl',
  'parcelMapSource',
  'videoUrl',
  'keyFacts',
  'keyFactsVerifiedBy',
  'status',
  'ministryStatus',
  'ministryMethod',
  'ministryReference',
  'ministryCheckedBy',
  'ministryNotes',
];

function factLines(facts = []) {
  return facts
    .map((fact) => (typeof fact === 'string' ? fact : `${fact.label}: ${fact.value}`))
    .join('\n');
}

export default function Admin() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState([]);
  const [newUse, setNewUse] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    return api.adminListParcels(token)
      .then((data) => setRows(data.parcels || []))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    api.adminGetOptions(token)
      .then((data) => setOptions(data.landUseOptions || data.landUse || data.options || []))
      .catch(() => {});
  }, []);

  function edit(parcel) {
    const ministry = parcel.ministryVerification || {};
    setSelected(parcel);
    setForm({
      ...Object.fromEntries(FIELDS.map((key) => [key, parcel[key] ?? ''])),
      keyFacts: factLines(parcel.keyFacts),
      ministryStatus: ministry.status || 'pending',
      ministryMethod: ministry.method || 'pending',
      ministryReference: ministry.reference || '',
      ministryCheckedBy: ministry.checkedBy || '',
      ministryNotes: ministry.notes || '',
    });
    setMessage('');
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      const keyFacts = String(form.keyFacts || '')
        .split('\n')
        .map((line) => {
          const [label, ...rest] = line.split(':');
          return {
            label: label.trim() || 'Reviewed note',
            value: rest.join(':').trim() || label.trim(),
          };
        })
        .filter((fact) => fact.value);

      const payload = {
        ...form,
        plotRating: form.plotRating === '' ? null : Number(form.plotRating),
        matchScore: form.matchScore === '' ? null : Number(form.matchScore),
        keyFacts,
        keyFactsVerified: Boolean(form.keyFactsVerifiedBy),
        ministryVerification: {
          status: form.ministryStatus || 'pending',
          method: form.ministryMethod || 'pending',
          reference: form.ministryReference,
          checkedBy: form.ministryCheckedBy,
          notes: form.ministryNotes,
          checkedAt: form.ministryStatus === 'verified' ? new Date().toISOString() : undefined,
        },
      };

      await api.adminUpdateParcel(selected._id, payload, token);
      setMessage('Listing review saved.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addUse(event) {
    event.preventDefault();
    if (!newUse.trim()) return;
    try {
      const data = await api.adminAddLandUseOption({ label: newUse.trim() }, token);
      setOptions(data.landUseOptions || []);
      setNewUse('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Internal review</div>
        <h1 className="section-h2">Listing console</h1>
        <p className="section-sub">Review evidence and publish only what can be explained clearly to a farmer.</p>
        {error && <div className="error-box">{error}</div>}
        <div className="admin-layout">
          <div className="panel admin-list">
            {rows.length ? rows.map((parcel) => (
              <button
                className={`admin-row ${selected?._id === parcel._id ? 'selected' : ''}`}
                key={parcel._id}
                onClick={() => edit(parcel)}
              >
                <span>
                  <strong>{parcel.title}</strong>
                  <small>{parcel.reference || 'No reference'} · {parcel.county}</small>
                </span>
                <span className={`status-pill status-${parcel.status}`}>{parcel.status || 'pending'}</span>
              </button>
            )) : <div className="empty-state">No listings awaiting review.</div>}

            <form className="option-form" onSubmit={addUse}>
              <label htmlFor="new-land-use">Add land-use option</label>
              <div className="inline-form">
                <input id="new-land-use" value={newUse} onChange={(event) => setNewUse(event.target.value)} placeholder="e.g. Agroforestry" />
                <button className="btn-outline-green" type="submit">Add</button>
              </div>
            </form>
          </div>

          {selected && (
            <form className="panel admin-editor" onSubmit={save}>
              <div className="editor-head">
                <div>
                  <div className="section-eyebrow">Editing {selected.reference || selected._id}</div>
                  <h2>{selected.title}</h2>
                </div>
                <span className={`status-pill status-${form.status || 'under_review'}`}>{form.status || 'under review'}</span>
              </div>

              <div className="field-row">
                {['title', 'reference'].map((key) => (
                  <div className="field" key={key}>
                    <label htmlFor={`admin-${key}`}>{key}</label>
                    <input id={`admin-${key}`} value={form[key]} onChange={(event) => update(key, event.target.value)} />
                  </div>
                ))}
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="admin-rating">Plot rating (0–5)</label>
                  <input id="admin-rating" type="number" min="0" max="5" step="0.1" value={form.plotRating} onChange={(event) => update('plotRating', event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="admin-match">Landora match score (0–100)</label>
                  <input id="admin-match" type="number" min="0" max="100" value={form.matchScore} onChange={(event) => update('matchScore', event.target.value)} />
                </div>
              </div>

              <div className="field-row">
                {['county', 'location', 'landUse'].map((key) => (
                  <div className="field" key={key}>
                    <label htmlFor={`admin-${key}`}>{key}</label>
                    <input id={`admin-${key}`} list={key === 'landUse' ? 'land-uses' : undefined} value={form[key]} onChange={(event) => update(key, event.target.value)} />
                  </div>
                ))}
              </div>
              <datalist id="land-uses">{options.map((option) => <option key={option} value={option} />)}</datalist>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="admin-status">Publishing status</label>
                  <select id="admin-status" value={form.status} onChange={(event) => update('status', event.target.value)}>
                    <option value="under_review">Under review</option>
                    <option value="available">Available</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="leased">Leased</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="admin-gis-status">GIS report status</label>
                  <select id="admin-gis-status" value={form.gisReportStatus} onChange={(event) => update('gisReportStatus', event.target.value)}>
                    <option value="not_started">Not started</option>
                    <option value="queued">Queued</option>
                    <option value="completed">Completed</option>
                    <option value="needs_review">Needs review</option>
                  </select>
                </div>
              </div>

              {['parcelMapUrl', 'parcelMapSource', 'videoUrl', 'keyFactsVerifiedBy'].map((key) => (
                <div className="field" key={key}>
                  <label htmlFor={`admin-${key}`}>{key}</label>
                  <input id={`admin-${key}`} value={form[key]} onChange={(event) => update(key, event.target.value)} />
                </div>
              ))}

              <div className="field">
                <label htmlFor="admin-key-facts">Key facts, one per line as Label: Value</label>
                <textarea id="admin-key-facts" rows="5" value={form.keyFacts} onChange={(event) => update('keyFacts', event.target.value)} />
              </div>

              <div className="admin-subsection">
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="ministry-status">Ministry check status</label>
                    <select id="ministry-status" value={form.ministryStatus} onChange={(event) => update('ministryStatus', event.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="manual_review">Manual review</option>
                      <option value="not_verified">Not verified</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ministry-method">Check method</label>
                    <select id="ministry-method" value={form.ministryMethod} onChange={(event) => update('ministryMethod', event.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="Ardhisasa">Ardhisasa</option>
                      <option value="Manual search">Manual search</option>
                    </select>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="ministry-reference">Ministry reference</label>
                    <input id="ministry-reference" value={form.ministryReference} onChange={(event) => update('ministryReference', event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="ministry-checked-by">Checked by</label>
                    <input id="ministry-checked-by" value={form.ministryCheckedBy} onChange={(event) => update('ministryCheckedBy', event.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ministry-notes">Review notes</label>
                  <textarea id="ministry-notes" rows="3" value={form.ministryNotes} onChange={(event) => update('ministryNotes', event.target.value)} />
                </div>
              </div>

              {message && <div className="info-box">{message}</div>}
              <button className="btn-green" type="submit">Save review</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}