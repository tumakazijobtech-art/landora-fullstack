import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [authSettings, setAuthSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  function load() {
    return Promise.all([api.adminParcels(token), api.adminAuthSettings(token)])
      .then(([parcelData, settingsData]) => {
        setParcels(parcelData.parcels);
        setAuthSettings(settingsData.settings);
      });
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = filter ? parcels.filter((p) => p.enrichmentStatus === filter) : parcels;

  async function updateAuthSetting(field, value) {
    setError('');
    setSavingSettings(true);
    try {
      const data = await api.updateAdminAuthSettings({ [field]: value }, token);
      setAuthSettings(data.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Admin</div>
            <h2 className="section-h2" style={{ marginBottom: 0 }}>All listings</h2>
          </div>
          <Link className="btn-outline-green" to="/admin/land-uses">Manage land uses</Link>
        </div>
        {error && <div className="error-box">{error}</div>}

        {authSettings && (
          <div className="panel admin-security-panel">
            <div>
              <div className="section-eyebrow">Account protection</div>
              <h3 className="admin-panel-title">Verification policy</h3>
              <p className="card-sub">These controls apply to new users. Both email and phone codes are required whenever a policy is enabled.</p>
            </div>
            <div className="security-toggles">
              <label className="toggle-row">
                <span>
                  <strong>Verify new users on sign up</strong>
                  <small>Require both channels before the first session begins.</small>
                </span>
                <input type="checkbox" checked={authSettings.requireVerificationOnSignup} disabled={savingSettings} onChange={(event) => updateAuthSetting('requireVerificationOnSignup', event.target.checked)} />
              </label>
              <label className="toggle-row">
                <span>
                  <strong>Verify on every sign in</strong>
                  <small>Send a fresh email code and phone code each time a new user logs in.</small>
                </span>
                <input type="checkbox" checked={authSettings.requireVerificationOnSignIn} disabled={savingSettings} onChange={(event) => updateAuthSetting('requireVerificationOnSignIn', event.target.checked)} />
              </label>
            </div>
          </div>
        )}

        <div className="filter-bar">
          <span className={`filter-badge ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All ({parcels.length})</span>
          <span className={`filter-badge ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            Awaiting enrichment ({parcels.filter((p) => p.enrichmentStatus === 'pending').length})
          </span>
          <span className={`filter-badge ${filter === 'enriched' ? 'active' : ''}`} onClick={() => setFilter('enriched')}>
            Enriched ({parcels.filter((p) => p.enrichmentStatus === 'enriched').length})
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">No listings match this filter.</div>
        ) : (
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcel</th><th>Owner</th><th>County</th><th>Score</th><th>Title check</th><th>Status</th><th>Enrichment</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p._id}>
                    <td>{p.title}<div style={{ fontSize: 11, color: 'var(--s400)' }}>{p.reference}</div></td>
                    <td>{p.owner?.name}</td>
                    <td>{p.county}</td>
                    <td>{p.score || '—'}</td>
                    <td>
                      <span className={`status-pill ${p.titleVerification?.status === 'verified' ? 'status-accepted' : p.titleVerification?.status === 'flagged' ? 'status-declined' : 'status-pending'}`}>
                        {p.titleVerification?.status ? p.titleVerification.status.replace('_', ' ') : 'unverified'}
                      </span>
                    </td>
                    <td><span className={`status-pill status-${p.status}`}>{p.status.replace('_', ' ')}</span></td>
                    <td>
                      <span className={`status-pill ${p.enrichmentStatus === 'enriched' ? 'status-accepted' : 'status-pending'}`}>
                        {p.enrichmentStatus === 'enriched' ? 'Enriched' : 'Awaiting enrichment'}
                      </span>
                    </td>
                    <td><Link className="btn-outline-green" to={`/admin/parcels/${p._id}`}>Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
