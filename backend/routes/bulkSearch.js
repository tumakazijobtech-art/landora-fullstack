const express = require('express');
const { body, validationResult } = require('express-validator');
const BulkSearchRequest = require('../models/BulkSearchRequest');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user: submit a bulk land search request — "find us 500-1,000 acres
// suitable for maize, with water access, in these counties." An admin reviews it and
// compiles a proposal (see the admin bulk-search endpoints); there's no automated
// matching in this pass.
router.post(
  '/',
  requireAuth,
  [
    body('targetAcres').isFloat({ min: 1 }),
    body('counties').optional().isArray({ max: 20 }),
    body('counties.*').optional().trim().isLength({ max: 80 }),
    body('crop').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
    body('waterAccessRequired').optional().isBoolean(),
    body('maxPricePerAcre').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const request = await BulkSearchRequest.create({
      user: req.user._id,
      targetAcres: req.body.targetAcres,
      counties: Array.isArray(req.body.counties) ? req.body.counties.filter(Boolean) : [],
      crop: req.body.crop,
      waterAccessRequired: !!req.body.waterAccessRequired,
      maxPricePerAcre: req.body.maxPricePerAcre || undefined,
      notes: req.body.notes,
    });

    res.status(201).json({ request });
  }
);

// My own bulk search requests. Matched parcels are only populated with full detail
// once the request has actually been paid for (or fulfilled) — before that, the
// buyer just sees how many parcels are in the proposal, not which ones, so the
// aggregation fee is worth paying.
router.get('/mine', requireAuth, async (req, res) => {
  const requests = await BulkSearchRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'matchedParcels',
      select: 'title county sizeAcres pricePerAcrePerSeason crop slug',
    })
    .lean();

  const unlockedStatuses = ['fee_paid', 'fulfilled'];
  res.json({
    requests: requests.map((r) => ({
      ...r,
      matchedParcels: unlockedStatuses.includes(r.status) ? r.matchedParcels : [],
      matchedParcelCount: r.matchedParcels.length,
    })),
  });
});

module.exports = router;
