const mongoose = require('mongoose');

// One document per M-Pesa STK push attempt. Created in "pending" state the moment we
// call Safaricom's STKPush endpoint, then updated by either the async callback
// Safaricom posts to /api/payments/mpesa/callback, or by a manual status poll
// (routes/payments.js) if the callback is slow/unreachable (useful in local dev,
// where Safaricom can't reach localhost).
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Which revenue stream this payment is for — see FeeSettings for how each
    // amount is computed.
    type: {
      type: String,
      enum: ['commission', 'verification', 'lease_contract', 'landowner_subscription', 'farmer_premium', 'intelligence_report'],
      required: true,
      index: true,
    },
    // Optional sub-selection for tiered fee types (verification/lease_contract tier,
    // or the subscription plan key). Not used by 'commission' or 'farmer_premium'.
    tier: { type: String, trim: true, maxlength: 40 },

    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', index: true },

    // Only used by type 'intelligence_report' — which region/crop the paid report
    // covers, so a user's entitlement to view it can be checked later without
    // re-charging them (see routes/intelligence.js).
    county: { type: String, trim: true, maxlength: 80 },
    crop: { type: String, trim: true, maxlength: 60 },

    amount: { type: Number, required: true, min: 1 },
    phone: { type: String, required: true, trim: true, maxlength: 15 }, // normalized 2547XXXXXXXX
    accountReference: { type: String, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 200 },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Safaricom Daraja identifiers/response fields.
    merchantRequestId: { type: String, trim: true },
    checkoutRequestId: { type: String, trim: true, index: true },
    mpesaReceiptNumber: { type: String, trim: true },
    resultCode: { type: Number },
    resultDesc: { type: String, trim: true, maxlength: 300 },
    transactionDate: { type: Date },
    rawCallback: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
