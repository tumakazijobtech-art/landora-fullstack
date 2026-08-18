const mongoose = require('mongoose');

// One record per "please connect me with this partner" request. Landora doesn't
// broker or move any money here — this just tracks the introduction through to
// whether the partner actually paid Landora a commission for it. Status is moved
// forward by an admin as the partner reports back (there's no partner API
// integration in this pass — see routes/admin.js's referral endpoints).
const referralRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralPartner', required: true, index: true },
    type: { type: String, enum: ['financing', 'insurance'], required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
    note: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ['submitted', 'contacted', 'approved', 'declined', 'disbursed'],
      default: 'submitted',
      index: true,
    },
    adminNote: { type: String, trim: true, maxlength: 1000 },
    // Filled in by an admin once the partner actually pays Landora a commission for
    // this referral converting — this is the real revenue line, not referralFeeKes
    // on the partner (which is just an expectation).
    commissionKes: { type: Number, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralRequest', referralRequestSchema);
