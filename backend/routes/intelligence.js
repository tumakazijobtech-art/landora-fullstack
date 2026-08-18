const express = require('express');
const { query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const FeeSettings = require('../models/FeeSettings');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function rate(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : null;
}

// Public: marketplace-wide snapshot — the free teaser that motivates buying a full
// regional report. No auth required, cheap enough to compute on every request
// (small collection, single pass).
router.get('/summary', async (req, res) => {
  const parcels = await Parcel.find({ status: 'available' })
    .select('county pricePerAcrePerSeason')
    .lean();

  const prices = parcels.map((p) => p.pricePerAcrePerSeason).filter((n) => typeof n === 'number' && n > 0);
  const counties = [...new Set(parcels.map((p) => p.county).filter(Boolean))].sort();

  res.json({
    sampleSize: prices.length,
    countiesCovered: counties.length,
    counties,
    averagePricePerAcre: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    medianPricePerAcre: prices.length ? Math.round(median(prices)) : null,
  });
});

// Buyer/farmer/landowner: a full county (optionally x crop) report — price trend,
// demand, and land-quality signals, gated behind a paid, time-limited
// `intelligence_report` payment (see routes/payments.js). Everyone gets the teaser
// (headline average + sample size) regardless of payment; the trend, demand score,
// quality rates, and suggested price band only come back once unlocked.
router.get(
  '/report',
  requireAuth,
  [query('county').trim().notEmpty(), query('crop').optional({ checkFalsy: true }).trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Choose a county to run a report for' });

    const county = req.query.county.trim();
    const crop = req.query.crop ? req.query.crop.trim() : undefined;
    const scopeFilter = crop ? { county, crop } : { county };

    const fees = await FeeSettings.getSingleton();
    const validityMs = Number(fees.intelligence.reportValidityDays || 30) * DAY_MS;
    const cutoff = new Date(Date.now() - validityMs);

    // A report bought for "all crops" in a county covers every crop report for that
    // county; a crop-specific report only covers that crop.
    const entitlingPayment = await Payment.findOne({
      user: req.user._id,
      type: 'intelligence_report',
      status: 'success',
      county,
      createdAt: { $gte: cutoff },
      $or: [{ crop: { $exists: false } }, { crop: '' }, ...(crop ? [{ crop }] : [])],
    }).sort({ createdAt: -1 });

    const unlocked = !!entitlingPayment;

    const parcels = await Parcel.find({ status: 'available', ...scopeFilter })
      .select('pricePerAcrePerSeason waterAccess financingAvailable insured createdAt')
      .lean();
    const prices = parcels.map((p) => p.pricePerAcrePerSeason).filter((n) => typeof n === 'number' && n > 0);
    const sampleSize = prices.length;
    const averagePricePerAcre = sampleSize ? Math.round(prices.reduce((a, b) => a + b, 0) / sampleSize) : null;

    const base = {
      county,
      crop: crop || 'All crops',
      sampleSize,
      averagePricePerAcre,
      unlocked,
      reportFeeKes: fees.intelligence.reportFeeKes,
      reportValidityDays: fees.intelligence.reportValidityDays,
    };

    if (sampleSize === 0) {
      return res.json({ ...base, message: 'Not enough listings in this region yet to build a report.' });
    }

    if (!unlocked) {
      return res.json({ ...base, message: 'Buy this report to see the price trend, demand score, and suggested price band.' });
    }

    const med = median(prices);
    const now = Date.now();
    const recent = parcels.filter((p) => now - new Date(p.createdAt).getTime() <= 90 * DAY_MS);
    const prior = parcels.filter((p) => {
      const age = now - new Date(p.createdAt).getTime();
      return age > 90 * DAY_MS && age <= 180 * DAY_MS;
    });
    const recentMedian = median(recent.map((p) => p.pricePerAcrePerSeason).filter((n) => n > 0));
    const priorMedian = median(prior.map((p) => p.pricePerAcrePerSeason).filter((n) => n > 0));
    const trendPercent = recentMedian != null && priorMedian ? Math.round(((recentMedian - priorMedian) / priorMedian) * 100) : null;

    const applicationCount = await Application.countDocuments({ parcel: { $in: parcels.map((p) => p._id) } });
    const demandScore = sampleSize ? Math.round((applicationCount / sampleSize) * 10) / 10 : 0;

    const suggestedMin = Math.round((med * 0.88) / 50) * 50;
    const suggestedMax = Math.round((med * 1.15) / 50) * 50;

    res.json({
      ...base,
      medianPricePerAcre: Math.round(med),
      suggestedMin,
      suggestedMax,
      trendPercent, // null if not enough listing history to compare; positive = rising
      demandScore, // average applications per listing in this region — higher = more competitive
      waterAccessRate: rate(parcels.filter((p) => p.waterAccess).length, sampleSize),
      financingAvailableRate: rate(parcels.filter((p) => p.financingAvailable).length, sampleSize),
      insuredRate: rate(parcels.filter((p) => p.insured).length, sampleSize),
      purchasedAt: entitlingPayment.createdAt,
      validUntil: new Date(entitlingPayment.createdAt.getTime() + validityMs),
    });
  }
);

module.exports = router;
