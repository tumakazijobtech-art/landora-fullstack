const mongoose = require('mongoose');

// One conversation per (parcel, farmer) pair — mirrors the same "one active
// relationship at a time" shape as Application (parcel+farmer unique index).
// Either party (or the admin) can start it; both can send messages once it exists.
const conversationSchema = new mongoose.Schema(
  {
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    landowner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },

    lastMessageAt: { type: Date, default: null },
    lastMessageSnippet: { type: String, trim: true, maxlength: 240, default: '' },
    lastMessageSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Per-participant unread counters, keyed by role rather than a sub-array, so a
    // bump/reset is a single atomic update with no array search.
    unreadForFarmer: { type: Number, default: 0, min: 0 },
    unreadForLandowner: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ parcel: 1, farmer: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
