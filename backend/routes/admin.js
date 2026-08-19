const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const Application = require('../models/Application');
const AuthSettings = require('../models/AuthSettings');
const WaitlistEntry = require('../models/WaitlistEntry');
const FeeSettings = require('../models/FeeSettings');
const Payment = require('../models/Payment');
const ReferralPartner = require('../models/ReferralPartner');
const ReferralRequest = require('../models/ReferralRequest');
const BulkSearchRequest = require('../models/BulkSearchRequest');
const { requireAuth, requireRole } = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/auth-settings', async (req, res) => {
  const settings = await AuthSettings.getSingleton();
  res.json({
    settings: {
      requireVerificationOnSignup: settings.requireVerificationOnSignup,
      requireVerificationOnSignIn: settings.requireVerificationOnSignIn,
    },
  });
});

router.patch(
  '/auth-settings',
  [
    body('requireVerificationOnSignup').optional().isBoolean(),
    body('requireVerificationOnSignIn').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const settings = await AuthSettings.getSingleton();
    if (req.body.requireVerificationOnSignup !== undefined) {
      settings.requireVerificationOnSignup = req.body.requireVerificationOnSignup;
    }
    if (req.body.requireVerificationOnSignIn !== undefined) {
      settings.requireVerificationOnSignIn = req.body.requireVerificationOnSignIn;
    }
    await settings.save();
    res.json({
      settings: {
        requireVerificationOnSignup: settings.requireVerificationOnSignup,
        requireVerificationOnSignIn: settings.requireVerificationOnSignIn,
      },
    });
  }
);

// Admin: every listing, any status/owner, most recent first.
router.get('/parcels', async (req, res) => {
  const parcels = await Parcel.find({}).sort({ createdAt: -1 }).populate('owner', 'name email county profilePicture').lean();
  res.json({ parcels });
});

router.get('/parcels/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id).populate('owner', 'name email phone county profilePicture').lean();
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  res.json({ parcel });
});

// Admin: full edit of any listing field, including the base fields a landowner
// submitted (title, price, photos, etc). Use PATCH /parcels/:id/enrich for the
// GIS/key-facts/video pass specifically.
router.patch(
  '/parcels/:id',
  [body('maxApplicants').optional({ checkFalsy: true }).isInt({ min: 1, max: 500 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const editable = [
      'title', 'reference', 'county', 'location', 'sizeAcres', 'totalAcres', 'pricePerAcrePerSeason',
      'crop', 'season', 'tags', 'description', 'photos', 'financingAvailable', 'insured', 'waterAccess',
      'status', 'score', 'leaseDeadline', 'preBookingEnabled', 'maxApplicants',
    ];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) parcel[field] = req.body[field];
    });
    if (Array.isArray(parcel.photos) && parcel.photos.length > 50) {
      parcel.photos = parcel.photos.slice(0, 50);
    }

    await parcel.save();
    res.json({ parcel });
    cache.invalidate('/api/parcels');
  }
);

