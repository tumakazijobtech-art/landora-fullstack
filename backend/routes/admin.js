const express = require('express');
const { body, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const AuthSettings = require('../models/AuthSettings');
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
  const parcels = await Parcel.find({}).sort({ createdAt: -1 }).populate('owner', 'name email county');
  res.json({ parcels });
});

router.get('/parcels/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id).populate('owner', 'name email phone county');
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  res.json({ parcel });
});

// Admin: full edit of any listing field, including the base fields a landowner
// submitted (title, price, photos, etc). Use PATCH /parcels/:id/enrich for the
// GIS/key-facts/video pass specifically.
router.patch('/parcels/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id);
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

  const editable = [
    'title', 'reference', 'county', 'location', 'sizeAcres', 'totalAcres', 'pricePerAcrePerSeason',
    'crop', 'season', 'tags', 'description', 'photos', 'financingAvailable', 'insured', 'waterAccess',
    'status', 'score',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) parcel[field] = req.body[field];
  });
  if (Array.isArray(parcel.photos) && parcel.photos.length > 6) {
    parcel.photos = parcel.photos.slice(0, 6);
  }

  await parcel.save();
  res.json({ parcel });
  cache.invalidate('/api/parcels');
});

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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const { score, keyFacts, titleVerification, productivityReport, mapData, videoWalkthrough, markEnriched } = req.body;

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

module.exports = router;
