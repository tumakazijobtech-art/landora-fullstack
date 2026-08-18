const express = require('express');
const Subscription = require('../models/Subscription');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Farmer/landowner: my own active subscription(s). Returns 'free' for a type with no
// active record so the frontend never has to special-case "never subscribed" vs
// "subscription lapsed" — both just read as free.
router.get('/mine', requireAuth, async (req, res) => {
  const subs = await Subscription.find({ user: req.user._id }).lean();
  const now = Date.now();
  const byType = { landowner: null, farmer: null };
  subs.forEach((s) => {
    byType[s.type] = {
      plan: new Date(s.currentPeriodEnd).getTime() > now ? s.plan : 'free',
      currentPeriodEnd: s.currentPeriodEnd,
      active: new Date(s.currentPeriodEnd).getTime() > now,
    };
  });
  res.json({
    landowner: byType.landowner || { plan: 'free', currentPeriodEnd: null, active: false },
    farmer: byType.farmer || { plan: 'free', currentPeriodEnd: null, active: false },
  });
});

module.exports = router;
