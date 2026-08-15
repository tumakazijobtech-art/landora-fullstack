// Sends a plain notification email to the Landora admin inbox. Uses the same
// optional-webhook pattern as services/verification.js, so no email provider is
// required to run the project locally: set EMAIL_WEBHOOK_URL and ADMIN_EMAIL to wire
// up real delivery, and until then submissions still land safely in the database and
// show up on the admin console. The webhook receives
// { to, subject, text, brand: 'Landora' } — point it at whatever sends mail on your
// side (SendGrid, Postmark, an SMTP relay, your n8n workflow, etc).
async function notifyAdmin({ subject, text }) {
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn(`[Landora admin email] No ADMIN_EMAIL configured. Subject: ${subject}`);
    return { delivered: false, reason: 'ADMIN_EMAIL not set' };
  }

  if (!webhookUrl) {
    console.warn(`[Landora admin email] ${adminEmail}: ${subject}\n${text}`);
    return { delivered: false, reason: 'EMAIL_WEBHOOK_URL not set' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: adminEmail, subject, text, brand: 'Landora' }),
    });
    if (!response.ok) {
      throw new Error(`Email webhook returned ${response.status}`);
    }
    return { delivered: true };
  } catch (err) {
    console.error('[Landora admin email] delivery failed:', err.message);
    return { delivered: false, reason: err.message };
  }
}

module.exports = { notifyAdmin };
