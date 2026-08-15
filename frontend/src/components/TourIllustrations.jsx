import React from 'react';

// Five original, code-drawn illustrations replacing what used to be screenshots of
// third-party map tiles/photography. Each fills its tour-stage-media container the
// same way an <img> did, and is themed with the site's own CSS variables.

export function AerialIllustration() {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className="tour-illustration" role="img" aria-label="Aerial view of a mapped land parcel">
      <defs>
        <linearGradient id="aerialSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--g600)" />
          <stop offset="100%" stopColor="var(--g900)" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#aerialSky)" />
      {/* Field blocks, seen from above */}
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          {[0, 1, 2, 3, 4].map((col) => (
            <rect
              key={col}
              x={col * 132 - 10}
              y={row * 112 - 10}
              width="124"
              height="104"
              fill={(row + col) % 2 === 0 ? 'var(--g500)' : 'var(--g400)'}
              fillOpacity="0.5"
            />
          ))}
        </g>
      ))}
      {/* River */}
      <path d="M -20,60 C 140,120 180,40 340,100 C 480,150 540,90 660,140" stroke="#4A90C4" strokeOpacity="0.85" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Roads */}
      <path d="M 320,-10 L 320,430" stroke="var(--s200)" strokeOpacity="0.6" strokeWidth="6" />
      <path d="M -10,220 L 650,220" stroke="var(--s200)" strokeOpacity="0.6" strokeWidth="6" />
      {/* Highlighted parcel boundary */}
      <polygon points="256,150 380,140 400,290 236,300" fill="var(--o400)" fillOpacity="0.28" stroke="var(--o400)" strokeWidth="3" strokeDasharray="6 4" />
      <circle cx="318" cy="220" r="7" fill="var(--o400)" />
      <circle cx="318" cy="220" r="16" fill="none" stroke="var(--o400)" strokeWidth="2" strokeOpacity="0.6">
        <animate attributeName="r" values="10;22;10" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function GroundIllustration() {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className="tour-illustration" role="img" aria-label="Ground-level view of crop rows and access road">
      <defs>
        <linearGradient id="groundSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--g700)" />
          <stop offset="60%" stopColor="var(--g800)" />
          <stop offset="100%" stopColor="var(--g900)" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#groundSky)" />
      <circle cx="500" cy="90" r="46" fill="var(--o400)" fillOpacity="0.85" />
      {/* Rolling ground */}
      <path d="M0,260 C120,220 220,270 340,240 C460,210 540,250 640,230 L640,420 L0,420 Z" fill="var(--g600)" fillOpacity="0.9" />
      {/* Crop rows in perspective */}
      {Array.from({ length: 10 }).map((_, i) => (
        <path
          key={i}
          d={`M ${60 + i * 56},420 L ${300 + i * 20},250`}
          stroke="var(--g400)"
          strokeWidth="7"
          strokeOpacity="0.55"
        />
      ))}
      {/* Access road */}
      <path d="M 260,420 C 300,340 330,300 360,250" stroke="var(--s200)" strokeOpacity="0.7" strokeWidth="26" strokeLinecap="round" />
      <path d="M 260,420 C 300,340 330,300 360,250" stroke="var(--o400)" strokeOpacity="0.9" strokeWidth="3" strokeDasharray="10 12" strokeLinecap="round" />
      {/* Tree line */}
      {[80, 150, 470, 540, 590].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={260 - (i % 2) * 12} r={22 + (i % 3) * 4} fill="var(--g500)" fillOpacity="0.8" />
          <rect x={x - 3} y={260 - (i % 2) * 12} width="6" height="20" fill="var(--g700)" />
        </g>
      ))}
    </svg>
  );
}

