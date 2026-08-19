import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COUNTIES } from '../constants.js';
import PaymentModal from './PaymentModal.jsx';

const statusLabel = {
  submitted: 'Submitted',
  reviewing: 'Landora is searching',
  proposal_sent: 'Proposal ready',
  fee_paid: 'Fee paid — matches unlocked',
  fulfilled: 'Fulfilled',
  declined: 'Declined',
};

// Embedded in both the farmer and landowner dashboards — an institutional/agribusiness
// buyer describes what they need ("500 acres, maize, water access, under a price
// ceiling") instead of browsing listing by listing. An admin hand-picks matching
// parcels and sends a proposal; the buyer only sees which specific listings matched
// once they've paid the aggregation fee (routes/bulkSearch.js keeps matchedParcels
// empty on GET /mine until then) — everything up to that point (status, match count)
// is visible for free.
export default function BulkSearchPanel() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(null); // request being paid for, or null

  const [targetAcres, setTargetAcres] = useState('');
  const [counties, setCounties] = useState([]);
  const [crop, setCrop] = useState('');
  const [waterAccessRequired, setWaterAccessRequired] = useState(false);
  const [maxPricePerAcre, setMaxPricePerAcre] = useState('');
  const [notes, setNotes] = useState('');

  function load() {
    return api.myBulkSearchRequests(token).then((data) => setRequests(data.requests));
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCounty(c) {
    setCounties((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function resetForm() {
    setTargetAcres('');
    setCounties([]);
    setCrop('');
    setWaterAccessRequired(false);
    setMaxPricePerAcre('');
    setNotes('');
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.submitBulkSearch(
        {
          targetAcres: Number(targetAcres),
          counties,
          crop,
          waterAccessRequired,
          maxPricePerAcre: maxPricePerAcre === '' ? undefined : Number(maxPricePerAcre),
          notes,
        },
        token
      );
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Bulk land search</div>
        <button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowForm(true)}>
          Request a batch
        </button>
      </div>
      <p className="card-sub" style={{ marginBottom: 12 }}>
        Sourcing land for an agribusiness or institution? Tell us the acreage and criteria — Landora
        searches the marketplace and compiles a proposal instead of you browsing listing by listing.
      </p>
      {error && <div className="error-box">{error}</div>}

      {requests.length > 0 && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Target</th><th>Counties</th><th>Crop</th><th>Status</th><th>Matches</th><th></th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>{r.targetAcres} ac</td>
                  <td style={{ fontSize: 12 }}>{r.counties?.length ? r.counties.join(', ') : 'Any'}</td>
                  <td>{r.crop || 'Any'}</td>
                  <td>
                    <span className={`status-pill ${r.status === 'fulfilled' || r.status === 'fee_paid' ? 'status-accepted' : r.status === 'declined' ? 'status-declined' : 'status-pending'}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === 'proposal_sent' ? (
                      `${r.matchedParcelCount} found (locked)`
                    ) : r.matchedParcels?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {r.matchedParcels.map((p) => (
                          <a key={p._id} href={`/parcels/${p.slug || p._id}`} style={{ fontSize: 12 }}>{p.title}</a>
                        ))}
                      </div>
                    ) : (
                      r.matchedParcelCount || 0
                    )}
                  </td>
                  <td>
                    {r.status === 'proposal_sent' && (
                      <button type="button" className="btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPaying(r)}>
                        Unlock — pay fee
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-scrim" onClick={() => setShowForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button>
            <div className="card-title" style={{ marginBottom: 4 }}>Request a batch</div>
            <p className="card-sub">Describe what you need — an admin will search the marketplace and send a proposal.</p>
            <form onSubmit={submit}>
              <div className="fee-settings-grid" style={{ marginBottom: 14 }}>
                <div className="fee-settings-field">
                  <label htmlFor="bulk-acres">Target acreage</label>
                  <input id="bulk-acres" type="number" min="1" required value={targetAcres} onChange={(e) => setTargetAcres(e.target.value)} />
                </div>
                <div className="fee-settings-field">
                  <label htmlFor="bulk-crop">Crop / land use</label>
                  <input id="bulk-crop" type="text" placeholder="e.g. Maize" value={crop} onChange={(e) => setCrop(e.target.value)} />
                </div>
                <div className="fee-settings-field">
                  <label htmlFor="bulk-price">Max price / acre / season (KES)</label>
                  <input id="bulk-price" type="number" min="0" value={maxPricePerAcre} onChange={(e) => setMaxPricePerAcre(e.target.value)} />
                </div>
              </div>

              <div className="fee-settings-field" style={{ marginBottom: 14 }}>
                <label>Counties (leave blank for any)</label>
                <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--g200)', borderRadius: 8, padding: 8 }}>
                  {COUNTIES.map((c) => (
                    <label key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, marginRight: 12, marginBottom: 4 }}>
                      <input type="checkbox" checked={counties.includes(c)} onChange={() => toggleCounty(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 14 }}>
                <input type="checkbox" checked={waterAccessRequired} onChange={(e) => setWaterAccessRequired(e.target.checked)} />
                Water access required
              </label>

              <div className="fee-settings-field" style={{ marginBottom: 14 }}>
                <label htmlFor="bulk-notes">Anything else? (optional)</label>
                <textarea id="bulk-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting || !targetAcres} style={{ width: '100%' }}>
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <PaymentModal
        open={!!paying}
        onClose={() => setPaying(null)}
        type="bulk_search_fee"
        bulkSearchRequestId={paying?._id}
        title="Unlock your proposal"
        description={`Pay the aggregation fee to see the ${paying?.matchedParcelCount || ''} listing${paying?.matchedParcelCount === 1 ? '' : 's'} Landora matched for this request.`}
        onSuccess={() => {
          setPaying(null);
          load().catch((err) => setError(err.message));
        }}
      />
    </div>
  );
}
