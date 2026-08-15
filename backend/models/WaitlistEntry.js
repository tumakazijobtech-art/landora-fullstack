const mongoose = require('mongoose');

// Entries from the "Join the waitlist" popup on the marketplace, plus parcel level
// pre bookings made ahead of a season. Every submission notifies the admin (see
// services/notify.js) and shows up live on the admin console's Waitlist tab, so
// nothing here depends on email actually being configured to be useful.
const waitlistEntrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    phone: { type: String, trim: true, maxlength: 20 },
    county: { type: String, trim: true, maxlength: 60 },
    cropInterest: { type: String, trim: true, maxlength: 80 },
    message: { type: String, trim: true, maxlength: 1000 },
    // "general" is the site wide waitlist popup. "prebooking" is tied to one parcel.
    type: { type: String, enum: ['general', 'prebooking'], default: 'general' },
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', default: null },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'dismissed'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema);
