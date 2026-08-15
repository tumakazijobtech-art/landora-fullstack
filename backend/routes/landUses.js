const express = require('express');
const { body, validationResult } = require('express-validator');
const LandUse = require('../models/LandUse');
const { requireAuth, requireRole } = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();
const LIST_TTL_MS = 5 * 60 * 1000; // land uses change rarely — cache generously

// Public: land use options currently offered, for the create-listing crop field,
// marketplace filter, and Landora Match. Adapts automatically as admins add/retire
// options — nothing here is hardcoded in the frontend.
router.get('/', cache.cacheGet(LIST_TTL_MS), async (req, res) => {
  const landUses = await LandUse.find({ active: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ landUses });
});

// Admin: full list including inactive, for the management screen.
router.get('/all', requireAuth, requireRole('admin'), async (req, res) => {
  const landUses = await LandUse.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ landUses });
});

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [body('name').trim().isLength({ min: 2, max: 60 }), body('sortOrder').optional().isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
      const landUse = await LandUse.create({
        name: req.body.name,
        sortOrder: req.body.sortOrder || 0,
      });
      res.status(201).json({ landUse });
      cache.invalidate('/api/land-uses');
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'That land use already exists' });
      }
      throw err;
    }
  }
);

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const landUse = await LandUse.findById(req.params.id);
  if (!landUse) return res.status(404).json({ error: 'Land use not found' });

  ['name', 'active', 'sortOrder'].forEach((field) => {
    if (req.body[field] !== undefined) landUse[field] = req.body[field];
  });
  await landUse.save();
  res.json({ landUse });
  cache.invalidate('/api/land-uses');
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const landUse = await LandUse.findById(req.params.id);
  if (!landUse) return res.status(404).json({ error: 'Land use not found' });
  await landUse.deleteOne();
  res.json({ ok: true });
  cache.invalidate('/api/land-uses');
});

module.exports = router;
