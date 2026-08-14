const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const Application = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const TAGS_ALLOWED = ['Financing', 'Insured', 'River access', 'Road access', 'Borehole', 'Export zone'];

// Public: browse/search/filter listings. Only ever returns real, landowner-created parcels.
router.get(
  '/',
  [
    query('county').optional().trim(),
    query('crop').optional().trim(),
    query('minSize').optional().isFloat({ min: 0 }),
    query('maxSize').optional().isFloat({ min: 0 }),
    query('financingAvailable').optional().isBoolean(),
    query('insured').optional().isBoolean(),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid filter parameters' });
    }

    const { county, crop, minSize, maxSize, financingAvailable, insured, search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;

    const filter = { status: 'available' };
    if (county && county !== 'All counties') filter.county = county;
    if (crop && crop !== 'Any crop') filter.crop = crop;
    if (financingAvailable === 'true') filter.financingAvailable = true;
    if (insured === 'true') filter.insured = true;
    if (minSize || maxSize) {
      filter.sizeAcres = {};
      if (minSize) filter.sizeAcres.$gte = parseFloat(minSize);
      if (maxSize) filter.sizeAcres.$lte = parseFloat(maxSize);
    }
    if (search) filter.$text = { $search: search };

    const [parcels, total] = await Promise.all([
      Parcel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('owner', 'name county'),
      Parcel.countDocuments(filter),
    ]);

    res.json({ parcels, total, page, pages: Math.ceil(total / limit) || 1 });
  }
);

// Public: single parcel detail.
router.get('/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id).populate('owner', 'name county phone');
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  res.json({ parcel });
});

// Landowner: create a listing.
router.post(
  '/',
  requireAuth,
  requireRole('landowner'),
  [
    body('title').trim().isLength({ min: 3, max: 140 }),
    body('county').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('sizeAcres').isFloat({ min: 0.1 }),
    body('pricePerAcrePerSeason').isFloat({ min: 0 }),
    body('crop').trim().notEmpty(),
    body('season').optional({ checkFalsy: true }).trim(),
    body('reference').optional({ checkFalsy: true }).trim(),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 4000 }),
    body('tags').optional().isArray(),
    body('photos').optional().isArray(),
    body('financingAvailable').optional().isBoolean(),
    body('insured').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
    }

    const {
      title, county, location, sizeAcres, pricePerAcrePerSeason, crop, season,
      reference, description, tags, photos, financingAvailable, insured,
    } = req.body;

    const cleanTags = Array.isArray(tags) ? tags.filter((t) => TAGS_ALLOWED.includes(t)) : [];

    const parcel = await Parcel.create({
      owner: req.user._id,
      title, county, location, sizeAcres, pricePerAcrePerSeason, crop, season,
      reference, description,
      tags: cleanTags,
      photos: Array.isArray(photos) ? photos.slice(0, 8) : [],
      financingAvailable: !!financingAvailable,
      insured: !!insured,
    });

    res.status(201).json({ parcel });
  }
);

// Landowner: list my own parcels (any status), with application counts.
router.get('/mine/list', requireAuth, requireRole('landowner'), async (req, res) => {
  const parcels = await Parcel.find({ owner: req.user._id }).sort({ createdAt: -1 });
  const counts = await Application.aggregate([
    { $match: { landowner: req.user._id } },
    { $group: { _id: '$parcel', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
  res.json({
    parcels: parcels.map((p) => ({ ...p.toObject(), applicationCount: countMap[p._id.toString()] || 0 })),
  });
});

// Landowner: update own parcel (status, pricing, details).
router.patch('/:id', requireAuth, requireRole('landowner'), async (req, res) => {
  const parcel = await Parcel.findById(req.params.id);
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  if (parcel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'You do not own this parcel' });
  }

  const editable = [
    'title', 'county', 'location', 'sizeAcres', 'pricePerAcrePerSeason', 'crop', 'season',
    'reference', 'description', 'tags', 'photos', 'financingAvailable', 'insured', 'status',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) parcel[field] = req.body[field];
  });

  await parcel.save();
  res.json({ parcel });
});

// Landowner: delete own parcel.
router.delete('/:id', requireAuth, requireRole('landowner'), async (req, res) => {
  const parcel = await Parcel.findById(req.params.id);
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  if (parcel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'You do not own this parcel' });
  }
  await parcel.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
