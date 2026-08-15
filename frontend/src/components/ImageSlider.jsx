import React, { useEffect, useRef, useState } from 'react';

// Auto-slides through up to 6 parcel photos, pausing on hover/focus and while a
// drag/swipe is in progress. Falls back to a single frame when there's only one photo.
export default function ImageSlider({ images = [], altPrefix = 'Photo', captions = [], intervalMs = 4500 }) {
  const photos = (images || []).slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (photos.length < 2 || paused) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [photos.length, paused, intervalMs]);

  if (photos.length === 0) {
    return <div className="slider slider-empty" />;
  }

  function go(delta) {
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }

  return (
    <div
      className="slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="slider-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {photos.map((src, i) => (
          <div className="slider-slide" key={i}>
            <img src={src} alt={`${altPrefix} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>

      <div className="slider-counter">{index + 1} / {photos.length}</div>

      {photos.length > 1 && (
        <>
          <button className="slider-arrow slider-arrow-left" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <button className="slider-arrow slider-arrow-right" onClick={() => go(1)} aria-label="Next photo">›</button>
          <div className="slider-dots">
            {photos.map((_, i) => (
              <button
                key={i}
                className={`slider-dot ${i === index ? 'active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {captions[index] && <div className="slider-caption">{captions[index]}</div>}
    </div>
  );
}
