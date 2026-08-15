const mongoose = require('mongoose');

const authSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'auth' },
    requireVerificationOnSignup: { type: Boolean, default: false },
    requireVerificationOnSignIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

authSettingsSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate(
    { key: 'auth' },
    { $setOnInsert: { key: 'auth' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('AuthSettings', authSettingsSchema);