// Admin: the internal enrichment pass — verified key facts, the GIS productivity
// report (including the parcel map), and the video walkthrough. This is the "second
// part" that gets added after a landowner submits a listing via the website.
router.patch(
  '/parcels/:id/enrich',
  [
    body('score').optional({ checkFalsy: true }).trim().isLength({ max: 4 }),
    body('keyFacts').optional().isObject(),
    body('titleVerification').optional().isObject(),
    body('productivityReport').optional().isObject(),
    body('mapData').optional().isObject(),
    body('videoWalkthrough').optional().isObject(),
    body('highlights').optional().isArray({ max: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const { score, keyFacts, titleVerification, productivityReport, mapData, videoWalkthrough, highlights, markEnriched } = req.body;

    if (highlights !== undefined) {
      parcel.highlights = highlights
        .map((h) => String(h || '').trim())
        .filter(Boolean)
        .slice(0, 8);
    }

    if (score !== undefined) parcel.score = score;

    if (keyFacts) {
      parcel.keyFacts = { ...(parcel.keyFacts ? parcel.keyFacts.toObject() : {}), ...keyFacts };
    }
    if (titleVerification) {
      // A title/identity check just got recorded (via Ardhisasa or a manual search) —
      // default it to "verified" unless the admin explicitly set another status
      // (e.g. flagged pending discrepancies, or left pending for a follow-up).
      parcel.titleVerification = {
        ...(parcel.titleVerification ? parcel.titleVerification.toObject() : {}),
        ...titleVerification,
        status: titleVerification.status || 'verified',
        checkedBy: req.user.name,
        checkedAt: new Date(),
      };
    }
    if (productivityReport) {
      parcel.productivityReport = {
        ...(parcel.productivityReport ? parcel.productivityReport.toObject() : {}),
        ...productivityReport,
        generatedAt: new Date(),
      };
    }
    if (mapData) {
      parcel.mapData = { ...(parcel.mapData ? parcel.mapData.toObject() : {}), ...mapData };
    }
    if (videoWalkthrough) {
      parcel.videoWalkthrough = {
        ...(parcel.videoWalkthrough ? parcel.videoWalkthrough.toObject() : {}),
        ...videoWalkthrough,
        addedAt: new Date(),
      };
    }

    if (markEnriched !== false) {
      parcel.enrichmentStatus = 'enriched';
      parcel.enrichedBy = req.user.name;
      parcel.enrichedAt = new Date();
    }

    await parcel.save();
    res.json({ parcel });
    cache.invalidate('/api/parcels');
  }
);

router.delete('/parcels/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id);
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  await parcel.deleteOne();
  res.json({ ok: true });
  cache.invalidate('/api/parcels');
});

// Admin: every lease application across every landowner/parcel, most recent first.
// Landowners can only view applications received on their own listings (see
// GET /applications/received) — the Landora team is the one that qualifies and
// decides applicants, not the landowner.
router.get(
  '/applications',
  [
    query('status').optional().isIn(['pending', 'accepted', 'declined', 'withdrawn']),
    query('parcelId').optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid filter parameters' });

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.parcelId) filter.parcel = req.query.parcelId;

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('parcel', 'title county location status')
      .populate('farmer', 'name phone email county profilePicture')
      .populate('landowner', 'name email county profilePicture')
      .lean();
    res.json({ applications });
  }
);

// Admin: accept or decline a lease application. This is the one and only place an
// application's status can be decided — the landowner it was sent to can see it, but
// qualifying and moving an applicant through is the Landora team's job.
router.patch(
  '/applications/:id/decision',
  [
    body('status').isIn(['accepted', 'declined']),
    body('landownerNote').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid decision' });

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = req.body.status;
    if (req.body.landownerNote !== undefined) application.landownerNote = req.body.landownerNote;
    await application.save();

    // Accepting a lease application takes the parcel off the market.
    if (req.body.status === 'accepted') {
      await Parcel.findByIdAndUpdate(application.parcel, { status: 'leased' });
    }

    const populated = await application.populate([
      { path: 'parcel', select: 'title county location status' },
      { path: 'farmer', select: 'name phone email county profilePicture' },
    ]);

    res.json({ application: populated });
    cache.invalidate('/api/parcels');
  }
);

// Admin: withdraw an application on a farmer's behalf. Farmers can no longer
// withdraw their own applications directly — any withdrawal now requires
// admin approval and goes through this endpoint.
router.patch('/applications/:id/withdraw', async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  application.status = 'withdrawn';
  await application.save();

  const populated = await application.populate([
    { path: 'parcel', select: 'title county location status' },
    { path: 'farmer', select: 'name phone email county profilePicture' },
    { path: 'landowner', select: 'name email county profilePicture' },
  ]);

  res.json({ application: populated });
  cache.invalidate('/api/parcels');
});

// Admin: every waitlist / pre booking submission, most recent first. This is what
// makes the "join the waitlist" popup and a parcel's "pre book" CTA reflect straight
// into the admin console, on top of the admin notification email.
router.get('/waitlist', async (req, res) => {
  const filter = {};
  if (req.query.type && ['general', 'prebooking'].includes(req.query.type)) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const entries = await WaitlistEntry.find(filter)
    .sort({ createdAt: -1 })
    .populate('parcel', 'title county location season slug')
    .lean();
  res.json({ entries });
});

