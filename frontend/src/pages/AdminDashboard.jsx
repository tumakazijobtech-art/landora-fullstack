import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function ApplicantAvatar({ person, size = 32 }) {
  if (person?.profilePicture) {
    return <img src={person.profilePicture} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />;
  }
  return (
    <div className="sidebar-owner-avatar" style={{ width: size, height: size, fontSize: size * 0.4, flex: 'none' }}>
      {initials(person?.name)}
    </div>
  );
}

// Admin: the applicant qualification queue. Landowners can only view who applied to
// their listings (see LandownerDashboard) — accepting or declining an applicant is
// exclusively an admin action, done here after the Landora team has qualified them.
function ApplicationsPanel({ token }) {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load(status) {
    setLoading(true);
    return api.adminApplications(token, status ? { status } : {})
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function decide(id, status) {
    setBusyId(id);
    setError('');
    try {
      await api.adminDecideApplication(id, { status }, token);
      await load(statusFilter);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="filter-bar">
        {['pending', 'accepted', 'declined', 'withdrawn', ''].map((s) => (
          <span
            key={s || 'all'}
            className={`filter-badge ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
          </span>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : applications.length === 0 ? (
        <div className="empty-state">No applications match this filter.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications.map((a) => (
            <div className="panel" key={a._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ApplicantAvatar person={a.farmer} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.farmer?.name} → {a.parcel?.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>
                      {a.farmer?.phone && `${a.farmer.phone} · `}{a.farmer?.email}
                      {a.parcel?.county ? ` · ${a.parcel.county} County` : ''}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--s400)', marginTop: 2 }}>
                      Landowner: {a.landowner?.name || 'N/A'}
                    </div>
                  </div>
                </div>
                <span className={`status-pill status-${a.status}`}>{a.status}</span>
              </div>
              {a.intendedCrop && <div style={{ fontSize: 13, marginTop: 8 }}>Intended crop: {a.intendedCrop}</div>}
              {a.seasonsRequested && <div style={{ fontSize: 13 }}>Seasons requested: {a.seasonsRequested}</div>}
              {a.message && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--s700)' }}>"{a.message}"</div>}
              {a.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn-green" disabled={busyId === a._id} onClick={() => decide(a._id, 'accepted')}>
                    {busyId === a._id ? 'Working…' : 'Accept'}
                  </button>
                  <button className="btn-outline-green" disabled={busyId === a._id} onClick={() => decide(a._id, 'declined')}>
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin: every "Join the waitlist" popup submission and every parcel pre booking,
// most recent first. This is the admin console side of the waitlist popup feature —
// every entry lands here the moment it's submitted, independent of whether email
// delivery is configured.
function WaitlistPanel({ token }) {
  const [entries, setEntries] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load(type) {
    setLoading(true);
    return api.adminWaitlist(token, type ? { type } : {})
      .then((data) => setEntries(data.entries))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  async function setStatus(id, status) {
    setBusyId(id);
    setError('');
    try {
      await api.adminUpdateWaitlistEntry(id, { status }, token);
      await load(typeFilter);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="filter-bar">
        <span className={`filter-badge ${typeFilter === '' ? 'active' : ''}`} onClick={() => setTypeFilter('')}>All ({entries.length})</span>
        <span className={`filter-badge ${typeFilter === 'general' ? 'active' : ''}`} onClick={() => setTypeFilter('general')}>Waitlist</span>
        <span className={`filter-badge ${typeFilter === 'prebooking' ? 'active' : ''}`} onClick={() => setTypeFilter('prebooking')}>Pre bookings</span>
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No submissions yet.</div>
      ) : (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Contact</th><th>County</th><th>Interest</th><th>Type</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id}>
                  <td>{entry.name}</td>
                  <td>
                    <div>{entry.email}</div>
                    {entry.phone && <div style={{ fontSize: 11, color: 'var(--s400)' }}>{entry.phone}</div>}
                  </td>
                  <td>{entry.county || 'N/A'}</td>
                  <td>
                    {entry.cropInterest || 'N/A'}
                    {entry.parcel && <div style={{ fontSize: 11, color: 'var(--s400)' }}>{entry.parcel.title}</div>}
                  </td>
                  <td><span className={`status-pill ${entry.type === 'prebooking' ? 'status-pending' : ''}`}>{entry.type}</span></td>
                  <td><span className={`status-pill ${entry.status === 'converted' ? 'status-accepted' : entry.status === 'dismissed' ? 'status-declined' : 'status-pending'}`}>{entry.status}</span></td>
                  <td>
                    <select
                      value={entry.status}
                      disabled={busyId === entry._id}
                      onChange={(e) => setStatus(entry._id, e.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState('listings');
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
            <h2 className="section-h2" style={{ marginBottom: 0 }}>
              {tab === 'listings' ? 'All listings' : tab === 'applications' ? 'Applicant qualification' : 'Waitlist and pre bookings'}
            </h2>
          </div>
          <Link className="btn-outline-green" to="/admin/land-uses">Manage land uses</Link>
        </div>

        <div className="admin-tabbar">
          <button type="button" className={`admin-tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}>
            Listings
          </button>
          <button type="button" className={`admin-tab ${tab === 'applications' ? 'active' : ''}`} onClick={() => setTab('applications')}>
            Applications
          </button>
          <button type="button" className={`admin-tab ${tab === 'waitlist' ? 'active' : ''}`} onClick={() => setTab('waitlist')}>
            Waitlist
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {tab === 'applications' ? (
          <ApplicationsPanel token={token} />
        ) : tab === 'waitlist' ? (
          <WaitlistPanel token={token} />
        ) : (
          <>
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
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ApplicantAvatar person={p.owner} size={24} />
                            {p.owner?.name}
                          </div>
                        </td>
                        <td>{p.county}</td>
                        <td>{p.score || 'N/A'}</td>
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
          </>
        )}
      </div>
    </div>
  );
}