export function VideoIllustration() {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className="tour-illustration" role="img" aria-label="Preview frame for a video walkthrough">
      <defs>
        <linearGradient id="videoSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--g700)" />
          <stop offset="100%" stopColor="var(--g900)" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#videoSky)" />
      <path d="M0,300 C160,250 260,320 400,270 C500,238 560,280 640,260 L640,420 L0,420 Z" fill="var(--g600)" fillOpacity="0.75" />
      <path d="M0,340 C180,300 300,360 460,320 C540,300 590,330 640,318 L640,420 L0,420 Z" fill="var(--g700)" fillOpacity="0.85" />
      {/* Handheld camera framing corners, suggesting "filmed footage" without a photo */}
      {[[20, 20, 1, 1], [620, 20, -1, 1], [20, 400, 1, -1], [620, 400, -1, -1]].map(([x, y, dx, dy], i) => (
        <g key={i} stroke="var(--o400)" strokeWidth="4" strokeLinecap="round" opacity="0.85">
          <line x1={x} y1={y} x2={x + 34 * dx} y2={y} />
          <line x1={x} y1={y} x2={x} y2={y + 34 * dy} />
        </g>
      ))}
    </svg>
  );
}

export function MapIllustration() {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className="tour-illustration" role="img" aria-label="Boundary map with cadastral outline">
      <rect width="640" height="420" fill="var(--g50)" />
      {/* Faint grid, standing in for cadastral reference lines */}
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 54} y1="0" x2={i * 54} y2="420" stroke="var(--s100)" strokeWidth="1" />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 54} x2="640" y2={i * 54} stroke="var(--s100)" strokeWidth="1" />
      ))}
      {/* Road */}
      <path d="M -10,120 L 660,180" stroke="var(--s300, #C4CEC5)" strokeWidth="10" />
      {/* Stream */}
      <path d="M 40,-10 C 120,80 90,180 180,260 C 250,320 260,380 300,430" stroke="#4A90C4" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Boundary polygon */}
      <polygon points="220,120 430,150 460,300 250,340 190,230" fill="var(--g200)" fillOpacity="0.45" stroke="var(--g700)" strokeWidth="3" strokeDasharray="7 5" />
      {[[220, 120], [430, 150], [460, 300], [250, 340], [190, 230]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="var(--o500)" />
      ))}
      <text x="300" y="240" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--g800)">4.5 acres</text>
    </svg>
  );
}

export function AccessIllustration() {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className="tour-illustration" role="img" aria-label="Local access roads and nearby market town">
      <defs>
        <linearGradient id="accessBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--g600)" />
          <stop offset="100%" stopColor="var(--g900)" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#accessBg)" />
      {/* Road network converging on a market node */}
      <path d="M 60,400 C 160,320 220,260 320,220" stroke="var(--s200)" strokeOpacity="0.7" strokeWidth="10" fill="none" />
      <path d="M 600,60 C 500,120 400,160 320,220" stroke="var(--s200)" strokeOpacity="0.7" strokeWidth="10" fill="none" />
      <path d="M 40,120 C 140,150 220,190 320,220" stroke="var(--s200)" strokeOpacity="0.5" strokeWidth="7" fill="none" />
      <path d="M 320,220 C 380,300 420,340 520,390" stroke="var(--s200)" strokeOpacity="0.5" strokeWidth="7" fill="none" />
      {/* Parcel marker */}
      <circle cx="150" cy="330" r="10" fill="var(--o400)" />
      <circle cx="150" cy="330" r="20" fill="none" stroke="var(--o400)" strokeWidth="2" strokeOpacity="0.6">
        <animate attributeName="r" values="14;28;14" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2.8s" repeatCount="indefinite" />
      </circle>
      {/* Market town node */}
      <g transform="translate(320,220)">
        <rect x="-26" y="-20" width="52" height="40" rx="6" fill="var(--w)" fillOpacity="0.92" />
        <path d="M-22,-20 L0,-38 L22,-20" fill="var(--w)" fillOpacity="0.92" />
        <text y="6" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--g800)">Market</text>
      </g>
      {[[520, 100], [80, 90], [560, 340]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="var(--g300)" fillOpacity="0.9" />
      ))}
    </svg>
  );
}
