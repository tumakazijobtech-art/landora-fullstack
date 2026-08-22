const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const Application = require('../models/Application');
const AuthSettings = require('../models/AuthSettings');
const WaitlistEntry = require('../models/WaitlistEntry');
const FeeSettings = require('../models/FeeSettings');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const cache = require('../middleware/cache');
const { notifySms } = require('../services/sms');
const { verifyNationalId } = require('../services/idVerification');

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

// Admin: every user (buyers and sellers), most recent first, optionally filtered by
// ID-verification status — the queue for reviewing submissions that couldn't be
// auto-checked (IPRS_WEBHOOK_URL not configured, or the automated check flagged a
// mismatch). Mirrors the Parcel.titleVerification admin flow.
router.get(
  '/users',
  [
    query('role').optional().isIn(['farmer', 'landowner', 'admin']),
    query('idStatus').optional().isIn(['unverified', 'pending', 'verified', 'flagged']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid filter parameters' });

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.idStatus) filter['idVerification.status'] = req.query.idStatus;

    const users = await User.find(filter)
      .select('-passwordHash -verification -passwordReset')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json({ users });
  }
);

// Admin: manually verify/flag a user's national ID — the fallback for when no
// IPRS_WEBHOOK_URL is configured, or when the automated check needs a human look
// (e.g. a name mismatch on a legal name change). Re-running the automated check is
// also available here (method: 'iprs') for when a provider has just been wired up.
router.patch(
  '/users/:id/id-verification',
  [
    body('status').optional().isIn(['unverified', 'pending', 'verified', 'flagged']),
    body('idNumber').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('fullNameOnRecord').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('recheck').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.body.idNumber) user.nationalId = req.body.idNumber;

    if (req.body.recheck) {
      const result = await verifyNationalId({
        idNumber: req.body.idNumber || user.nationalId,
        fullName: user.name,
      });
      user.idVerification = {
        ...(user.idVerification ? user.idVerification.toObject() : {}),
        ...result,
        idNumber: req.body.idNumber || user.nationalId,
        checkedBy: `${req.user.name} (recheck)`,
        checkedAt: new Date(),
      };
    } else {
      user.idVerification = {
        ...(user.idVerification ? user.idVerification.toObject() : {}),
        idNumber: req.body.idNumber || user.nationalId,
        fullNameOnRecord: req.body.fullNameOnRecord,
        notes: req.body.notes,
        status: req.body.status || 'verified',
        method: 'manual',
        checkedBy: req.user.name,
        checkedAt: new Date(),
      };
    }

    await user.save();

    if (user.idVerification.status === 'verified' && user.phone) {
      notifySms(user.phone, 'Your Landora ID verification is complete. You can now apply to lease or publish listings.', { purpose: 'id_verified' });
    } else if (user.idVerification.status === 'flagged' && user.phone) {
      notifySms(user.phone, 'Landora: we could not verify your national ID. Please check your details or contact support.', { purpose: 'id_flagged' });
    }

    res.json({ user: user.toSafeJSON() });
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

    if (populated.farmer && populated.farmer.phone) {
      const parcelTitle = populated.parcel ? populated.parcel.title : 'your parcel';
      notifySms(
        populated.farmer.phone,
        req.body.status === 'accepted'
          ? `Landora: Your application for "${parcelTitle}" was accepted! Check your dashboard for next steps.`
          : `Landora: Your application for "${parcelTitle}" was declined.`,
        { purpose: 'application_decision' }
      );
    }
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
    body('commission.percent').optional().isFloat({ min: 0, max: 100 }),
    body('commission.minKes').optional().isFloat({ min: 0 }),
    body('commission.maxKes').optional().isFloat({ min: 0 }),
    body('verification.basicKes').optional().isFloat({ min: 0 }),
    body('verification.premiumKes').optional().isFloat({ min: 0 }),
    body('gisReport.priceKes').optional().isFloat({ min: 0 }),
    body('leaseContract.basicKes').optional().isFloat({ min: 0 }),
    body('leaseContract.professionalKes').optional().isFloat({ min: 0 }),
    body('landownerSubscription.individualKes').optional().isFloat({ min: 0 }),
    body('landownerSubscription.multiPropertyKes').optional().isFloat({ min: 0 }),
    body('landownerSubscription.institutionalKes').optional().isFloat({ min: 0 }),
    body('farmerPremium.monthlyKes').optional().isFloat({ min: 0 }),
    body('mpesa.tillNumber').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('mpesa.shortcode').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('mpesa.accountReferencePrefix').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const fees = await FeeSettings.getSingleton();
    const groups = ['commission', 'verification', 'gisReport', 'leaseContract', 'landownerSubscription', 'farmerPremium', 'mpesa'];
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
    query('type').optional().isIn(['commission', 'verification', 'lease_contract', 'landowner_subscription', 'farmer_premium', 'gis_report']),
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

module.exports = router;
