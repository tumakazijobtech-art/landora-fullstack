import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import ReferralPanel from '../components/ReferralPanel.jsx';
import BulkSearchPanel from '../components/BulkSearchPanel.jsx';

export default function FarmerDashboard() {
  const { token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscription, setSubscription] = useState(null); // { plan, currentPeriodEnd, active }
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState(null); // { application, feeType: 'commission' | 'commitment' } or null
  const [subscribing, setSubscribing] = useState(false); // premium subscription modal open

  function load() {
    return Promise.all([
      api.myApplications(token),
      api.myPayments(token),
      api.mySubscriptions(token),
      api.priceAnalytics(token),
    ]).then(([appData, payData, subData, analyticsData]) => {
      setApplications(appData.applications);
      setPayments(payData.payments);
      setSubscription(subData.farmer);
      setAnalytics(analyticsData);
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
  // tied to this application. Same pattern for the commitment fee paid at apply time.
  function commissionPaid(applicationId) {
    return payments.some((p) => p.type === 'commission' && p.status === 'success' && p.application?._id === applicationId);
  }
  function commitmentPaid(applicationId) {
    return payments.some((p) => p.type === 'commitment' && p.status === 'success' && p.application?._id === applicationId);
  }

  const isPremium = subscription?.plan === 'premium';

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Farmer dashboard</div>
        <h2 className="section-h2">Your applications</h2>
        {error && <div className="error-box">{error}</div>}

        <div className="panel" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--s500)' }}>Your plan</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {isPremium ? 'Premium' : 'Free'}
              {isPremium && subscription?.currentPeriodEnd && (
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--s500)', marginLeft: 8 }}>
                  renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
            {!isPremium && (
              <div style={{ fontSize: 12, color: 'var(--s500)', marginTop: 2 }}>
                Early access to new listings, advanced filters, and full price analytics.
              </div>
            )}
          </div>
          {!isPremium && (
            <button type="button" className="btn-outline-green" onClick={() => setSubscribing(true)}>
              Upgrade to Premium
            </button>
          )}
        </div>

        {analytics && (
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ marginBottom: 4 }}>Land price intelligence</div>
            {analytics.overallAveragePricePerAcre != null ? (
              <p className="card-sub" style={{ marginBottom: analytics.premium ? 12 : 0 }}>
                Marketplace-wide average: <span className="payment-amount">KES {Number(analytics.overallAveragePricePerAcre).toLocaleString()}</span>{' '}
                per acre per season, across {analytics.sampleSize} listing{analytics.sampleSize === 1 ? '' : 's'}.
              </p>
            ) : (
              <p className="card-sub" style={{ marginBottom: 0 }}>Not enough listings yet to show pricing data.</p>
            )}
            {analytics.premium && analytics.breakdown?.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table className="data-table">
                  <thead><tr><th>County</th><th>Crop</th><th>Avg. price / ac / season</th><th>Listings</th></tr></thead>
                  <tbody>
                    {analytics.breakdown.map((row) => (
                      <tr key={`${row.county}-${row.crop}`}>
                        <td>{row.county}</td>
                        <td>{row.crop}</td>
                        <td className="payment-amount">KES {Number(row.averagePricePerAcre).toLocaleString()}</td>
                        <td>{row.sampleSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!analytics.premium && analytics.upsell && (
              <div className="info-box" style={{ marginTop: 12, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>{analytics.upsell}</span>
                <button type="button" className="btn-outline-green" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSubscribing(true)}>
                  Upgrade
                </button>
              </div>
            )}
          </div>
        )}

        <ReferralPanel />
        <BulkSearchPanel />

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
                  <div style={{ marginTop: 12 }}>
                    {commitmentPaid(a._id) ? (
                      <div className="info-box" style={{ marginBottom: 0 }}>
                        Commitment fee paid — your application is flagged as a serious applicant.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" className="btn-outline-green" onClick={() => setPayFor({ application: a, feeType: 'commitment' })}>
                          Pay commitment fee via M-Pesa
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--s500)' }}>
                          A small, one-time fee that signals serious intent to the landowner.
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 12, marginTop: 10, color: 'var(--s500)' }}>
                      To withdraw this application, please contact the Landora team — withdrawals require admin approval.
                    </div>
                  </div>
                )}
                {a.status === 'accepted' && (
                  commissionPaid(a._id) ? (
                    <div className="info-box" style={{ marginTop: 12, marginBottom: 0 }}>
                      Lease commission paid — this lease is secured.
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-primary" onClick={() => setPayFor({ application: a, feeType: 'commission' })}>
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
        type={payFor?.feeType}
        applicationId={payFor?.application?._id}
        title={payFor?.feeType === 'commitment' ? 'Pay commitment fee' : 'Pay lease commission'}
        description={
          payFor?.feeType === 'commitment'
            ? `Signals serious intent on ${payFor?.application?.parcel?.title || 'this application'}. The amount is shown once the M-Pesa prompt is sent.`
            : `Secures your lease on ${payFor?.application?.parcel?.title || 'this parcel'}. The exact amount is calculated from the lease value and shown once the M-Pesa prompt is sent.`
        }
        onSuccess={() => {
          load().catch((err) => setError(err.message));
        }}
      />

      <PaymentModal
        open={subscribing}
        onClose={() => setSubscribing(false)}
        type="farmer_premium"
        title="Upgrade to Premium"
        description="Early access to new listings, advanced filters, and full price analytics by county and crop. Paying while a period is still active extends it, so nothing already paid for is lost."
        onSuccess={() => {
          load().catch((err) => setError(err.message));
        }}
      />
    </div>
  );
}
