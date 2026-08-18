const mongoose = require('mongoose');

// One record per user per subscription type, created/extended the moment a
// `landowner_subscription` or `farmer_premium` Payment succeeds (see
// services/subscriptions.js). A plan is only "active" while currentPeriodEnd is in
// the future — nothing here auto-renews or charges again on its own; the user pays
// again from the same PaymentModal flow to extend it, and paying again while a
// period is still active stacks on top of the remaining time rather than wasting it.
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['landowner', 'farmer'], required: true },
    // Landowner: 'individual' | 'multiProperty' | 'institutional'. Farmer: 'premium'.
    plan: { type: String, required: true, trim: true, maxlength: 40 },
    currentPeriodEnd: { type: Date, required: true },
    lastPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

// A user has at most one subscription record per type — paying again updates it
// in place (see services/subscriptions.js) rather than creating a new row.
subscriptionSchema.index({ user: 1, type: 1 }, { unique: true });

subscriptionSchema.methods.isActive = function isActive() {
  return this.currentPeriodEnd && this.currentPeriodEnd.getTime() > Date.now();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
