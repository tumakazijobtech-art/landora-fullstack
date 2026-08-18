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

  const numberField = (group, field, label, hint, min = 0) => (
    <div className="fee-settings-field" key={`${group}.${field}`}>
      <label htmlFor={`${group}-${field}`}>{label}</label>
      <input
        id={`${group}-${field}`}
        type="number"
        min={min}
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

      <div className="fee-settings-group-title">Buyer commitment fee (paid by the farmer when applying)</div>
      <div className="fee-settings-grid">
        {numberField('commitment', 'feeKes', 'Commitment fee (KES)')}
      </div>

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

      <div className="fee-settings-group-title">Subscription gating (what each plan unlocks)</div>
      <div className="fee-settings-grid">
        {numberField('gating', 'freeListingLimit', 'Free plan listing limit')}
        {numberField('gating', 'individualListingLimit', 'Individual plan listing limit', '-1 = unlimited', -1)}
        {numberField('gating', 'multiPropertyListingLimit', 'Multi-property plan listing limit', '-1 = unlimited', -1)}
        {numberField('gating', 'institutionalListingLimit', 'Institutional plan listing limit', '-1 = unlimited', -1)}
        {numberField('gating', 'earlyAccessHours', 'Early access window (hours)', 'How long new listings are premium-only. 0 = off')}
      </div>

      <div className="fee-settings-group-title">Land price intelligence (paid per-region report)</div>
      <div className="fee-settings-grid">
        {numberField('intelligence', 'reportFeeKes', 'Report fee (KES)')}
        {numberField('intelligence', 'reportValidityDays', 'Report validity (days)', 'How long a purchased report stays accessible', 1)}
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
    commitment: 'Commitment fee',
    commission: 'Commission',
    verification: 'Verification',
    lease_contract: 'Lease contract',
    landowner_subscription: 'Landowner subscription',
    farmer_premium: 'Farmer premium',
    intelligence_report: 'Intelligence report',
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

// Admin: manage the financing/insurance partner list and review referral requests
// through to a recorded commission — §8/§9 of the business model. Unlike every other
// fee, this money comes from the partner, not the user, so there's no M-Pesa flow
// here; disbursement is entered manually once a partner actually pays.
function ReferralsAdminPanel({ token }) {
  const [partners, setPartners] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [totals, setTotals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingPartner, setEditingPartner] = useState(null); // partner object, or {} for new
  const [savingPartner, setSavingPartner] = useState(false);
  const [reviewing, setReviewing] = useState(null); // referral being reviewed
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewCommission, setReviewCommission] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  function loadPartners() {
    return api.adminReferralPartners(token).then((data) => setPartners(data.partners));
  }
  function loadReferrals(status) {
    return api.adminReferrals(token, status ? { status } : {}).then((data) => {
      setReferrals(data.referrals);
      setTotals(data.disbursedTotal || []);
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPartners(), loadReferrals(statusFilter)])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function savePartner(e) {
    e.preventDefault();
    setSavingPartner(true);
    setError('');
    try {
      if (editingPartner._id) {
        await api.adminUpdateReferralPartner(editingPartner._id, editingPartner, token);
      } else {
        await api.adminCreateReferralPartner(editingPartner, token);
      }
      setEditingPartner(null);
      await loadPartners();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPartner(false);
    }
  }

  async function deletePartner(id) {
    setError('');
    try {
      await api.adminDeleteReferralPartner(id, token);
      await loadPartners();
    } catch (err) {
      setError(err.message);
    }
  }

  function openReview(r) {
    setReviewing(r);
    setReviewStatus(r.status);
    setReviewCommission(r.commissionKes ?? '');
    setReviewNote(r.adminNote || '');
  }

  async function saveReview(e) {
    e.preventDefault();
    setSavingReview(true);
    setError('');
    try {
      await api.adminUpdateReferral(
        reviewing._id,
        { status: reviewStatus, adminNote: reviewNote, commissionKes: reviewCommission === '' ? undefined : Number(reviewCommission) },
        token
      );
      setReviewing(null);
      await loadReferrals(statusFilter);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingReview(false);
    }
  }

  const typeLabel = { financing: 'Financing', insurance: 'Insurance' };
  const statusLabel = { submitted: 'Submitted', contacted: 'Contacted', approved: 'Approved', declined: 'Declined', disbursed: 'Disbursed' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="admin-panel-title" style={{ marginBottom: 0 }}>Partners</h3>
        <button type="button" className="btn-outline-green" onClick={() => setEditingPartner({ name: '', type: 'financing', description: '', contactEmail: '', contactPhone: '', referralFeeKes: 0 })}>
          Add partner
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!loading && partners.length === 0 ? (
        <div className="empty-state">No partners yet — add a financing or insurance partner to start referring users.</div>
      ) : (
        <div className="panel" style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Contact</th><th>Expected fee</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{typeLabel[p.type] || p.type}</td>
                  <td style={{ fontSize: 12 }}>{p.contactEmail || p.contactPhone || 'N/A'}</td>
                  <td>KES {Number(p.referralFeeKes || 0).toLocaleString()}</td>
                  <td>{p.active ? 'Yes' : 'No'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditingPartner(p)}>Edit</button>
                    <button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deletePartner(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totals.length > 0 && (
        <div className="fee-settings-grid" style={{ marginBottom: 20 }}>
          {totals.map((t) => (
            <div className="panel" key={t._id} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>{typeLabel[t._id] || t._id} commissions disbursed</div>
              <div className="payment-amount" style={{ fontSize: 20 }}>KES {Number(t.total || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--s400)' }}>{t.count} referral{t.count === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="admin-panel-title" style={{ marginBottom: 0 }}>Referral requests</h3>
        <div className="filter-bar">
          <span className={`filter-badge ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</span>
          {Object.keys(statusLabel).map((s) => (
            <span key={s} className={`filter-badge ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{statusLabel[s]}</span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : referrals.length === 0 ? (
        <div className="empty-state">No referral requests match this filter.</div>
      ) : (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>User</th><th>Partner</th><th>Type</th><th>Note</th><th>Status</th><th>Commission</th><th></th></tr></thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div>{r.user?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--s400)' }}>{r.user?.role}</div>
                  </td>
                  <td>{r.partner?.name}</td>
                  <td>{typeLabel[r.type] || r.type}</td>
                  <td style={{ maxWidth: 220, fontSize: 12 }}>{r.note || 'N/A'}</td>
                  <td><span className={`status-pill ${r.status === 'disbursed' ? 'status-accepted' : r.status === 'declined' ? 'status-declined' : 'status-pending'}`}>{statusLabel[r.status] || r.status}</span></td>
                  <td>{r.commissionKes != null ? `KES ${Number(r.commissionKes).toLocaleString()}` : 'N/A'}</td>
                  <td><button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openReview(r)}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPartner && (
        <div className="modal-scrim" onClick={() => setEditingPartner(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditingPartner(null)} aria-label="Close">×</button>
            <div className="card-title" style={{ marginBottom: 12 }}>{editingPartner._id ? 'Edit partner' : 'Add partner'}</div>
            <form onSubmit={savePartner}>
              <div className="fee-settings-grid" style={{ marginBottom: 14 }}>
                <div className="fee-settings-field">
                  <label>Name</label>
                  <input type="text" required value={editingPartner.name} onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })} />
                </div>
                <div className="fee-settings-field">
                  <label>Type</label>
                  <select value={editingPartner.type} onChange={(e) => setEditingPartner({ ...editingPartner, type: e.target.value })}>
                    <option value="financing">Financing</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>
                <div className="fee-settings-field">
                  <label>Contact email</label>
                  <input type="email" value={editingPartner.contactEmail || ''} onChange={(e) => setEditingPartner({ ...editingPartner, contactEmail: e.target.value })} />
                </div>
                <div className="fee-settings-field">
                  <label>Contact phone</label>
                  <input type="text" value={editingPartner.contactPhone || ''} onChange={(e) => setEditingPartner({ ...editingPartner, contactPhone: e.target.value })} />
                </div>
                <div className="fee-settings-field">
                  <label>Expected referral fee (KES)</label>
                  <input type="number" min="0" value={editingPartner.referralFeeKes || 0} onChange={(e) => setEditingPartner({ ...editingPartner, referralFeeKes: Number(e.target.value) })} />
                </div>
                {editingPartner._id && (
                  <div className="fee-settings-field">
                    <label>Active</label>
                    <select value={editingPartner.active ? 'yes' : 'no'} onChange={(e) => setEditingPartner({ ...editingPartner, active: e.target.value === 'yes' })}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="fee-settings-field" style={{ marginBottom: 14 }}>
                <label>Description</label>
                <textarea rows={2} value={editingPartner.description || ''} onChange={(e) => setEditingPartner({ ...editingPartner, description: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary" disabled={savingPartner} style={{ width: '100%' }}>
                {savingPartner ? 'Saving…' : 'Save partner'}
              </button>
            </form>
          </div>
        </div>
      )}

      {reviewing && (
        <div className="modal-scrim" onClick={() => setReviewing(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setReviewing(null)} aria-label="Close">×</button>
            <div className="card-title" style={{ marginBottom: 4 }}>Review referral</div>
            <p className="card-sub">{reviewing.user?.name} → {reviewing.partner?.name}</p>
            <form onSubmit={saveReview}>
              <div className="fee-settings-field" style={{ marginBottom: 14 }}>
                <label>Status</label>
                <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                  {Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
              <div className="fee-settings-field" style={{ marginBottom: 14 }}>
                <label>Commission received (KES)</label>
                <input type="number" min="0" value={reviewCommission} onChange={(e) => setReviewCommission(e.target.value)} placeholder="Required to mark as disbursed" />
              </div>
              <div className="fee-settings-field" style={{ marginBottom: 14 }}>
                <label>Admin note</label>
                <textarea rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" disabled={savingReview} style={{ width: '100%' }}>
                {savingReview ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
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
                : tab === 'referrals'
                ? 'Financing & insurance referrals'
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
          <button type="button" className={`admin-tab ${tab === 'referrals' ? 'active' : ''}`} onClick={() => setTab('referrals')}>
            Referrals
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
        ) : tab === 'referrals' ? (
          <ReferralsAdminPanel token={token} />
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
