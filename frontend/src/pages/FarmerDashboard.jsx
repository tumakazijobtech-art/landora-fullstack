import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function FarmerDashboard() {
  const { token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    return api.myApplications(token).then((data) => setApplications(data.applications));
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleWithdraw(id) {
    try {
      await api.withdrawApplication(id, token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Farmer dashboard</div>
        <h2 className="section-h2">Your applications</h2>
        {error && <div className="error-box">{error}</div>}

        {applications.length === 0 ? (
          <div className="empty-state">
            You haven't applied to any parcels yet. <Link to="/marketplace">Browse available land</Link>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applications.map((a) => (
              <div className="panel" key={a._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <Link to={`/parcels/${a.parcel?._id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--s900)' }}>
                      {a.parcel?.title}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>{a.parcel?.location}, {a.parcel?.county}</div>
                  </div>
                  <span className={`status-pill status-${a.status}`}>{a.status}</span>
                </div>
                {a.message && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--s700)' }}>"{a.message}"</div>}
                {a.landownerNote && (
                  <div style={{ fontSize: 13, marginTop: 8, color: 'var(--s700)' }}>
                    Landowner note: {a.landownerNote}
                  </div>
                )}
                {a.status === 'pending' && (
                  <button className="btn-outline-green" style={{ marginTop: 12 }} onClick={() => handleWithdraw(a._id)}>
                    Withdraw application
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
