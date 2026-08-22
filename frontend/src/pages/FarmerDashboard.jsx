import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import PaymentModal from '../components/PaymentModal.jsx';

export default function FarmerDashboard() {
  const { token } = useAuth();
  const { startConversationForParcel } = useChat();
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState(null); // application being paid for, or null

  function load() {
    return Promise.all([api.myApplications(token), api.myPayments(token)]).then(([appData, payData]) => {
      setApplications(appData.applications);
      setPayments(payData.payments);
    });
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A lease is only actually secured once the commission has been paid — this looks
  // across the farmer's own payment history for a successful "commission" payment
  // tied to this application.
  function commissionPaid(applicationId) {
    return payments.some((p) => p.type === 'commission' && p.status === 'success' && p.application?._id === applicationId);
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
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn-outline-green"
                    style={{ padding: '5px 12px', fontSize: 12.5 }}
                    onClick={() => startConversationForParcel(a.parcel?._id, a._id).catch((err) => setError(err.message))}
                  >
                    Message the landowner
                  </button>
                </div>
                {a.status === 'pending' && (
                  <div style={{ fontSize: 12, marginTop: 12, color: 'var(--s500)' }}>
                    To withdraw this application, please contact the Landora team — withdrawals require admin approval.
                  </div>
                )}
                {a.status === 'accepted' && (
                  commissionPaid(a._id) ? (
                    <div className="info-box" style={{ marginTop: 12, marginBottom: 0 }}>
                      Lease commission paid — this lease is secured.
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-primary" onClick={() => setPayFor(a)}>
                        Pay lease commission via M-Pesa
                      </button>
                      <span style={{ fontSize: 12, color: 'var(--s500)' }}>
                        A one-time platform fee, charged on the first year's lease value.
                      </span>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentModal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        type="commission"
        applicationId={payFor?._id}
        title="Pay lease commission"
        description={`Secures your lease on ${payFor?.parcel?.title || 'this parcel'}. The exact amount is calculated from the lease value and shown once the M-Pesa prompt is sent.`}
        onSuccess={() => {
          load().catch((err) => setError(err.message));
        }}
      />
    </div>
  );
}
