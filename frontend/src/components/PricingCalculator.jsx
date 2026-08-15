import React, { useState } from 'react';
import { api } from '../api.js';

// Helps a landowner set a fair per acre, per season lease rate by comparing against
// what similar parcels are actually asking right now, rather than guessing. Reads
// county, crop, water access, and financing straight from the create/edit form via
// props so it stays in sync as the landowner fills those fields in, and writes the
// chosen price back into the form with onApply.
export default function PricingCalculator({ county, crop, waterAccess, financingAvailable, onApply }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function calculate() {
    setError('');
    setLoading(true);
    try {
      const data = await api.pricingSuggestion({
        county, crop, waterAccess: waterAccess ? 'true' : '', financingAvailable: financingAvailable ? 'true' : '',
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pricing-calculator">
      <div className="pricing-calculator-head">
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Pricing calculator</div>
          <div style={{ fontSize: 12.5, color: 'var(--s500)' }}>A fair rate range based on comparable listings.</div>
        </div>
        <button type="button" className="btn-outline-green" style={{ padding: '8px 14px', fontSize: 13 }} onClick={calculate} disabled={loading}>
          {loading ? 'Checking…' : 'Suggest a rate'}
        </button>
      </div>

      {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}

      {result && !result.available && (
        <div className="info-box" style={{ marginTop: 10, marginBottom: 0 }}>{result.message}</div>
      )}

      {result && result.available && (
        <div className="pricing-calculator-result">
          <div className="pricing-calculator-range">
            KES {result.suggestedMin.toLocaleString()} – {result.suggestedMax.toLocaleString()}
            <span> per acre, per season</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--s500)' }}>
            Based on {result.sampleSize} comparable listing{result.sampleSize === 1 ? '' : 's'} ({result.basis}),
            median KES {result.median.toLocaleString()}.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-green" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => onApply(result.suggestedMin)}>
              Use {result.suggestedMin.toLocaleString()}
            </button>
            <button type="button" className="btn-green" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => onApply(result.suggestedMax)}>
              Use {result.suggestedMax.toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
