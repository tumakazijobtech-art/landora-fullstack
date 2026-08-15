import { useEffect, useRef, useState } from 'react';

// Flips to true the first time the element scrolls into view, then stops watching —
// used for one-shot "reveal on scroll" animations rather than replaying every time.
export default function useInView(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.2, ...options });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
