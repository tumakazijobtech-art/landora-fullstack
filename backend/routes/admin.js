const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Parcel = require('../models/Parcel');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getLandUseOptions } = require('../config/options');
const Setting = require('../models/Setting');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get(
  '/parcels',
  [query('status').optional().trim(), query('search').optional().trim()],
  async (req, res) => {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { reference: { $regex: req.query.search, $options: 'i' } },
        { county: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const parcels = await Parcel.find(filter)
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email phone county')
      .lean();
    res.json({ parcels });
  }
);

router.get('/options', async (req, res) => {
  res.json({ landUseOptions: await getLandUseOptions() });
});

router.post(
  '/options',
  [body('label').trim().isLength({ min: 2, max: 80 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const label = req.body.label.trim();
    const setting = await Setting.findOneAndUpdate(
      { key: 'landUseOptions' },
      { $setOnInsert: { values: [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!setting.values.includes(label)) {
      setting.values.push(label);
      await setting.save();
    }
    res.status(201).json({ landUseOptions: setting.values });
  }
);

router.patch('/parcels/:id', async (req, res) => {
  const parcel = await Parcel.findById(req.params.id);
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

  const allowed = [
    'title', 'reference', 'county', 'location', 'sizeAcres', 'pricePerAcrePerSeason',
    'crop', 'landUse', 'season', 'description', 'tags', 'photos', 'financingAvailable',
    'insured', 'status', 'plotRating', 'matchScore', 'keyFacts', 'keyFactsVerified',
    'keyFactsVerifiedBy', 'gisReportStatus', 'parcelMapUrl', 'parcelMapSource', 'videoUrl',
    'ministryVerification',
  ];

  for (const field of allowed) {
    if (req.body[field] === undefined) continue;
    if (field === 'photos') parcel[field] = Array.isArray(req.body[field]) ? req.body[field].slice(0, 6) : [];
    else if (field === 'keyFacts') {
      parcel[field] = Array.isArray(req.body[field])
        ? req.body[field].filter((fact) => fact && fact.label && fact.value).slice(0, 20)
        : [];
    } else if (field === 'ministryVerification') {
      parcel[field] = {
        ...parcel.ministryVerification?.toObject?.(),
        ...req.body[field],
        checkedAt: req.body[field].checkedAt || parcel.ministryVerification?.checkedAt,
      };
    } else parcel[field] = req.body[field];
  }

  if (parcel.keyFactsVerified && !parcel.keyFactsVerifiedBy) {
    parcel.keyFactsVerifiedBy = 'GIS Engine + human intelligence';
  }
  await parcel.save();
  res.json({ parcel });
});

module.exports = router;