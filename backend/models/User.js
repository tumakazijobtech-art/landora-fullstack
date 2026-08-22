const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['farmer', 'landowner', 'admin'],
      required: true,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    county: { type: String, trim: true, maxlength: 60 },
    // Profile photo shown in the navbar, dashboards, and the parcel-detail owner card.
    // Stored as a URL (same convention as parcel photos) — when empty the UI falls
    // back to the bundled Landora logo mark.
    profilePicture: { type: String, trim: true, maxlength: 2000, default: '' },
    // Recorded at signup so there is an auditable record of acceptance. Enforced by
    // the /auth/register route validation rather than a hard schema requirement, so
    // internal tooling (e.g. scripts/createAdmin.js) can still create accounts.
    agreedToTerms: { type: Boolean, default: false },
    termsAgreedAt: { type: Date, default: null },
    // Parcels this user has saved/wishlisted for later. Available to any role.
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' }],
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    verificationPolicy: {
      requireOnSignup: { type: Boolean, default: false },
      requireOnSignIn: { type: Boolean, default: false },
    },
    verification: {
      // 'phone_verify' is a standalone phone-only OTP check (see
      // services/verification.js issuePhoneVerification/confirmPhoneVerification),
      // independent of the combined email+phone signup/signin policy above. It is
      // what gates "key actions" such as applying to lease a parcel or publishing a
      // listing — see requirePhoneVerified in middleware/auth.js.
      purpose: { type: String, enum: ['signup', 'signin', 'phone_verify'], default: null },
      emailCodeHash: { type: String, default: null },
      phoneCodeHash: { type: String, default: null },
      emailCodeExpiresAt: { type: Date, default: null },
      phoneCodeExpiresAt: { type: Date, default: null },
    },
    // National ID verification for buyers (farmers/tenants) and sellers
    // (landowners) — checked, where a provider is configured, against an IPRS-style
    // lookup (see services/idVerification.js), with a manual admin review fallback
    // otherwise. Distinct from Parcel.titleVerification, which checks a specific
    // parcel's title/registry record rather than a person's identity.
    nationalId: { type: String, trim: true, maxlength: 20, default: '' },
    idVerification: {
      status: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'flagged'],
        default: 'unverified',
      },
      idNumber: { type: String, trim: true, maxlength: 20 },
      fullNameOnRecord: { type: String, trim: true, maxlength: 120 },
      method: { type: String, enum: ['iprs', 'manual'], default: 'manual' },
      notes: { type: String, trim: true, maxlength: 500 },
      checkedBy: { type: String, trim: true, maxlength: 120 },
      checkedAt: Date,
      submittedAt: Date,
    },
    passwordReset: {
      emailCodeHash: { type: String, default: null },
      phoneCodeHash: { type: String, default: null },
      emailCodeExpiresAt: { type: Date, default: null },
      phoneCodeExpiresAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.checkPassword = function checkPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    county: this.county,
    profilePicture: this.profilePicture || '',
    agreedToTerms: this.agreedToTerms,
    wishlist: (this.wishlist || []).map((id) => id.toString()),
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    verificationPolicy: this.verificationPolicy,
    nationalId: this.nationalId || '',
    idVerification: this.idVerification && {
      status: this.idVerification.status,
      idNumber: this.idVerification.idNumber,
      fullNameOnRecord: this.idVerification.fullNameOnRecord,
      method: this.idVerification.method,
      notes: this.idVerification.notes,
      checkedAt: this.idVerification.checkedAt,
    },
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
