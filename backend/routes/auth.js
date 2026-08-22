const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const AuthSettings = require('../models/AuthSettings');
const { requireAuth } = require('../middleware/auth');
const {
  hashCode,
  matchesCode,
  issueVerification,
  issuePasswordReset,
  issuePhoneVerification,
  confirmPhoneVerification,
} = require('../services/verification');
const { verifyNationalId } = require('../services/idVerification');
const { notifySms } = require('../services/sms');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' },
});

function normalizePhone(value) {
  const compact = String(value || '').trim().replace(/[^\d+]/g, '');
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+254${compact.slice(1)}`;
  return compact.startsWith('+') ? compact : `+${compact}`;
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function phoneValidator() {
  return body('phone')
    .isString()
    .customSanitizer(normalizePhone)
    .custom((value) => /^\+\d{10,15}$/.test(value))
    .withMessage('A valid phone number is required');
}

function firstValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
    return true;
  }
  return false;
}

async function getAuthPolicy() {
  const settings = await AuthSettings.getSingleton();
  return {
    requireOnSignup: settings.requireVerificationOnSignup,
    requireOnSignIn: settings.requireVerificationOnSignIn,
  };
}

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['farmer', 'landowner']),
    phoneValidator(),
    body('county').trim().notEmpty().withMessage('County is required').isLength({ max: 60 }),
    body('profilePicture').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
    // National ID is optional at sign-up itself (so registration is never blocked
    // on it) but both buyers (farmers) and sellers (landowners) must have a
    // verified one before they can apply to lease or publish a listing — see
    // requireIdVerified in middleware/auth.js and POST /id-verification/submit
    // below for submitting it later from the profile page.
    body('nationalId').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 20 }),
    body('agreedToTerms')
      .custom((value) => value === true || value === 'true')
      .withMessage('You must agree to the Terms & Conditions and Privacy Policy'),
  ],
  async (req, res) => {
    if (firstValidationError(req, res)) return;

    const { name, email, password, role, phone, county, profilePicture, nationalId } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(409).json({
        error: existing.email === email
          ? 'An account with this email already exists'
          : 'An account with this phone number already exists',
      });
    }

    const verificationPolicy = await getAuthPolicy();
    const user = new User({
      name,
      email,
      role,
      phone,
      county,
      profilePicture: profilePicture || '',
      agreedToTerms: true,
      termsAgreedAt: new Date(),
      verificationPolicy,
    });
    await user.setPassword(password);

    if (nationalId) {
      user.nationalId = nationalId;
      const result = await verifyNationalId({ idNumber: nationalId, fullName: name });
      user.idVerification = {
        ...result,
        idNumber: nationalId,
        submittedAt: new Date(),
        ...(result.status === 'verified' ? { checkedAt: new Date(), checkedBy: 'IPRS (automated)' } : {}),
      };
    }

    if (verificationPolicy.requireOnSignup) {
      const verification = await issueVerification(user, 'signup');
      await user.save();
      return res.status(201).json({
        requiresVerification: true,
        verification,
        user: user.toSafeJSON(),
      });
    }

    await user.save();
    const token = signToken(user);
    notifySms(user.phone, `Welcome to Landora, ${user.name.split(' ')[0]}! Your ${role} account is ready.`, { purpose: 'welcome' });
    res.status(201).json({ token, user: user.toSafeJSON() });
  }
);

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    if (firstValidationError(req, res)) return;

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.verificationPolicy?.requireOnSignIn) {
      const verification = await issueVerification(user, 'signin');
      await user.save();
      return res.json({
        requiresVerification: true,
        verification,
        user: user.toSafeJSON(),
      });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  }
);

router.post(
  '/verification/resend',
  [body('email').isEmail().normalizeEmail(), body('purpose').isIn(['signup', 'signin'])],
  async (req, res) => {
    if (firstValidationError(req, res)) return;
    const user = await User.findOne({ email: req.body.email });
    if (!user || !user.phone) return res.status(400).json({ error: 'Verification could not be started' });

    const verification = await issueVerification(user, req.body.purpose);
    await user.save();
    res.json({ verification });
  }
);

router.post(
  '/verification/confirm',
  [
    body('email').isEmail().normalizeEmail(),
    body('emailCode').isLength({ min: 6, max: 6 }),
    body('phoneCode').isLength({ min: 6, max: 6 }),
    body('purpose').isIn(['signup', 'signin']),
  ],
  async (req, res) => {
    if (firstValidationError(req, res)) return;
    const user = await User.findOne({ email: req.body.email });
    const verification = user?.verification;
    const valid = user
      && verification?.purpose === req.body.purpose
      && matchesCode(req.body.emailCode, verification.emailCodeHash, verification.emailCodeExpiresAt)
      && matchesCode(req.body.phoneCode, verification.phoneCodeHash, verification.phoneCodeExpiresAt);

    if (!valid) return res.status(400).json({ error: 'The email or phone verification code is invalid or expired' });

    user.emailVerified = true;
    user.phoneVerified = true;
    user.verification = undefined;
    await user.save();

    res.json({ token: signToken(user), user: user.toSafeJSON() });
  }
);

router.post(
  '/forgot-password/request',
  [
    body('email').isEmail().normalizeEmail(),
    phoneValidator(),
  ],
  async (req, res) => {
    if (firstValidationError(req, res)) return;
    const user = await User.findOne({ email: req.body.email, phone: req.body.phone });
    // Keep the response generic so the endpoint does not disclose whether an
    // email/phone pair belongs to a Landora account.
    if (!user) return res.json({ sent: true });

    const reset = await issuePasswordReset(user);
    await user.save();
    res.json({ sent: true, reset });
  }
);

router.post(
  '/forgot-password/reset',
  [
    body('email').isEmail().normalizeEmail(),
    phoneValidator(),
    body('emailCode').isLength({ min: 6, max: 6 }),
    body('phoneCode').isLength({ min: 6, max: 6 }),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    if (firstValidationError(req, res)) return;
    const user = await User.findOne({ email: req.body.email, phone: req.body.phone });
    const reset = user?.passwordReset;
    const valid = user
      && reset
      && matchesCode(req.body.emailCode, reset.emailCodeHash, reset.emailCodeExpiresAt)
      && matchesCode(req.body.phoneCode, reset.phoneCodeHash, reset.phoneCodeExpiresAt);

    if (!valid) return res.status(400).json({ error: 'The email or phone reset code is invalid or expired' });

    await user.setPassword(req.body.newPassword);
    user.emailVerified = true;
    user.phoneVerified = true;
    user.passwordReset = undefined;
    await user.save();
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  }
);

// Any logged-in buyer (farmer) or seller (landowner) submits/resubmits their
// national ID for verification — at registration this is optional, but it is
// required (see requireIdVerified) before applying to lease or publishing a
// listing. Runs the same optional IPRS-webhook check used at registration, and
// otherwise queues the submission for an admin to check manually from
// /admin (Users -> ID verification), the same fallback Parcel.titleVerification
// uses for a land title that isn't yet reachable on Ardhisasa.
router.post(
  '/id-verification/submit',
  requireAuth,
  [body('nationalId').trim().isLength({ min: 5, max: 20 }).withMessage('Enter a valid national ID number')],
  async (req, res) => {
    if (firstValidationError(req, res)) return;

    const { nationalId } = req.body;
    const user = req.user;
    user.nationalId = nationalId;

    const result = await verifyNationalId({ idNumber: nationalId, fullName: user.name });
    user.idVerification = {
      ...result,
      idNumber: nationalId,
      submittedAt: new Date(),
      ...(result.status === 'verified' ? { checkedAt: new Date(), checkedBy: 'IPRS (automated)' } : {}),
    };
    await user.save();

    if (result.status === 'verified') {
      notifySms(user.phone, 'Your Landora ID verification is complete. You can now apply to lease or publish listings.', { purpose: 'id_verified' });
    }

    res.json({ user: user.toSafeJSON() });
  }
);

// Standalone phone-only OTP flow (distinct from the combined email+phone
// signup/signin verification above) — the check that gates key actions like
// applying to lease or publishing a listing regardless of the admin's
// signup/signin verification policy.
router.post('/phone/otp/request', requireAuth, async (req, res) => {
  if (!req.user.phone) {
    return res.status(400).json({ error: 'Add a phone number to your profile first' });
  }
  const verification = await issuePhoneVerification(req.user);
  await req.user.save();
  res.json({ verification });
});

router.post(
  '/phone/otp/confirm',
  requireAuth,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code sent to your phone')],
  async (req, res) => {
    if (firstValidationError(req, res)) return;
    if (!confirmPhoneVerification(req.user, req.body.code)) {
      return res.status(400).json({ error: 'That code is invalid or has expired' });
    }
    req.user.phoneVerified = true;
    req.user.verification = undefined;
    await req.user.save();
    notifySms(req.user.phone, 'Your Landora phone number is now verified.', { purpose: 'phone_verified' });
    res.json({ user: req.user.toSafeJSON() });
  }
);

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

// Any logged-in user (farmer, landowner, or admin) can update their own display
// details, including their profile picture — a URL, same convention as parcel photos.
// Leaving profilePicture blank clears it, so the UI falls back to the Landora logo.
router.patch(
  '/profile',
  requireAuth,
  [
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 120 }),
    body('county').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
    body('profilePicture').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
    body('phone').optional({ checkFalsy: true }),
  ],
  async (req, res) => {
    if (firstValidationError(req, res)) return;

    const user = req.user;
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.county !== undefined) user.county = req.body.county;
    if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;
    if (req.body.phone) {
      const phone = normalizePhone(req.body.phone);
      if (/^\+\d{10,15}$/.test(phone) && phone !== user.phone) {
        user.phone = phone;
        // A changed number hasn't been proven to belong to this account yet — require
        // a fresh phone OTP check (see POST /phone/otp/request) before it can be used
        // to gate key actions again.
        user.phoneVerified = false;
      }
    }
    await user.save();
    res.json({ user: user.toSafeJSON() });
  }
);

module.exports = router;