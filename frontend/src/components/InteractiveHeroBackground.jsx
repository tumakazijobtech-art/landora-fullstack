import React, { useCallback, useRef } from 'react';

// A lightweight, dependency-free "illustration" of the Landora concept — surveyed
// plots, crop rows, a river, and a sun — built from CSS-variable-driven SVG so it
// follows the theme. Layers drift at different speeds as the pointer moves across the
// hero, giving a subtle sense of depth without pulling in an image library.
export default function InteractiveHeroBackground() {
  const rafRef = useRef(null);
  const layerRefs = useRef([]);

  const handleMove = useCallback((e) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - bounds.left) / bounds.width - 0.5; // -0.5..0.5
    const py = (e.clientY - bounds.top) / bounds.height - 0.5;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const depth = (i + 1) * 6; // further layers move more
        el.style.transform = `translate(${px * depth}px, ${py * depth * 0.6}px)`;
      });
    });
  }, []);

  const handleLeave = useCallback(() => {
    layerRefs.current.forEach((el) => {
      if (el) el.style.transform = 'translate(0px, 0px)';
    });
  }, []);

  return (
    <div
      className="hero-bg"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      aria-hidden="true"
    >
      <svg className="hero-bg-svg" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMax slice">
        {/* Sky glow */}
        <defs>
          <radialGradient id="heroSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--o400)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--o400)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--g800)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--g800)" stopOpacity="1" />
          </linearGradient>
        </defs>

        <g ref={(el) => (layerRefs.current[0] = el)} className="hero-bg-layer">
          <circle cx="1010" cy="90" r="120" fill="url(#heroSun)" />
          <circle cx="1010" cy="90" r="34" fill="var(--o400)" fillOpacity="0.55" />
        </g>

        <g ref={(el) => (layerRefs.current[1] = el)} className="hero-bg-layer">
          {/* Rolling hill */}
          <path d="M0,320 C220,260 380,340 620,300 C860,260 1000,320 1200,270 L1200,500 L0,500 Z" fill="var(--g700)" fillOpacity="0.55" />
        </g>

        <g ref={(el) => (layerRefs.current[2] = el)} className="hero-bg-layer">
          {/* Surveyed plots — the core Landora visual: parcels of land, mapped and lined out */}
          {[0, 1, 2, 3, 4].map((col) => (
            <g key={col}>
              <rect x={40 + col * 220} y={355} width={190} height={110} rx="4" fill="none" stroke="var(--g400)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="5 5" />
              <line x1={40 + col * 220} y1={410} x2={230 + col * 220} y2={410} stroke="var(--g400)" strokeOpacity="0.2" strokeWidth="1" />
            </g>
          ))}
        </g>

        <g ref={(el) => (layerRefs.current[3] = el)} className="hero-bg-layer">
          {/* River winding through, echoing the "water access" data point on listings */}
          <path
            d="M -20,470 C 160,430 260,480 420,440 C 600,395 720,450 900,410 C 1040,378 1120,410 1220,395"
            stroke="#4A90C4" strokeOpacity="0.45" strokeWidth="6" fill="none" strokeLinecap="round"
          />
        </g>

        <g ref={(el) => (layerRefs.current[4] = el)} className="hero-bg-layer">
          {/* Crop rows — texture suggesting cultivated ground */}
          {Array.from({ length: 14 }).map((_, i) => (
            <path
              key={i}
              d={`M ${-40 + i * 96},500 L ${40 + i * 96},370`}
              stroke="var(--g500)" strokeOpacity="0.28" strokeWidth="10"
            />
          ))}
        </g>

        <rect x="0" y="0" width="1200" height="500" fill="url(#heroFade)" opacity="0.35" />
      </svg>
    </div>
  );
}
