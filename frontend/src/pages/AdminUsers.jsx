import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_FILTERS = ['', 'pending', 'unverified', 'verified', 'flagged'];

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function ReviewRow({ u, onSaved }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState(u.idVerification?.notes || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function act(status) {
    setBusy(status);
    setError('');
    try {
      const data = await api.adminUpdateIdVerification(u._id, { status, notes }, token);
      onSaved(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function recheck() {
    setBusy('recheck');
    setError('');
    try {
      const data = await api.adminUpdateIdVerification(u._id, { recheck: true }, token);
      onSaved(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const status = u.idVerification?.status || 'unverified';

  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {u.profilePicture ? (
            <img src={u.profilePicture} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="sidebar-owner-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{initials(u.name)}</div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{u.name} <span style={{ fontWeight: 400, color: 'var(--s500)', fontSize: 12, textTransform: 'capitalize' }}>· {u.role}</span></div>
            <div style={{ fontSize: 12, color: 'var(--s500)' }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
          </div>
        </div>
        <span className={`status-pill status-${status === 'verified' ? 'accepted' : status === 'flagged' ? 'declined' : 'pending'}`}>
          {status}
        </span>
      </div>

      <div className="kv-table" style={{ marginTop: 12 }}>
        <div className="kv-row"><span>National ID</span><strong>{u.nationalId || u.idVerification?.idNumber || '—'}</strong></div>
        {u.idVerification?.fullNameOnRecord && (
          <div className="kv-row"><span>Name on record</span><strong>{u.idVerification.fullNameOnRecord}</strong></div>
        )}
        <div className="kv-row"><span>Phone verified</span><strong>{u.phoneVerified ? 'Yes' : 'No'}</strong></div>
      </div>

      {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}

      <div className="field" style={{ marginTop: 12 }}>
        <label>Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. what a manual lookup turned up" />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button type="button" className="btn-green" disabled={!!busy} onClick={() => act('verified')}>
          {busy === 'verified' ? 'Saving…' : 'Mark verified'}
        </button>
        <button type="button" className="btn-outline-green" disabled={!!busy} onClick={() => act('flagged')}>
          {busy === 'flagged' ? 'Saving…' : 'Flag'}
        </button>
        <button type="button" className="btn-outline-green" disabled={!!busy} onClick={() => act('pending')}>
          {busy === 'pending' ? 'Saving…' : 'Mark pending'}
        </button>
        <button type="button" className="text-button" disabled={!!busy} onClick={recheck}>
          {busy === 'recheck' ? 'Rechecking…' : 'Re-run automated check'}
        </button>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    return api.adminUsers(token, { idStatus: statusFilter || undefined, role: roleFilter || undefined })
      .then((data) => setUsers(data.users));
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, roleFilter]);

  function handleSaved(updatedUser) {
    setUsers((prev) => prev.map((u) => (u._id === updatedUser.id ? { ...u, ...updatedUser, _id: updatedUser.id } : u)));
  }

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Admin</div>
        <h2 className="section-h2">Buyer &amp; seller ID verification</h2>
        <p className="card-sub" style={{ marginBottom: 20 }}>
          Every farmer (buyer) and landowner (seller) needs a verified national ID before they can apply to lease
          or publish a listing. Submissions land here automatically when no automated IPRS check is configured, or
          when the automated check flags a mismatch.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? `Status: ${s}` : 'All statuses'}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All roles</option>
            <option value="farmer">Farmers (buyers)</option>
            <option value="landowner">Landowners (sellers)</option>
          </select>
        </div>

        {error && <div className="error-box">{error}</div>}
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : users.length === 0 ? (
          <div className="empty-state">No users match this filter.</div>
        ) : (
          users.map((u) => <ReviewRow key={u._id} u={u} onSaved={handleSaved} />)
        )}
      </div>
    </div>
  );
}
