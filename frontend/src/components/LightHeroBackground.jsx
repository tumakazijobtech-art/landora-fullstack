import React from 'react';

// A calm, light-mode companion to InteractiveHeroBackground.jsx: soft drifting
// gradient blobs, a hand-drawn contour/parcel-boundary line layer (in place of a
// generic grid or stock photo — this is the one visual motif that's actually ours),
// plus a faint dotted grid. Entirely CSS/SVG-driven so it costs nothing to render and
// respects prefers-reduced-motion automatically via styles.css.
export default function LightHeroBackground() {
  return (
    <div className="hero-light-bg" aria-hidden="true">
      <div className="hero-light-blob hero-light-blob-a" />
      <div className="hero-light-blob hero-light-blob-b" />
      <div className="hero-light-blob hero-light-blob-c" />

      <svg className="hero-contour-lines" viewBox="0 0 900 620" preserveAspectRatio="none" fill="none">
        <path className="hero-contour-path hero-contour-path-1" d="M-40 120 C 140 60, 260 180, 420 110 S 700 40, 940 130" stroke="var(--g500)" strokeWidth="1.4" strokeLinecap="round" />
        <path className="hero-contour-path hero-contour-path-2" d="M-40 210 C 120 260, 300 150, 480 220 S 760 300, 940 200" stroke="var(--g400)" strokeWidth="1.2" strokeLinecap="round" />
        <path className="hero-contour-path hero-contour-path-3" d="M-40 330 C 180 380, 340 300, 520 350 S 800 420, 940 340" stroke="var(--o400)" strokeWidth="1.1" strokeLinecap="round" />
        <path className="hero-contour-path hero-contour-path-4" d="M-40 460 C 160 410, 360 500, 540 440 S 780 380, 940 470" stroke="var(--g500)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>

      <svg className="hero-light-grid" viewBox="0 0 600 600" preserveAspectRatio="none">
        <defs>
          <pattern id="heroDotGrid" width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="var(--g500)" fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="600" height="600" fill="url(#heroDotGrid)" />
      </svg>
    </div>
  );
}
