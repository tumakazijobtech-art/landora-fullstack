import React from 'react';

export default function Terms() {
  return (
    <div className="section">
      <div className="section-inner" style={{ maxWidth: 760 }}>
        <div className="section-eyebrow">Legal</div>
        <h1 className="section-h2">Terms &amp; Conditions</h1>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--s700)', fontSize: 14, lineHeight: 1.7 }}>
          <p>
            By creating a Landora account you agree to use the platform in good faith, as a farmer searching
            for land to lease, or as a landowner listing land you have the right to lease out. Landora acts as
            the marketplace and qualification layer between the two: listings are reviewed and enriched by our
            team, and lease applicants are qualified and matched to landowners by Landora, not by the
            landowner directly.
          </p>
          <p>
            Landowners are responsible for the accuracy of the details they submit about a parcel. Farmers are
            responsible for the accuracy of the details they submit in a lease application. Landora may verify,
            edit, or decline any listing or application that does not meet our review standards.
          </p>
          <p>
            Any lease agreement reached through the platform is between the landowner and the tenant farmer;
            Landora facilitates the introduction, verification, and qualification process but is not a party to
            the resulting lease.
          </p>
          <p>
            We may update these terms from time to time. Continued use of Landora after an update means you
            accept the revised terms.
          </p>
        </div>
      </div>
    </div>
  );
}
