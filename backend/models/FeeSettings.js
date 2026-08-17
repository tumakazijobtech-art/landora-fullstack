const mongoose = require('mongoose');

// Single editable source of truth for every fee Landora charges, plus the M-Pesa Buy
// Goods till/shortcode used to collect them. Edited from the admin dashboard's "Fees
// & Payments" tab (see PATCH /api/admin/fee-settings) — nothing here is hardcoded in
// the payment flow, so a fee change takes effect on the very next STK push with no
// redeploy.
//
// Mirrors the commercialization model: §1 transaction commission, §2 verification,
// §3 digital lease contracts, §4/§5 subscriptions. Streams further down the model
// (financing/insurance referrals, institutional leasing, land intelligence) are
// partner/business-development plays rather than a fixed fee, so they are not part
// of this schema — this covers the fees the platform charges and collects directly.
const feeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'fees' },

    // --- §1 Transaction commission — charged to the farmer when a lease application
    // is accepted, as a percentage of the first year's lease value (pricePerAcrePerSeason
    // x sizeAcres), bounded by a floor/ceiling so very small or very large leases stay
    // reasonable.
    commission: {
      percent: { type: Number, min: 0, max: 100, default: 3 },
      minKes: { type: Number, min: 0, default: 500 },
      maxKes: { type: Number, min: 0, default: 50000 },
    },

    // --- §2 Land verification — paid by the landowner to have a listing verified.
    verification: {
      basicKes: { type: Number, min: 0, default: 1500 },
      premiumKes: { type: Number, min: 0, default: 4500 },
    },

    // --- §3 Digital lease contracts — paid by whichever party generates the
    // standardized lease document once an application is accepted.
    leaseContract: {
      basicKes: { type: Number, min: 0, default: 750 },
      professionalKes: { type: Number, min: 0, default: 3000 },
    },

    // --- §4 Landowner subscription tiers (monthly).
    landownerSubscription: {
      individualKes: { type: Number, min: 0, default: 1000 },
      multiPropertyKes: { type: Number, min: 0, default: 5000 },
      institutionalKes: { type: Number, min: 0, default: 15000 },
    },

    // --- §5 Farmer / tenant premium subscription (monthly).
    farmerPremium: {
      monthlyKes: { type: Number, min: 0, default: 300 },
    },

    // --- M-Pesa Buy Goods collection details. tillNumber is used as PartyB on every
    // STK push (TransactionType CustomerBuyGoodsOnline). shortcode is the
    // BusinessShortCode used to build the STK password/timestamp — for most Buy
    // Goods (till) setups this is the same as the till number itself, but kept
    // separate in case Safaricom issues a distinct shortcode for the account.
    // Secrets (consumer key/secret, passkey) stay in environment variables — this
    // model only holds business configuration, never credentials.
    mpesa: {
      tillNumber: { type: String, trim: true, maxlength: 20, default: '' },
      shortcode: { type: String, trim: true, maxlength: 20, default: '' },
      accountReferencePrefix: { type: String, trim: true, maxlength: 20, default: 'LANDORA' },
    },
  },
  { timestamps: true }
);

feeSettingsSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate(
    { key: 'fees' },
    { $setOnInsert: { key: 'fees' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('FeeSettings', feeSettingsSchema);
