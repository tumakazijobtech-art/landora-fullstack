const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const WaitlistEntry = require('../models/WaitlistEntry');
const Parcel = require('../models/Parcel');
const { notifyAdmin } = require('../services/notify');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Try again in a few minutes.' },
});

// Public: join the waitlist, from the site wide popup or a parcel's pre booking CTA.
// Stores the entry (so it shows up immediately in the admin console) and, when
// EMAIL_WEBHOOK_URL and ADMIN_EMAIL are configured, emails the admin too.
router.post(
  '/',
  submitLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('county').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
    body('cropInterest').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('message').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('type').optional().isIn(['general', 'prebooking']),
    body('parcelId').optional({ checkFalsy: true }).isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, phone, county, cropInterest, message, type, parcelId } = req.body;

    let parcel = null;
    if (parcelId) {
      parcel = await Parcel.findById(parcelId).select('title county location season');
    }

    const entry = await WaitlistEntry.create({
      name,
      email,
      phone,
      county,
      cropInterest,
      message,
      type: type === 'prebooking' && parcel ? 'prebooking' : 'general',
      parcel: parcel ? parcel._id : null,
    });

    const subject = entry.type === 'prebooking'
      ? `New pre booking interest — ${parcel?.title || 'a parcel'}`
      : 'New Landora waitlist signup';
    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      county ? `County: ${county}` : null,
      cropInterest ? `Crop interest: ${cropInterest}` : null,
      parcel ? `Parcel: ${parcel.title} (${parcel.county}${parcel.season ? `, ${parcel.season}` : ''})` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean);
    notifyAdmin({ subject, text: lines.join('\n') }).catch(() => {});

    res.status(201).json({ entry });
  }
);

module.exports = router;
