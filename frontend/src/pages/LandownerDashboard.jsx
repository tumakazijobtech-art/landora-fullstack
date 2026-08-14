import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LandownerDashboard() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeParcel, setActiveParcel] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function loadParcels() {
    return api.myParcels(token).then((data) => setParcels(data.parcels));
  }

  function loadApplications(parcelId) {
    return api.receivedApplications(token, parcelId).then((data) => setApplications(data.applications));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadParcels(), loadApplications()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDecision(id, status) {
    try {
      await api.decideApplication(id, { status }, token);
      await Promise.all([loadParcels(), loadApplications(activeParcel)]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFilterByParcel(id) {
    setActiveParcel(id);
    try {
      await loadApplications(id || undefined);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Landowner dashboard</div>
            <h2 className="section-h2" style={{ marginBottom: 0 }}>Your listings</h2>
          </div>
          <Link className="btn-green" to="/parcels/new">+ New listing</Link>
        </div>
        {error && <div className="error-box">{error}</div>}

        {parcels.length === 0 ? (
          <div className="empty-state">
            You haven't listed any land yet. <Link to="/parcels/new">Create your first listing</Link>.
          </div>
        ) : (
          <div className="panel responsive-table" style={{ marginBottom: 32, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcel</th><th>County</th><th>Size</th><th>Price / ac / season</th><th>Status</th><th>Applications</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((p) => (
                  <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => handleFilterByParcel(p._id)}>
                    <td>{p.title}</td>
                    <td>{p.county}</td>
                    <td>{p.sizeAcres} ac</td>
                    <td>KES {Number(p.pricePerAcrePerSeason).toLocaleString()}</td>
                    <td><span className={`status-pill status-${p.status}`}>{p.status.replace('_', ' ')}</span></td>
                    <td>{p.applicationCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-h2" style={{ marginBottom: 0, fontSize: 22 }}>
            Applications received {activeParcel ? '(filtered)' : ''}
          </h2>
          {activeParcel && (
            <button className="btn-outline-green" onClick={() => handleFilterByParcel(null)}>Show all</button>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">No applications yet for this filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applications.map((a) => (
              <div className="panel" key={a._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.farmer?.name} — {a.parcel?.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>
                      {a.farmer?.phone && `${a.farmer.phone} · `}{a.farmer?.email}
                    </div>
                  </div>
                  <span className={`status-pill status-${a.status}`}>{a.status}</span>
                </div>
                {a.intendedCrop && <div style={{ fontSize: 13, marginTop: 8 }}>Intended crop: {a.intendedCrop}</div>}
                {a.seasonsRequested && <div style={{ fontSize: 13 }}>Seasons requested: {a.seasonsRequested}</div>}
                {a.message && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--s700)' }}>"{a.message}"</div>}
                {a.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn-green" onClick={() => handleDecision(a._id, 'accepted')}>Accept</button>
                    <button className="btn-outline-green" onClick={() => handleDecision(a._id, 'declined')}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
