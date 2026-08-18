const Subscription = require('../models/Subscription');

const SUBSCRIPTION_PERIOD_DAYS = 30;

// Called the moment a `landowner_subscription` or `farmer_premium` Payment
// transitions to "success" (from either the M-Pesa callback or the status-poll
// fallback — see routes/payments.js). Extends the existing period if it's still
// active (paying early doesn't waste time already bought), otherwise starts a fresh
// 30-day period from now. A landowner switching tiers takes effect immediately, with
// the new tier's period extending from whatever time was left.
async function activateFromPayment(payment) {
  if (payment.type !== 'landowner_subscription' && payment.type !== 'farmer_premium') return null;

  const type = payment.type === 'landowner_subscription' ? 'landowner' : 'farmer';
  const plan = type === 'landowner' ? (payment.tier || 'individual') : 'premium';
  const now = new Date();

  const existing = await Subscription.findOne({ user: payment.user, type });
  const base = existing && existing.currentPeriodEnd && existing.currentPeriodEnd.getTime() > now.getTime()
    ? existing.currentPeriodEnd
    : now;
  const currentPeriodEnd = new Date(base.getTime() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  return Subscription.findOneAndUpdate(
    { user: payment.user, type },
    { $set: { plan, currentPeriodEnd, lastPayment: payment._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Returns the active plan for a user/type, or 'free' if they have no subscription or
// it has lapsed. This is the single place every gate (listing limits, analytics,
// early access, price analytics) should call — never read the Subscription
// collection directly from a route.
async function getActivePlan(userId, type) {
  if (!userId) return 'free';
  const sub = await Subscription.findOne({ user: userId, type });
  if (sub && sub.isActive()) return sub.plan;
  return 'free';
}

// Maps a landowner's active plan to their listing cap from FeeSettings.gating.
// Returns Infinity for a negative ("unlimited") configured limit.
function getListingLimit(gating, plan) {
  const key = { free: 'freeListingLimit', individual: 'individualListingLimit', multiProperty: 'multiPropertyListingLimit', institutional: 'institutionalListingLimit' }[plan] || 'freeListingLimit';
  const limit = gating[key];
  return limit == null || limit < 0 ? Infinity : limit;
}

module.exports = { activateFromPayment, getActivePlan, getListingLimit, SUBSCRIPTION_PERIOD_DAYS };