router.patch('/waitlist/:id', [body('status').isIn(['new', 'contacted', 'converted', 'dismissed'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const entry = await WaitlistEntry.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Waitlist entry not found' });
  entry.status = req.body.status;
  await entry.save();
  res.json({ entry });
});

// Admin: every fee the platform charges, plus the M-Pesa till/shortcode payments are
// collected against. This is the single source of truth PATCH /api/payments/initiate
// reads from — editing a number here changes what the next STK push charges, with no
// redeploy needed.
router.get('/fee-settings', async (req, res) => {
  const fees = await FeeSettings.getSingleton();
  res.json({ fees });
});

router.patch(
  '/fee-settings',
  [
    body('commitment.feeKes').optional().isFloat({ min: 0 }),
    body('commission.percent').optional().isFloat({ min: 0, max: 100 }),
    body('commission.minKes').optional().isFloat({ min: 0 }),
    body('commission.maxKes').optional().isFloat({ min: 0 }),
    body('verification.basicKes').optional().isFloat({ min: 0 }),
    body('verification.premiumKes').optional().isFloat({ min: 0 }),
    body('leaseContract.basicKes').optional().isFloat({ min: 0 }),
    body('leaseContract.professionalKes').optional().isFloat({ min: 0 }),
    body('landownerSubscription.individualKes').optional().isFloat({ min: 0 }),
    body('landownerSubscription.multiPropertyKes').optional().isFloat({ min: 0 }),
    body('landownerSubscription.institutionalKes').optional().isFloat({ min: 0 }),
    body('farmerPremium.monthlyKes').optional().isFloat({ min: 0 }),
    body('mpesa.tillNumber').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('mpesa.shortcode').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('mpesa.accountReferencePrefix').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('gating.freeListingLimit').optional().isInt({ min: 0 }),
    body('gating.individualListingLimit').optional().isInt({ min: -1 }),
    body('gating.multiPropertyListingLimit').optional().isInt({ min: -1 }),
    body('gating.institutionalListingLimit').optional().isInt({ min: -1 }),
    body('gating.earlyAccessHours').optional().isFloat({ min: 0 }),
    body('intelligence.reportFeeKes').optional().isFloat({ min: 0 }),
    body('intelligence.reportValidityDays').optional().isInt({ min: 1 }),
    body('bulkSearch.defaultFeeKes').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const fees = await FeeSettings.getSingleton();
    const groups = ['commitment', 'commission', 'verification', 'leaseContract', 'landownerSubscription', 'farmerPremium', 'mpesa', 'gating', 'intelligence', 'bulkSearch'];
    groups.forEach((group) => {
      if (req.body[group] && typeof req.body[group] === 'object') {
        fees[group] = { ...(fees[group] ? fees[group].toObject() : {}), ...req.body[group] };
      }
    });
    await fees.save();
    res.json({ fees });
  }
);

// Admin: every M-Pesa payment across every fee type, most recent first.
router.get(
  '/payments',
  [
    query('type').optional().isIn(['commitment', 'commission', 'verification', 'lease_contract', 'landowner_subscription', 'farmer_premium', 'intelligence_report', 'bulk_search_fee']),
    query('status').optional().isIn(['pending', 'success', 'failed', 'cancelled']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid filter parameters' });

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('user', 'name email phone role')
      .populate('parcel', 'title county')
      .lean();

    const totals = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({ payments, totals });
  }
);

// Admin: financing/insurance partners — §8/§9 of the business model. Landora earns a
// commission when a referral converts, recorded manually on the ReferralRequest once
// the partner actually pays (see the referral-request endpoints below); this list is
// just who a farmer/landowner can currently be introduced to.
router.get('/referral-partners', async (req, res) => {
  const partners = await ReferralPartner.find().sort({ type: 1, name: 1 }).lean();
  res.json({ partners });
});

router.post(
  '/referral-partners',
  [
    body('name').trim().isLength({ min: 1, max: 120 }),
    body('type').isIn(['financing', 'insurance']),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('contactEmail').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
    body('contactPhone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('referralFeeKes').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const partner = await ReferralPartner.create(req.body);
    res.status(201).json({ partner });
  }
);

router.patch(
  '/referral-partners/:id',
  [
    body('name').optional().trim().isLength({ min: 1, max: 120 }),
    body('type').optional().isIn(['financing', 'insurance']),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('contactEmail').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
    body('contactPhone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('referralFeeKes').optional().isFloat({ min: 0 }),
    body('active').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const partner = await ReferralPartner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json({ partner });
  }
);

router.delete('/referral-partners/:id', async (req, res) => {
  const partner = await ReferralPartner.findByIdAndDelete(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json({ ok: true });
});

// Admin: every referral request, and moving one forward as the partner reports back
// (there's no partner API integration in this pass, so this is manual).
router.get(
  '/referrals',
  [
    query('status').optional().isIn(['submitted', 'contacted', 'approved', 'declined', 'disbursed']),
    query('type').optional().isIn(['financing', 'insurance']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid filter parameters' });

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const referrals = await ReferralRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('user', 'name email phone role')
      .populate('partner', 'name type')
      .populate('parcel', 'title county')
      .lean();

    const disbursedTotal = await ReferralRequest.aggregate([
      { $match: { status: 'disbursed' } },
      { $group: { _id: '$type', total: { $sum: '$commissionKes' }, count: { $sum: 1 } } },
    ]);

    res.json({ referrals, disbursedTotal });
  }
);

router.patch(
  '/referrals/:id',
  [
    body('status').optional().isIn(['submitted', 'contacted', 'approved', 'declined', 'disbursed']),
    body('adminNote').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('commissionKes').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const referral = await ReferralRequest.findById(req.params.id);
    if (!referral) return res.status(404).json({ error: 'Referral request not found' });

    if (req.body.status) referral.status = req.body.status;
    if (req.body.adminNote !== undefined) referral.adminNote = req.body.adminNote;
    if (req.body.commissionKes !== undefined) referral.commissionKes = req.body.commissionKes;

    // Marking a referral "disbursed" without a commission amount would silently
    // undercount revenue — require one at that point, even if it's set later on a
    // separate edit before disbursement is confirmed.
    if (referral.status === 'disbursed' && referral.commissionKes == null) {
      return res.status(400).json({ error: 'Enter the commission amount before marking a referral as disbursed' });
    }

    await referral.save();
    res.json({ referral });
  }
);

// Admin: institutional/agribusiness bulk search requests (§7). Reviewing one means
// hand-picking matching parcels from the marketplace (the admin parcels list already
// available to this dashboard) and setting an aggregation fee; the buyer then pays
// via M-Pesa to unlock the proposal (see routes/payments.js and routes/bulkSearch.js).
router.get(
  '/bulk-search',
  [query('status').optional().isIn(['submitted', 'reviewing', 'proposal_sent', 'fee_paid', 'fulfilled', 'declined'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid filter parameters' });

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const requests = await BulkSearchRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('user', 'name email phone role')
      .populate('matchedParcels', 'title county sizeAcres pricePerAcrePerSeason')
      .lean();

    res.json({ requests });
  }
);

router.patch(
  '/bulk-search/:id',
  [
    body('status').optional().isIn(['submitted', 'reviewing', 'proposal_sent', 'fee_paid', 'fulfilled', 'declined']),
    body('matchedParcels').optional().isArray({ max: 200 }),
    body('matchedParcels.*').optional().isMongoId(),
    body('aggregationFeeKes').optional().isFloat({ min: 0 }),
    body('adminNote').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const request = await BulkSearchRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Bulk search request not found' });

    if (req.body.matchedParcels) request.matchedParcels = req.body.matchedParcels;
    if (req.body.aggregationFeeKes !== undefined) request.aggregationFeeKes = req.body.aggregationFeeKes;
    if (req.body.adminNote !== undefined) request.adminNote = req.body.adminNote;
    if (req.body.status) request.status = req.body.status;

    // A proposal needs at least one matched parcel and a fee to charge for it — the
    // buyer can't pay for something that isn't priced yet.
    if (request.status === 'proposal_sent') {
      if (!request.matchedParcels || request.matchedParcels.length === 0) {
        return res.status(400).json({ error: 'Add at least one matched parcel before sending a proposal' });
      }
      if (request.aggregationFeeKes == null) {
        const fees = await FeeSettings.getSingleton();
        request.aggregationFeeKes = fees.bulkSearch.defaultFeeKes;
      }
    }

    await request.save();
    res.json({ request });
  }
);

module.exports = router;
