const express = require('express');
const { body, query, validationResult } = require('express-validator');
const ReferralPartner = require('../models/ReferralPartner');
const ReferralRequest = require('../models/ReferralRequest');
const Application = require('../models/Application');
const Parcel = require('../models/Parcel');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user: browse active financing/insurance partners to request an
// introduction to. §8 (financing) and §9 (insurance) of the business model —
// Landora doesn't lend or underwrite anything itself, just connects the two sides.
router.get('/partners', requireAuth, [query('type').optional().isIn(['financing', 'insurance'])], async (req, res) => {
  const filter = { active: true };
  if (req.query.type) filter.type = req.query.type;
  const partners = await ReferralPartner.find(filter).select('name type description contactEmail contactPhone').sort({ name: 1 }).lean();
  res.json({ partners });
});

// Any logged-in user: request an introduction to a partner. Optionally scoped to a
// specific lease application or parcel (e.g. "financing for the crop I'm about to
// plant on this lease"), but that's not required — a farmer can ask for insurance
// before they've even settled on land.
router.post(
  '/',
  requireAuth,
  [
    body('partnerId').isMongoId(),
    body('applicationId').optional({ checkFalsy: true }).isMongoId(),
    body('parcelId').optional({ checkFalsy: true }).isMongoId(),
    body('note').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const partner = await ReferralPartner.findOne({ _id: req.body.partnerId, active: true });
    if (!partner) return res.status(404).json({ error: 'Partner not found or no longer active' });

    let application = null;
    let parcel = null;
    if (req.body.applicationId) {
      application = await Application.findById(req.body.applicationId);
      if (!application) return res.status(404).json({ error: 'Application not found' });
      const isParty = [String(application.farmer), String(application.landowner)].includes(String(req.user._id));
      if (!isParty) return res.status(403).json({ error: 'Not permitted to reference this application' });
    }
    if (req.body.parcelId) {
      parcel = await Parcel.findById(req.body.parcelId);
      if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
    }

    const referral = await ReferralRequest.create({
      user: req.user._id,
      partner: partner._id,
      type: partner.type,
      application: application ? application._id : undefined,
      parcel: parcel ? parcel._id : undefined,
      note: req.body.note,
    });

    res.status(201).json({ referral });
  }
);

// My own referral requests and their status, most recent first.
router.get('/mine', requireAuth, async (req, res) => {
  const referrals = await ReferralRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('partner', 'name type contactEmail contactPhone')
    .populate('parcel', 'title county')
    .lean();
  res.json({ referrals });
});

module.exports = router;
