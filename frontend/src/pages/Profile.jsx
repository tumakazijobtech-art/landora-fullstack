import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COUNTIES, LOGO_URL } from '../constants.js';

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    county: user?.county || '',
    profilePicture: user?.profilePicture || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const data = await api.updateProfile(form, token);
      updateUser(data.user);
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section">
      <div className="section-inner" style={{ maxWidth: 560 }}>
        <div className="section-eyebrow">Account</div>
        <h2 className="section-h2">Your profile</h2>
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <img
              src={form.profilePicture || LOGO_URL}
              alt="Profile"
              className="profile-avatar-preview"
              onError={(e) => { e.currentTarget.src = LOGO_URL; }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--s500)', textTransform: 'capitalize' }}>{user.role} account · {user.email}</div>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}
          {success && <div className="info-box">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div className="field">
                <label>Full name</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div className="field">
                <label>County</label>
                <select value={form.county} onChange={(e) => update('county', e.target.value)}>
                  <option value="">Select your county</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Profile picture URL</label>
                <input
                  value={form.profilePicture}
                  onChange={(e) => update('profilePicture', e.target.value)}
                  placeholder="https://... (leave blank to use the Landora logo)"
                />
                <div style={{ fontSize: 11.5, color: 'var(--s500)', marginTop: 6 }}>
                  Shown in the navbar, your dashboard, and on your listings. Leave blank for the default Landora mark.
                </div>
              </div>
            </div>
            <button className="btn-green" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
