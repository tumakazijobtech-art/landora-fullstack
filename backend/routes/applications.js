const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Parcel = require('../models/Parcel');
const { requireAuth, requireRole } = require('../middleware/auth');
const { MAX_APPLICANTS } = require('../utils/constants');

const router = express.Router();

// Farmer: apply to a parcel.
router.post(
  '/',
  requireAuth,
  requireRole('farmer'),
  [
    body('parcelId').isMongoId(),
    body('intendedCrop').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('seasonsRequested').optional().isInt({ min: 1, max: 20 }),
    body('message').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
    body('type').optional().isIn(['lease', 'prebooking']),
    body('applicantName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    body('applicantPhone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('preferredSeason').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
      parcelId, intendedCrop, seasonsRequested, message, type,
      applicantName, applicantPhone, preferredSeason,
    } = req.body;
    const applicationType = type === 'prebooking' ? 'prebooking' : 'lease';

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    if (applicationType === 'lease') {
      if (parcel.status !== 'available') {
        return res.status(400).json({ error: 'This parcel is not currently accepting applications' });
      }
      const activeLeaseApplicants = await Application.countDocuments({
        parcel: parcel._id,
        type: 'lease',
        status: { $ne: 'withdrawn' },
      });
      const cap = parcel.maxApplicants || MAX_APPLICANTS;
      if (activeLeaseApplicants >= cap) {
        return res.status(400).json({ error: 'This parcel has reached its maximum number of applicants for this season' });
      }
    } else {
      // Pre booking is meant to work ahead of a season even before a listing is
      // marked "available" — the only thing that rules it out is the parcel already
      // being leased, or the landowner having switched pre booking off.
      if (parcel.status === 'leased') {
        return res.status(400).json({ error: 'This parcel has already been leased' });
      }
      if (parcel.preBookingEnabled === false) {
        return res.status(400).json({ error: 'Pre booking is not open for this parcel' });
      }
    }

    try {
      const application = await Application.create({
        parcel: parcel._id,
        farmer: req.user._id,
        landowner: parcel.owner,
        intendedCrop,
        seasonsRequested,
        message,
        type: applicationType,
        applicantName,
        applicantPhone,
        preferredSeason,
      });
      res.status(201).json({ application });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'You already have an application on this parcel' });
      }
      throw err;
    }
  }
);

// Farmer: view my own applications.
router.get('/mine', requireAuth, requireRole('farmer'), async (req, res) => {
  const applications = await Application.find({ farmer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('parcel', 'title county location pricePerAcrePerSeason sizeAcres photos status');
  res.json({ applications });
});

// Note: farmers can no longer withdraw their own applications directly.
// Withdrawing an application now requires admin approval — see
// PATCH /admin/applications/:id/withdraw in routes/admin.js.

// Landowner: view applications received, optionally filtered by parcel. Landowners
// can see who has applied and the status/notes of each application, but the
// accept/decline decision itself is made by the Landora team — see PATCH
// /admin/applications/:id/decision in routes/admin.js.
router.get('/received', requireAuth, requireRole('landowner'), async (req, res) => {
  const filter = { landowner: req.user._id };
  if (req.query.parcelId) filter.parcel = req.query.parcelId;

  const applications = await Application.find(filter)
    .sort({ createdAt: -1 })
    .populate('parcel', 'title county location')
    .populate('farmer', 'name phone email county profilePicture');
  res.json({ applications });
});

module.exports = router;
