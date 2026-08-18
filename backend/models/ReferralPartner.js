const mongoose = require('mongoose');

// A financing or insurance partner Landora refers users to. Unlike every other fee in
// this app, referral revenue isn't collected via M-Pesa from the user — the partner
// pays Landora a referral/origination commission once a referral actually converts,
// off-platform. referralFeeKes here is just the expected/typical commission an admin
// records for their own reference; the real, earned amount is entered per request on
// ReferralRequest.commissionKes once it's actually disbursed.
const referralPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['financing', 'insurance'], required: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    contactEmail: { type: String, trim: true, maxlength: 160 },
    contactPhone: { type: String, trim: true, maxlength: 20 },
    referralFeeKes: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralPartner', referralPartnerSchema);
