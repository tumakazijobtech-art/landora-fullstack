// SMS notifications for "key action" events — an application was submitted/
// accepted/declined, a payment succeeded, a chat message arrived while the
// recipient was offline, an ID/phone verification was approved, and so on.
//
// This is deliberately separate from services/verification.js, which sends
// one-time OTP codes down the same SMS_WEBHOOK_URL. That separation keeps a
// six-digit login code from ever being confused with a free-text notification,
// while still reusing a single configured webhook/provider.
//
// Same optional-provider pattern as the rest of the project (services/notify.js,
// services/verification.js): if SMS_WEBHOOK_URL isn't set, sends are logged and
// skipped rather than thrown — nothing in the normal application/payment/chat
// workflow ever depends on SMS actually being delivered.

function isConfigured() {
  return Boolean(process.env.SMS_WEBHOOK_URL);
}

// Fire-and-forget: callers should NOT await this on the critical path of a
// request/response (an SMS provider outage must never fail an application,
// payment, or chat send). Always resolves — never throws.
async function sendSms(to, message, meta = {}) {
  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  const digits = String(to || '').replace(/\D/g, '');

  if (!digits) {
    return { delivered: false, reason: 'No destination phone number' };
  }

  if (!webhookUrl) {
    console.warn(`[Landora SMS] SMS_WEBHOOK_URL not set. Would have sent to ${to}: ${message}`);
    return { delivered: false, reason: 'SMS_WEBHOOK_URL not set' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'sms',
        destination: to,
        message,
        brand: 'Landora',
        ...meta,
      }),
    });
    if (!response.ok) {
      throw new Error(`SMS webhook returned ${response.status}`);
    }
    return { delivered: true };
  } catch (err) {
    console.error(`[Landora SMS] delivery to ${to} failed:`, err.message);
    return { delivered: false, reason: err.message };
  }
}

// Wraps sendSms so a notification call site never has to add its own try/catch or
// worry about awaiting — call notifySms(...) and move on. Errors are logged, never
// thrown, and never delay or affect the caller's own response/workflow.
function notifySms(to, message, meta) {
  if (!isConfigured()) {
    console.warn(`[Landora SMS] not configured — skipping notification to ${to}: ${message}`);
    return;
  }
  sendSms(to, message, meta).catch((err) => {
    console.error('[Landora SMS] unexpected notify failure:', err.message);
  });
}

module.exports = { sendSms, notifySms, isConfigured };
