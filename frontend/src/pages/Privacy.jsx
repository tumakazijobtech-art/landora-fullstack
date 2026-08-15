import React from 'react';

export default function Privacy() {
  return (
    <div className="section">
      <div className="section-inner" style={{ maxWidth: 760 }}>
        <div className="section-eyebrow">Legal</div>
        <h1 className="section-h2">Privacy Policy</h1>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--s700)', fontSize: 14, lineHeight: 1.7 }}>
          <p>
            Landora collects the details you provide when you create an account — your name, email, phone
            number, county, role, and optionally a profile picture — along with any listing or application
            details you submit. This information is used to operate the marketplace: matching farmers to land,
            verifying listings, and enabling landowners and the Landora team to review applicants.
          </p>
          <p>
            Your contact details are shared with the other party in an accepted lease application (landowner
            and tenant farmer) so a lease can proceed, and with the Landora team for verification and
            qualification purposes. We do not sell your personal information to third parties.
          </p>
          <p>
            You can update your profile details, including your profile picture, at any time from your account
            settings. You may request that your account and associated data be deleted by contacting our
            support team.
          </p>
          <p>
            We use industry-standard measures — including password hashing and, where enabled, two-factor
            verification — to protect your account.
          </p>
        </div>
      </div>
    </div>
  );
}
