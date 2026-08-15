import React, { useEffect, useRef, useState } from 'react';

// Auto-slides through the parcel video walkthrough (when there is one, always first)
// and up to 6 photos, pausing on hover/focus and while a drag/swipe is in progress,
// and while the video slide is showing (nobody wants an auto-advancing video). Falls
// back to a single frame when there's only one item total.
export default function ImageSlider({ images = [], altPrefix = 'Photo', captions = [], video = null, intervalMs = 4500 }) {
  const photoSlides = (images || []).slice(0, 6).map((src, i) => ({ type: 'image', src, caption: captions[i] }));
  const slides = video ? [{ type: 'video', ...video }, ...photoSlides] : photoSlides;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const onVideoSlide = slides[index]?.type === 'video';

  useEffect(() => {
    if (slides.length < 2 || paused || onVideoSlide) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [slides.length, paused, onVideoSlide, intervalMs]);

  if (slides.length === 0) {
    return <div className="slider slider-empty" />;
  }

  function go(delta) {
    setIndex((i) => (i + delta + slides.length) % slides.length);
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
        {slides.map((slide, i) => (
          <div className="slider-slide" key={i}>
            {slide.type === 'video' ? (
              <div className="slider-video-frame">
                {slide.embed?.type === 'iframe' ? (
                  <iframe
                    src={slide.embed.src}
                    title={slide.caption || 'Parcel video walkthrough'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                  />
                ) : (
                  <video controls poster={slide.poster} src={slide.embed?.src} />
                )}
                <span className="slider-video-badge">Video walkthrough{slide.durationLabel ? ` · ${slide.durationLabel}` : ''}</span>
              </div>
            ) : (
              <img src={slide.src} alt={`${altPrefix} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
            )}
          </div>
        ))}
      </div>

      <div className="slider-counter">{index + 1} / {slides.length}</div>

      {slides.length > 1 && (
        <>
          <button className="slider-arrow slider-arrow-left" onClick={() => go(-1)} aria-label="Previous slide">‹</button>
          <button className="slider-arrow slider-arrow-right" onClick={() => go(1)} aria-label="Next slide">›</button>
          <div className="slider-dots">
            {slides.map((s, i) => (
              <button
                key={i}
                className={`slider-dot ${i === index ? 'active' : ''} ${s.type === 'video' ? 'slider-dot-video' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={s.type === 'video' ? 'Go to video walkthrough' : `Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {slides[index]?.type === 'image' && slides[index]?.caption && (
        <div className="slider-caption">{slides[index].caption}</div>
      )}
      {slides[index]?.type === 'video' && slides[index]?.caption && (
        <div className="slider-caption">{slides[index].caption}</div>
      )}
    </div>
  );
}
