import React from 'react';

// A calm, light-mode companion to InteractiveHeroBackground.jsx: soft drifting
// gradient blobs plus a faint dotted grid, entirely CSS-driven so it costs nothing to
// render and respects prefers-reduced-motion automatically via styles.css.
export default function LightHeroBackground() {
  return (
    <div className="hero-light-bg" aria-hidden="true">
      <div className="hero-light-blob hero-light-blob-a" />
      <div className="hero-light-blob hero-light-blob-b" />
      <div className="hero-light-blob hero-light-blob-c" />
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
