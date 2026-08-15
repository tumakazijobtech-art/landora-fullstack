const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const Application = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateReference } = require('../utils/reference');
const { countyCentroid, distanceKm } = require('../utils/geo');

const router = express.Router();

const TAGS_ALLOWED = ['Financing', 'Insured', 'River access', 'Road access', 'Borehole', 'Export zone'];

// Public: browse/search/filter listings, including the Landora Match engine filters
// (near/within, land use, acreage band, budget ceiling, water access). Only ever
// returns real, landowner-created parcels.
router.get(
  '/',
  [
    query('county').optional().trim(),
    query('crop').optional().trim(),
    query('minSize').optional().isFloat({ min: 0 }),
    query('maxSize').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('financingAvailable').optional().isBoolean(),
    query('insured').optional().isBoolean(),
    query('waterAccess').optional().isBoolean(),
    query('minScore').optional().trim(),
    query('near').optional().trim(),
    query('withinKm').optional().isFloat({ min: 0 }),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid filter parameters' });
    }

    const {
      county, crop, minSize, maxSize, maxPrice, financingAvailable, insured, waterAccess,
      minScore, near, withinKm, search,
    } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;

    const filter = { status: 'available' };
    if (county && county !== 'All counties') filter.county = county;
    if (crop && crop !== 'Any crop' && crop !== 'Any agricultural use') filter.crop = crop;
    if (financingAvailable === 'true') filter.financingAvailable = true;
    if (insured === 'true') filter.insured = true;
    if (waterAccess === 'true') filter.waterAccess = true;
    if (minScore) filter.score = minScore;
    if (minSize || maxSize) {
      filter.sizeAcres = {};
      if (minSize) filter.sizeAcres.$gte = parseFloat(minSize);
      if (maxSize) filter.sizeAcres.$lte = parseFloat(maxSize);
    }
    if (maxPrice) filter.pricePerAcrePerSeason = { $lte: parseFloat(maxPrice) };
    if (search) filter.$text = { $search: search };

    // "Near / within" from Landora Match: prefer a real distance check against the
    // parcel's GIS centroid when we have one, otherwise fall back to a county match.
    const origin = near ? countyCentroid(near) : null;
    const radiusKm = withinKm ? parseFloat(withinKm) : null;

    let [parcels, total] = await Promise.all([
      Parcel.find(filter)
        .sort({ createdAt: -1 })
        .populate('owner', 'name county'),
      Parcel.countDocuments(filter),
    ]);

    if (origin && radiusKm) {
      parcels = parcels.filter((p) => {
        const centroid = p.mapData && p.mapData.centroidLat != null
          ? { lat: p.mapData.centroidLat, lng: p.mapData.centroidLng }
          : null;
        if (centroid) {
          const d = distanceKm(origin, centroid);
          return d != null && d <= radiusKm;
        }
        return p.county === near;
      });
      total = parcels.length;
    }

    const start = (page - 1) * limit;
    const pageItems = parcels.slice(start, start + limit);

    res.json({ parcels: pageItems, total, page, pages: Math.ceil(total / limit) || 1 });
  }
);

// Public: single parcel detail.
router.get('/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id).populate('owner', 'name county phone');
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  res.json({ parcel });
});

// Landowner: create a listing. This is the "part one" submission — key facts, the
// productivity report, the GIS map, and the video walkthrough are added afterwards by
// the internal GIS-engine/admin review pass (see routes/admin.js).
router.post(
  '/',
  requireAuth,
  requireRole('landowner'),
  [
    body('title').trim().isLength({ min: 3, max: 140 }),
    body('county').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('sizeAcres').isFloat({ min: 0.1 }),
    body('totalAcres').optional({ checkFalsy: true }).isFloat({ min: 0.1 }),
    body('pricePerAcrePerSeason').isFloat({ min: 0 }),
    body('crop').trim().notEmpty(),
    body('season').optional({ checkFalsy: true }).trim(),
    body('reference').optional({ checkFalsy: true }).trim(),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 4000 }),
    body('tags').optional().isArray(),
    body('photos').optional().isArray({ max: 6 }),
    body('financingAvailable').optional().isBoolean(),
    body('insured').optional().isBoolean(),
    body('waterAccess').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
    }

    const {
      title, county, location, sizeAcres, totalAcres, pricePerAcrePerSeason, crop, season,
      reference, description, tags, photos, financingAvailable, insured, waterAccess,
    } = req.body;

    const cleanTags = Array.isArray(tags) ? tags.filter((t) => TAGS_ALLOWED.includes(t)) : [];

    const parcel = await Parcel.create({
      owner: req.user._id,
      title, county, location, sizeAcres,
      totalAcres: totalAcres || sizeAcres,
      pricePerAcrePerSeason, crop, season,
      reference: reference || generateReference(county, location),
      description,
      tags: cleanTags,
      photos: Array.isArray(photos) ? photos.slice(0, 6) : [],
      financingAvailable: !!financingAvailable,
      insured: !!insured,
      waterAccess: !!waterAccess,
      enrichmentStatus: 'pending',
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

// Landowner: update own parcel (status, pricing, details). Landowners can edit their
// own listing's base fields, but not the internally-verified key facts / productivity
// report / map / video — those are admin-only (see routes/admin.js).
router.patch('/:id', requireAuth, requireRole('landowner'), async (req, res) => {
  const parcel = await Parcel.findById(req.params.id);
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
  if (parcel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'You do not own this parcel' });
  }

  const editable = [
    'title', 'county', 'location', 'sizeAcres', 'totalAcres', 'pricePerAcrePerSeason', 'crop', 'season',
    'reference', 'description', 'tags', 'photos', 'financingAvailable', 'insured', 'waterAccess', 'status',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) parcel[field] = req.body[field];
  });
  if (Array.isArray(parcel.photos) && parcel.photos.length > 6) {
    parcel.photos = parcel.photos.slice(0, 6);
  }

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
