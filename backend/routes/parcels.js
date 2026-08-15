const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const Application = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateReference } = require('../utils/reference');
const { countyCentroid, distanceKm } = require('../utils/geo');
const cache = require('../middleware/cache');

const router = express.Router();

const TAGS_ALLOWED = ['Financing', 'Insured', 'River access', 'Road access', 'Borehole', 'Export zone'];
const LIST_TTL_MS = 30 * 1000; // marketplace list/match results change as fast as listings do
const DETAIL_TTL_MS = 60 * 1000; // a single parcel page is read far more than it's edited

// Public: browse/search/filter listings, including the Landora Match engine filters
// (near/within, land use, acreage band, budget ceiling, water access). Only ever
// returns real, landowner-created parcels.
// Scores a parcel against a set of Landora Match requirements (0-100) and returns why
// it scored that way, so the marketplace can present Match as a real recommender —
// ranked results with a percentage and plain-language reasons — rather than a filter
// that just hides everything that doesn't match exactly.
function scoreMatch(parcel, criteria) {
  const { crop, minSize, maxSize, maxPrice, waterAccess, origin, radiusKm } = criteria;
  const parts = []; // { weight, score, reason }

  if (crop) {
    const isMatch = parcel.crop === crop;
    parts.push({
      weight: 25,
      score: isMatch ? 100 : 35,
      reason: isMatch ? `Matches your land use (${crop})` : `Listed for ${parcel.crop}, not ${crop}`,
      positive: isMatch,
    });
  }

  if (maxPrice) {
    const price = parcel.pricePerAcrePerSeason;
    const max = parseFloat(maxPrice);
    let priceScore;
    if (price <= max) {
      priceScore = 100;
    } else {
      const overBy = (price - max) / max;
      priceScore = Math.max(0, Math.round(100 - overBy * 150));
    }
    parts.push({
      weight: 25,
      score: priceScore,
      reason: price <= max ? 'Within your budget' : priceScore > 40 ? 'Slightly above your budget' : 'Over your budget',
      positive: priceScore >= 60,
    });
  }

  if (minSize || maxSize) {
    const min = minSize ? parseFloat(minSize) : null;
    const max = maxSize ? parseFloat(maxSize) : null;
    const size = parcel.sizeAcres;
    let sizeScore;
    if ((min == null || size >= min) && (max == null || size <= max)) {
      sizeScore = 100;
    } else {
      const bound = size < (min ?? size) ? min : max;
      const span = Math.max(bound, 1);
      sizeScore = Math.max(0, Math.round(100 - (Math.abs(size - bound) / span) * 100));
    }
    parts.push({
      weight: 20,
      score: sizeScore,
      reason: sizeScore === 100 ? 'Right size for your acreage range' : 'Slightly outside your acreage range',
      positive: sizeScore >= 60,
    });
  }

  if (origin && radiusKm) {
    const centroid = parcel.mapData && parcel.mapData.centroidLat != null
      ? { lat: parcel.mapData.centroidLat, lng: parcel.mapData.centroidLng }
      : null;
    if (centroid) {
      const d = distanceKm(origin, centroid);
      let distScore;
      if (d <= radiusKm) {
        distScore = 100;
      } else {
        distScore = Math.max(0, Math.round(100 - ((d - radiusKm) / radiusKm) * 100));
      }
      parts.push({
        weight: 20,
        score: distScore,
        reason: d <= radiusKm ? `${d.toFixed(1)}km away, within your radius` : `${d.toFixed(1)}km away, just outside your radius`,
        positive: distScore >= 60,
      });
    } else {
      parts.push({
        weight: 20,
        score: 55,
        reason: 'Distance not yet confirmed by the GIS engine',
        positive: false,
      });
    }
  }

  if (waterAccess === 'true') {
    parts.push({
      weight: 10,
      score: parcel.waterAccess ? 100 : 0,
      reason: parcel.waterAccess ? 'Has water access' : 'No confirmed water access',
      positive: !!parcel.waterAccess,
    });
  }

  // A small always-on bonus for the GIS plot rating, so a strong parcel edges out an
  // otherwise-identical one even when every explicit requirement ties.
  const gradeScores = { 'A+': 100, A: 92, 'A-': 85, 'B+': 75, B: 65, 'B-': 55, 'C+': 45, C: 35 };
  const gradeScore = parcel.score && gradeScores[parcel.score] != null ? gradeScores[parcel.score] : 50;
  parts.push({
    weight: 10,
    score: gradeScore,
    reason: gradeScore >= 85 ? `Strong GIS plot rating (${parcel.score})` : null,
    positive: gradeScore >= 85,
  });

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const weightedScore = parts.reduce((sum, p) => sum + p.weight * p.score, 0) / totalWeight;

  const reasons = parts
    .filter((p) => p.positive && p.reason)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((p) => p.reason);

  return { matchScore: Math.round(weightedScore), matchReasons: reasons };
}

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
    query('match').optional().isBoolean(),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  cache.cacheGet(LIST_TTL_MS),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid filter parameters' });
    }

    const {
      county, crop, minSize, maxSize, maxPrice, financingAvailable, insured, waterAccess,
      minScore, near, withinKm, search, match,
    } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const isMatchMode = match === 'true';

    const filter = { status: 'available' };
    if (minScore) filter.score = minScore;
    if (search) filter.$text = { $search: search };

    if (isMatchMode) {
      // Landora Match acts as a recommender: don't hard-exclude parcels that are
      // merely an imperfect fit — rank everything available by how well it scores
      // against what was asked for instead.
      const origin = near ? countyCentroid(near) : null;
      const radiusKm = withinKm ? parseFloat(withinKm) : null;

      const parcels = await Parcel.find(filter).populate('owner', 'name county profilePicture');
      const ranked = parcels
        .map((p) => {
          const plain = p.toObject();
          const { matchScore, matchReasons } = scoreMatch(plain, {
            crop, minSize, maxSize, maxPrice, waterAccess, origin, radiusKm,
          });
          return { ...plain, matchScore, matchReasons };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      const total = ranked.length;
      const start = (page - 1) * limit;
      const pageItems = ranked.slice(start, start + limit);
      return res.json({ parcels: pageItems, total, page, pages: Math.ceil(total / limit) || 1, matchMode: true });
    }

    if (county && county !== 'All counties') filter.county = county;
    if (crop && crop !== 'Any crop' && crop !== 'Any agricultural use') filter.crop = crop;
    if (financingAvailable === 'true') filter.financingAvailable = true;
    if (insured === 'true') filter.insured = true;
    if (waterAccess === 'true') filter.waterAccess = true;
    if (minSize || maxSize) {
      filter.sizeAcres = {};
      if (minSize) filter.sizeAcres.$gte = parseFloat(minSize);
      if (maxSize) filter.sizeAcres.$lte = parseFloat(maxSize);
    }
    if (maxPrice) filter.pricePerAcrePerSeason = { $lte: parseFloat(maxPrice) };

    // "Near / within" from the plain marketplace filters: prefer a real distance
    // check against the parcel's GIS centroid when we have one, otherwise fall back
    // to a county match.
    const origin = near ? countyCentroid(near) : null;
    const radiusKm = withinKm ? parseFloat(withinKm) : null;

    let [parcels, total] = await Promise.all([
      Parcel.find(filter)
        .sort({ createdAt: -1 })
        .populate('owner', 'name county profilePicture'),
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
router.get('/:id', cache.cacheGet(DETAIL_TTL_MS), async (req, res) => {
  const parcel = await Parcel.findById(req.params.id).populate('owner', 'name county phone profilePicture');
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
    cache.invalidate('/api/parcels');
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
  cache.invalidate('/api/parcels');
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
  cache.invalidate('/api/parcels');
});

module.exports = router;
