import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLandUses() {
  const { token } = useAuth();
  const [landUses, setLandUses] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    return api.allLandUses(token).then((data) => setLandUses(data.landUses));
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await api.createLandUse({ name: name.trim(), sortOrder: landUses.length }, token);
      setName('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(landUse) {
    setError('');
    try {
      await api.updateLandUse(landUse._id, { active: !landUse.active }, token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(landUse) {
    setError('');
    try {
      await api.deleteLandUse(landUse._id, token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Admin</div>
        <h2 className="section-h2">Land use options</h2>
        <p className="section-sub">
          These power the land use dropdown on listing creation, the marketplace filter, and Landora Match.
          Retiring one here removes it from new listings without deleting existing parcels.
        </p>
        {error && <div className="error-box">{error}</div>}

        <div className="panel" style={{ maxWidth: 480, marginBottom: 24 }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
            <input
              className="filter-select"
              style={{ flex: 1 }}
              placeholder="e.g. Dairy pasture"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn-green" type="submit">Add</button>
          </form>
        </div>

        <div className="panel" style={{ maxWidth: 480 }}>
          {landUses.length === 0 ? (
            <div className="empty-state">No land use options yet. Add the first one above.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {landUses.map((lu) => (
                <div key={lu._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--s100)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lu.name}</div>
                    <div style={{ fontSize: 12, color: lu.active ? 'var(--g600)' : 'var(--s400)' }}>
                      {lu.active ? 'Active' : 'Retired'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline-green" onClick={() => toggleActive(lu)}>
                      {lu.active ? 'Retire' : 'Reactivate'}
                    </button>
                    <button className="btn-outline-green" onClick={() => handleDelete(lu)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
