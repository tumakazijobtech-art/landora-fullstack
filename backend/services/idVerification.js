// National ID verification for buyers (farmers/tenants) and sellers (landowners).
// Mirrors the optional-webhook pattern used by services/verification.js and
// services/notify.js: a real government/KYC lookup provider (e.g. an IPRS
// integration) is wired up via IPRS_WEBHOOK_URL, but nothing here breaks if it is
// not configured — the ID is simply recorded as "pending" for an admin to check
// manually, the same fallback path Parcel.titleVerification already uses for land
// titles that aren't reachable on Ardhisasa.
//
// The webhook, if configured, is POSTed { idNumber, fullName, brand: 'Landora' }
// and is expected to respond with JSON shaped like:
//   { matched: boolean, fullNameOnRecord?: string, reason?: string }
// Point IPRS_WEBHOOK_URL at whatever performs the actual government/KYC lookup on
// your side (a licensed IPRS integrator, Smile Identity, a manual-review queue
// service, etc).

async function verifyNationalId({ idNumber, fullName }) {
  const webhookUrl = process.env.IPRS_WEBHOOK_URL;

  if (!idNumber) {
    return { status: 'unverified', method: 'manual', reason: 'No ID number provided' };
  }

  if (!webhookUrl) {
    // No provider configured — this is expected out of the box. The submission is
    // still recorded and queued for an admin to verify manually from
    // /admin (Users -> ID verification), exactly like a title that isn't yet
    // reachable on Ardhisasa.
    console.warn(`[Landora ID verification] IPRS_WEBHOOK_URL not set — ${idNumber} queued for manual review`);
    return { status: 'pending', method: 'manual', reason: 'IPRS_WEBHOOK_URL not set' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idNumber, fullName, brand: 'Landora' }),
    });
    if (!response.ok) {
      throw new Error(`ID verification webhook returned ${response.status}`);
    }
    const data = await response.json();
    if (data.matched) {
      return {
        status: 'verified',
        method: 'iprs',
        fullNameOnRecord: data.fullNameOnRecord || fullName,
      };
    }
    return {
      status: 'flagged',
      method: 'iprs',
      reason: data.reason || 'The provided name and ID number did not match the government record',
    };
  } catch (err) {
    console.error('[Landora ID verification] lookup failed, queued for manual review:', err.message);
    return { status: 'pending', method: 'manual', reason: err.message };
  }
}

module.exports = { verifyNationalId };
