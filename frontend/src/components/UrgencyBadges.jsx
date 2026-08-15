import React, { useEffect, useState } from 'react';

// "X people have applied" — shown instead of ever pulling a listing the moment
// someone applies, so the parcel stays visible (and applicable to) everyone while
// still creating real urgency.
export function ApplicantCount({ count, size = 'sm' }) {
  if (!count) return null;
  return (
    <span className={`urgency-applicants urgency-applicants-${size}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="16.5" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2.5 19c.9-3.3 3.4-5 5.5-5s4.6 1.7 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14.5 14.3c1.9.2 3.7 1.7 4.4 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
      {count} {count === 1 ? 'person has' : 'people have'} applied
    </span>
  );
}

function timeParts(msRemaining) {
  const clamped = Math.max(0, msRemaining);
  const days = Math.floor(clamped / (1000 * 60 * 60 * 24));
  const hours = Math.floor((clamped / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((clamped / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

// Countdown to the planting season deadline a landowner or admin set on the listing.
// Once it passes, the backend automatically takes the parcel off the "available to
// lease" board (see expireDeadlines() in routes/parcels.js) — this is what warns a
// visitor that clock is running before that happens.
export default function CountdownTimer({ deadline, compact = false }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;
  const target = new Date(deadline).getTime();
  if (Number.isNaN(target)) return null;
  const remaining = target - now;
  if (remaining <= 0) return null;

  const { days, hours, minutes } = timeParts(remaining);
  const urgent = days < 3;

  if (compact) {
    return (
      <span className={`urgency-timer urgency-timer-compact ${urgent ? 'urgent' : ''}`}>
        ⏱ {days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`} left to apply
      </span>
    );
  }

  return (
    <div className={`urgency-timer-block ${urgent ? 'urgent' : ''}`}>
      <div className="urgency-timer-label">Closes for this planting season in</div>
      <div className="urgency-timer-value">
        {days > 0 && <span><strong>{days}</strong>d</span>}
        <span><strong>{hours}</strong>h</span>
        <span><strong>{minutes}</strong>m</span>
      </div>
    </div>
  );
}
