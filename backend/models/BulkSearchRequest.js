const mongoose = require('mongoose');

// §7 of the business model — "find us 500-1,000 acres within this region, suitable
// for maize, with road access and water." Landora doesn't automate the matching in
// this pass; an admin reviews the criteria, hand-picks matching parcels from the
// marketplace, and sends a proposal back. The buyer then pays a one-time aggregation
// fee (§7: "search/aggregation fee + transaction commission" — the commission itself
// is still the normal per-lease commission once they actually apply) to unlock full
// contact details for the matched listings.
const bulkSearchRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // What the buyer is looking for.
    targetAcres: { type: Number, required: true, min: 1 },
    counties: { type: [String], default: [] }, // empty = open to any county
    crop: { type: String, trim: true, maxlength: 60 },
    waterAccessRequired: { type: Boolean, default: false },
    maxPricePerAcre: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ['submitted', 'reviewing', 'proposal_sent', 'fee_paid', 'fulfilled', 'declined'],
      default: 'submitted',
      index: true,
    },

    // Filled in by an admin once they've compiled a proposal — the specific
    // listings that together cover (or best approximate) the requested acreage.
    matchedParcels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' }],
    // Set by an admin when moving to 'proposal_sent'; defaults to
    // FeeSettings.bulkSearch.defaultFeeKes but can be overridden per request since
    // the real effort (and value) scales with how large/specific the search is.
    aggregationFeeKes: { type: Number, min: 0 },
    adminNote: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BulkSearchRequest', bulkSearchRequestSchema);
