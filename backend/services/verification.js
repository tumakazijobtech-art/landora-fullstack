const crypto = require('crypto');

const CODE_TTL_MS = 10 * 60 * 1000;

function createCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function matchesCode(code, hash, expiresAt) {
  if (!code || !hash || !expiresAt || new Date(expiresAt).getTime() < Date.now()) return false;
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(hashCode(code), 'hex')
  );
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

async function deliverCode(channel, destination, code, purpose) {
  const webhookUrl = channel === 'email'
    ? process.env.EMAIL_WEBHOOK_URL
    : process.env.SMS_WEBHOOK_URL;

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        destination,
        code,
        purpose,
        brand: 'Landora',
      }),
    });
    if (!response.ok) {
      throw new Error(`${channel} delivery service returned ${response.status}`);
    }
    return;
  }

  // A provider is deliberately optional so the downloaded project runs locally.
  // Codes are never returned to production callers; configure a webhook/provider
  // before enabling verification in production.
  if (process.env.NODE_ENV !== 'production' || process.env.DEV_RETURN_VERIFICATION_CODES === 'true') {
    console.warn(`[Landora ${channel} verification] ${destination}: ${code} (${purpose})`);
  }
}

async function issueVerification(user, purpose) {
  const emailCode = createCode();
  const phoneCode = createCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  user.verification = {
    purpose,
    emailCodeHash: hashCode(emailCode),
    phoneCodeHash: hashCode(phoneCode),
    emailCodeExpiresAt: expiresAt,
    phoneCodeExpiresAt: expiresAt,
  };

  await Promise.all([
    deliverCode('email', user.email, emailCode, purpose),
    deliverCode('phone', user.phone, phoneCode, purpose),
  ]);

  return {
    email: maskEmail(user.email),
    phone: maskPhone(user.phone),
    expiresInSeconds: CODE_TTL_MS / 1000,
    ...(process.env.DEV_RETURN_VERIFICATION_CODES === 'true'
      ? { developmentCodes: { email: emailCode, phone: phoneCode } }
      : {}),
  };
}

async function issuePasswordReset(user) {
  const emailCode = createCode();
  const phoneCode = createCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  user.passwordReset = {
    emailCodeHash: hashCode(emailCode),
    phoneCodeHash: hashCode(phoneCode),
    emailCodeExpiresAt: expiresAt,
    phoneCodeExpiresAt: expiresAt,
  };

  await Promise.all([
    deliverCode('email', user.email, emailCode, 'password-reset'),
    deliverCode('phone', user.phone, phoneCode, 'password-reset'),
  ]);

  return {
    email: maskEmail(user.email),
    phone: maskPhone(user.phone),
    expiresInSeconds: CODE_TTL_MS / 1000,
    ...(process.env.DEV_RETURN_VERIFICATION_CODES === 'true'
      ? { developmentCodes: { email: emailCode, phone: phoneCode } }
      : {}),
  };
}

// Standalone phone-only OTP check, independent of the combined email+phone
// signup/signin verification above. This is what gates "key actions" — applying to
// lease a parcel, publishing a listing, starting a chat — regardless of whether the
// admin has the signup/signin verification policy switched on at all. Reuses the
// same `verification` subdocument on the User model (purpose: 'phone_verify') so
// there is only ever one in-flight code per user.
async function issuePhoneVerification(user) {
  const phoneCode = createCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  user.verification = {
    purpose: 'phone_verify',
    emailCodeHash: null,
    emailCodeExpiresAt: null,
    phoneCodeHash: hashCode(phoneCode),
    phoneCodeExpiresAt: expiresAt,
  };

  await deliverCode('phone', user.phone, phoneCode, 'phone_verify');

  return {
    phone: maskPhone(user.phone),
    expiresInSeconds: CODE_TTL_MS / 1000,
    ...(process.env.DEV_RETURN_VERIFICATION_CODES === 'true'
      ? { developmentCode: phoneCode }
      : {}),
  };
}

function confirmPhoneVerification(user, phoneCode) {
  const verification = user.verification;
  return (
    verification
    && verification.purpose === 'phone_verify'
    && matchesCode(phoneCode, verification.phoneCodeHash, verification.phoneCodeExpiresAt)
  );
}

module.exports = {
  CODE_TTL_MS,
  hashCode,
  matchesCode,
  issueVerification,
  issuePasswordReset,
  issuePhoneVerification,
  confirmPhoneVerification,
};