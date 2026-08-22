import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getBranding, getDefaultBranding, setBranding, resetBranding } from '../branding.js';
import { ArrowRightIcon, SparkleIcon } from '../components/Icons.jsx';

// Lets an admin point the app icon (browser tab / PWA icon, expects an SVG) and the
// square app logo (navbar, avatar fallback) at their own hosted images, without a
// redeploy. Saved to this browser via branding.js; every tab reads the same values.
function BrandingPanel() {
  const [values, setValues] = useState(getBranding);
  const [saved, setSaved] = useState(false);
  const defaults = getDefaultBranding();

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    setSaved(false);
  }

  function handleSave(event) {
    event.preventDefault();
    setValues(setBranding(values));
    setSaved(true);
  }

  function handleReset() {
    setValues(resetBranding());
    setSaved(false);
  }

  return (
    <div className="panel admin-security-panel">
      <div>
        <div className="section-eyebrow">Brand assets</div>
        <h3 className="admin-panel-title">App icon &amp; logo</h3>
        <p className="card-sub">
          Point these at your own hosted images to rebrand the app instantly, no redeploy needed.
          The app icon should be an SVG (used as the browser tab icon); the app logo should be square.
        </p>
      </div>

      <form className="branding-form" onSubmit={handleSave}>
        <div className="branding-field">
          <label htmlFor="app-icon-url">App icon URL (SVG)</label>
          <div className="branding-field-row">
            <img
              className="branding-preview branding-preview-icon"
              src={values.appIconUrl || defaults.appIconUrl}
              alt="App icon preview"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              onLoad={(e) => { e.currentTarget.style.visibility = 'visible'; }}
            />
            <input
              id="app-icon-url"
              type="url"
              placeholder="https://example.com/app-icon.svg"
              value={values.appIconUrl}
              onChange={(e) => handleChange('appIconUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="branding-field">
          <label htmlFor="app-logo-url">App logo URL (square)</label>
          <div className="branding-field-row">
            <img
              className="branding-preview branding-preview-logo"
              src={values.appLogoUrl || defaults.appLogoUrl}
              alt="App logo preview"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              onLoad={(e) => { e.currentTarget.style.visibility = 'visible'; }}
            />
            <input
              id="app-logo-url"
              type="url"
              placeholder="https://example.com/app-logo-square.png"
              value={values.appLogoUrl}
              onChange={(e) => handleChange('appLogoUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="branding-field">
          <label htmlFor="chatbot-icon-url">Chatbot launcher icon URL, optional</label>
          <div className="branding-field-row">
            <div className="branding-preview branding-preview-chatbot">
              {values.chatbotIconUrl ? (
                <img
                  src={values.chatbotIconUrl}
                  alt="Chatbot icon preview"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  onLoad={(e) => { e.currentTarget.style.visibility = 'visible'; }}
                />
              ) : (
                <SparkleIcon size={18} />
              )}
            </div>
            <input
              id="chatbot-icon-url"
              type="url"
              placeholder="https://example.com/chatbot-icon.png, leave blank for the default icon"
              value={values.chatbotIconUrl}
              onChange={(e) => handleChange('chatbotIconUrl', e.target.value)}
            />
          </div>
          <p className="card-sub" style={{ marginTop: 6, marginBottom: 0 }}>
            Shown on the floating launcher for the Landora assistant on the marketplace page.
          </p>
        </div>

        <div className="branding-actions">
          <button type="submit" className="btn-primary">Save brand assets</button>
          <button type="button" className="btn-ghost" onClick={handleReset}>Reset to default</button>
          {saved && <span className="branding-saved">Saved, applied across the app now.</span>}
        </div>
      </form>
    </div>
  );
}

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

  async function withdraw(id) {
    setBusyId(id);
    setError('');
    try {
      await api.adminWithdrawApplication(id, token);
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
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{a.farmer?.name} <ArrowRightIcon size={12} /> {a.parcel?.title}</div>
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
              {(a.status === 'pending' || a.status === 'accepted') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {a.status === 'pending' && (
                    <>
                      <button className="btn-green" disabled={busyId === a._id} onClick={() => decide(a._id, 'accepted')}>
                        {busyId === a._id ? 'Working…' : 'Accept'}
                      </button>
                      <button className="btn-outline-green" disabled={busyId === a._id} onClick={() => decide(a._id, 'declined')}>
                        Decline
                      </button>
                    </>
                  )}
                  <button className="btn-outline-green" disabled={busyId === a._id} onClick={() => withdraw(a._id)}>
                    {busyId === a._id ? 'Working…' : 'Withdraw'}
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

// Admin: every fee the platform charges is editable here — nothing is hardcoded.
// Saving a field immediately changes what the next M-Pesa STK push charges (see
// backend/routes/payments.js -> resolveAmount), no redeploy required.
function FeeSettingsPanel({ token }) {
  const [fees, setFees] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.adminFeeSettings(token)
      .then((data) => setFees(data.fees))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(group, field, value) {
    setFees((f) => ({ ...f, [group]: { ...f[group], [field]: value } }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = await api.updateAdminFeeSettings(fees, token);
      setFees(data.fees);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading…</div>;
  if (!fees) return null;

  const numberField = (group, field, label, hint) => (
    <div className="fee-settings-field" key={`${group}.${field}`}>
      <label htmlFor={`${group}-${field}`}>{label}</label>
      <input
        id={`${group}-${field}`}
        type="number"
        min="0"
        step="1"
        value={fees[group][field]}
        onChange={(e) => update(group, field, e.target.value === '' ? '' : Number(e.target.value))}
      />
      {hint && <span style={{ fontSize: 11, color: 'var(--s400)' }}>{hint}</span>}
    </div>
  );

  const textField = (group, field, label, placeholder) => (
    <div className="fee-settings-field" key={`${group}.${field}`}>
      <label htmlFor={`${group}-${field}`}>{label}</label>
      <input
        id={`${group}-${field}`}
        type="text"
        placeholder={placeholder}
        value={fees[group][field] || ''}
        onChange={(e) => update(group, field, e.target.value)}
      />
    </div>
  );

  return (
    <form className="panel admin-security-panel" onSubmit={handleSave}>
      <div>
        <div className="section-eyebrow">Business model</div>
        <h3 className="admin-panel-title">Fee settings</h3>
        <p className="card-sub">
          Every fee charged through M-Pesa across the platform. Changes apply to the next payment immediately.
        </p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="fee-settings-group-title">Transaction commission (charged to the farmer on lease acceptance)</div>
      <div className="fee-settings-grid">
        {numberField('commission', 'percent', 'Commission %', '% of first year lease value')}
        {numberField('commission', 'minKes', 'Minimum (KES)')}
        {numberField('commission', 'maxKes', 'Maximum (KES)')}
      </div>

      <div className="fee-settings-group-title">Land verification (paid by the landowner)</div>
      <div className="fee-settings-grid">
        {numberField('verification', 'basicKes', 'Basic (KES)')}
        {numberField('verification', 'premiumKes', 'Premium due-diligence (KES)')}
      </div>

      <div className="fee-settings-group-title">GIS land productivity report (paid by the farmer/buyer to unlock)</div>
      <div className="fee-settings-grid">
        {numberField('gisReport', 'priceKes', 'Unlock price (KES)', 'One-time, per parcel')}
      </div>

      <div className="fee-settings-group-title">Digital lease contracts</div>
      <div className="fee-settings-grid">
        {numberField('leaseContract', 'basicKes', 'Basic lease (KES)')}
        {numberField('leaseContract', 'professionalKes', 'Professional package (KES)')}
      </div>

      <div className="fee-settings-group-title">Landowner subscription (monthly)</div>
      <div className="fee-settings-grid">
        {numberField('landownerSubscription', 'individualKes', 'Individual landowner (KES)')}
        {numberField('landownerSubscription', 'multiPropertyKes', 'Multiple properties (KES)')}
        {numberField('landownerSubscription', 'institutionalKes', 'Institutions / large landowners (KES)')}
      </div>

      <div className="fee-settings-group-title">Farmer / tenant subscription (monthly)</div>
      <div className="fee-settings-grid">
        {numberField('farmerPremium', 'monthlyKes', 'Premium access (KES)')}
      </div>

      <div className="fee-settings-group-title">M-Pesa collection (Buy Goods / Till)</div>
      <div className="fee-settings-grid">
        {textField('mpesa', 'tillNumber', 'Till number (PartyB)', 'e.g. 174379')}
        {textField('mpesa', 'shortcode', 'Business shortcode', 'usually same as till number')}
        {textField('mpesa', 'accountReferencePrefix', 'Account reference prefix', 'LANDORA')}
      </div>
      <p className="card-sub" style={{ marginTop: 4 }}>
        Consumer key/secret and passkey are set as server environment variables, not here — see backend/.env.example.
      </p>

      <div className="branding-actions" style={{ marginTop: 20 }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save fee settings'}</button>
        {saved && <span className="branding-saved">Saved.</span>}
      </div>
    </form>
  );
}

// Admin: the full M-Pesa payment ledger across every fee type, plus running totals
// of successfully collected revenue per stream.
function PaymentsPanel({ token }) {
  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load(status) {
    setLoading(true);
    return api.adminPayments(token, status ? { status } : {})
      .then((data) => {
        setPayments(data.payments);
        setTotals(data.totals || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const typeLabel = {
    commission: 'Commission',
    verification: 'Verification',
    lease_contract: 'Lease contract',
    landowner_subscription: 'Landowner subscription',
    farmer_premium: 'Farmer premium',
    gis_report: 'GIS report unlock',
  };

  return (
    <div>
      {totals.length > 0 && (
        <div className="fee-settings-grid" style={{ marginBottom: 20 }}>
          {totals.map((t) => (
            <div className="panel" key={t._id} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>{typeLabel[t._id] || t._id}</div>
              <div className="payment-amount" style={{ fontSize: 20 }}>KES {Number(t.total).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--s400)' }}>{t.count} payment{t.count === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <span className={`filter-badge ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</span>
        <span className={`filter-badge ${statusFilter === 'success' ? 'active' : ''}`} onClick={() => setStatusFilter('success')}>Success</span>
        <span className={`filter-badge ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}>Pending</span>
        <span className={`filter-badge ${statusFilter === 'failed' ? 'active' : ''}`} onClick={() => setStatusFilter('failed')}>Failed</span>
        <span className={`filter-badge ${statusFilter === 'cancelled' ? 'active' : ''}`} onClick={() => setStatusFilter('cancelled')}>Cancelled</span>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="empty-state">No payments match this filter.</div>
      ) : (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th><th>Type</th><th>Amount</th><th>Phone</th><th>Status</th><th>M-Pesa receipt</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div>{p.user?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--s400)' }}>{p.user?.role}</div>
                  </td>
                  <td>{typeLabel[p.type] || p.type}{p.tier ? ` (${p.tier})` : ''}</td>
                  <td className="payment-amount">KES {Number(p.amount).toLocaleString()}</td>
                  <td>{p.phone}</td>
                  <td>
                    <span className={`status-pill ${p.status === 'success' ? 'status-accepted' : p.status === 'failed' || p.status === 'cancelled' ? 'status-declined' : 'status-pending'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.mpesaReceiptNumber || 'N/A'}</td>
                  <td style={{ fontSize: 12, color: 'var(--s500)' }}>{new Date(p.createdAt).toLocaleString()}</td>
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
              {tab === 'listings'
                ? 'All listings'
                : tab === 'applications'
                ? 'Applicant qualification'
                : tab === 'waitlist'
                ? 'Waitlist and pre bookings'
                : tab === 'fees'
                ? 'Fees & payments'
                : 'Branding'}
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
          <button type="button" className={`admin-tab ${tab === 'fees' ? 'active' : ''}`} onClick={() => setTab('fees')}>
            Fees &amp; payments
          </button>
          <button type="button" className={`admin-tab ${tab === 'branding' ? 'active' : ''}`} onClick={() => setTab('branding')}>
            Branding
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {tab === 'applications' ? (
          <ApplicationsPanel token={token} />
        ) : tab === 'waitlist' ? (
          <WaitlistPanel token={token} />
        ) : tab === 'fees' ? (
          <>
            <FeeSettingsPanel token={token} />
            <div style={{ marginTop: 28 }}>
              <h3 className="admin-panel-title" style={{ marginBottom: 12 }}>Payment ledger</h3>
              <PaymentsPanel token={token} />
            </div>
          </>
        ) : tab === 'branding' ? (
          <BrandingPanel />
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
