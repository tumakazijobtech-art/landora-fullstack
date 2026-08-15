import React from 'react';

// Buckets a letter grade into a colour tier so the badge reads at a glance:
// A range = strong (green), B range = fair (amber), C range and below = weak (red).
function tierFor(score) {
  if (!score) return 'score-na';
  const letter = score.trim().charAt(0).toUpperCase();
  if (letter === 'A') return 'score-a';
  if (letter === 'B') return 'score-b';
  return 'score-c';
}

export default function ScoreBadge({ score, size = 'sm' }) {
  if (!score) return null;
  return (
    <span className={`score-badge ${tierFor(score)} score-${size}`} title="Plot rating from the Landora GIS scoring engine">
      {score}
    </span>
  );
}
