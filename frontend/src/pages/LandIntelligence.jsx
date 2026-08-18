import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COUNTIES } from '../constants.js';
import PaymentModal from '../components/PaymentModal.jsx';

export default function LandIntelligence() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [county, setCounty] = useState('');
  const [crop, setCrop] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.intelligenceSummary()
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSummary(false));
  }, []);

  async function runReport(e) {
    e && e.preventDefault();
    if (!county) return;
    setError('');
    setLoadingReport(true);
    try {
      const data = await api.intelligenceReport({ county, crop }, token);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReport(false);
    }
  }

  const rateBar = (label, value) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--s600)', marginBottom: 3 }}>
        <span>{label}</span><span>{value == null ? 'N/A' : `${value}%`}</span>
      </div>
      <div style={{ background: 'var(--g100)', borderRadius: 6, height: 6 }}>
        <div style={{ background: 'var(--g600)', borderRadius: 6, height: 6, width: `${value || 0}%` }} />
      </div>
    </div>
  );

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Land price intelligence</div>
        <h2 className="section-h2">Know the market before you lease</h2>
        <p className="card-sub" style={{ maxWidth: 620 }}>
          Live pricing built from every listing on Landora — free marketplace-wide numbers for
          everyone, and a full county/crop report (trend, demand, and land-quality signals) for
          a one-time fee.
        </p>

        {error && <div className="error-box">{error}</div>}

        {!loadingSummary && summary && (
          <div className="fee-settings-grid" style={{ marginBottom: 28 }}>
            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Marketplace average</div>
              <div className="payment-amount" style={{ fontSize: 20 }}>
                {summary.averagePricePerAcre != null ? `KES ${Number(summary.averagePricePerAcre).toLocaleString()}` : 'N/A'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--s400)' }}>per acre per season</div>
            </div>
            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Listings tracked</div>
              <div className="payment-amount" style={{ fontSize: 20 }}>{summary.sampleSize}</div>
            </div>
            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--s500)' }}>Counties covered</div>
              <div className="payment-amount" style={{ fontSize: 20 }}>{summary.countiesCovered}</div>
            </div>
          </div>
        )}

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Run a region report</div>
          <form onSubmit={runReport} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="fee-settings-field" style={{ minWidth: 200 }}>
              <label htmlFor="li-county">County</label>
              <select id="li-county" value={county} onChange={(e) => setCounty(e.target.value)} required>
                <option value="">Select a county</option>
                {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fee-settings-field" style={{ minWidth: 180 }}>
              <label htmlFor="li-crop">Crop / land use (optional)</label>
              <input id="li-crop" type="text" placeholder="e.g. Maize" value={crop} onChange={(e) => setCrop(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" disabled={!county || loadingReport}>
              {loadingReport ? 'Running…' : 'Run report'}
            </button>
          </form>
        </div>

        {report && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>{report.county} — {report.crop}</div>
              {report.unlocked && report.validUntil && (
                <span style={{ fontSize: 12, color: 'var(--s500)' }}>
                  Valid until {new Date(report.validUntil).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="fee-settings-grid" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--s500)' }}>Average price</div>
                <div className="payment-amount" style={{ fontSize: 18 }}>
                  {report.averagePricePerAcre != null ? `KES ${Number(report.averagePricePerAcre).toLocaleString()}` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--s500)' }}>Listings in scope</div>
                <div className="payment-amount" style={{ fontSize: 18 }}>{report.sampleSize}</div>
              </div>
            </div>

            {report.unlocked ? (
              <>
                <div className="fee-settings-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>Suggested price band</div>
                    <div className="payment-amount" style={{ fontSize: 16 }}>
                      KES {Number(report.suggestedMin).toLocaleString()} – {Number(report.suggestedMax).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>Price trend (90 days)</div>
                    <div className="payment-amount" style={{ fontSize: 16 }}>
                      {report.trendPercent == null ? 'Not enough history' : `${report.trendPercent > 0 ? '+' : ''}${report.trendPercent}%`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--s500)' }}>Demand score</div>
                    <div className="payment-amount" style={{ fontSize: 16 }}>{report.demandScore}</div>
                    <div style={{ fontSize: 11, color: 'var(--s400)' }}>avg. applications per listing</div>
                  </div>
                </div>
                {rateBar('Water access', report.waterAccessRate)}
                {rateBar('Financing available', report.financingAvailableRate)}
                {rateBar('Insured', report.insuredRate)}
              </>
            ) : (
              <div className="info-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 0 }}>
                <span>{report.message}</span>
                {report.sampleSize > 0 && (
                  <button type="button" className="btn-primary" onClick={() => setPaying(true)}>
                    Buy report — KES {Number(report.reportFeeKes).toLocaleString()}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <PaymentModal
        open={paying}
        onClose={() => setPaying(false)}
        type="intelligence_report"
        county={county}
        crop={crop}
        title="Buy land intelligence report"
        description={`Full price trend, demand score, and land-quality breakdown for ${county}${crop ? ` — ${crop}` : ' — all crops'}. Stays accessible for ${report?.reportValidityDays || 30} days.`}
        onSuccess={() => {
          runReport();
        }}
      />
    </div>
  );
}
