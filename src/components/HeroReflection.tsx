import { animate } from 'motion';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

// A single quiet movement after hydration. The hero is fully visible without JS.
export function HeroReflection() {
  const light = useRef<SVGUseElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!light.current || reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const playback = animate(
      light.current,
      { opacity: [0, 0.18, 0] },
      { duration: 4.8, ease: 'easeInOut', delay: 0.5 },
    );
    return () => playback.stop();
  }, [reduced]);
  return (
    <use
      ref={light}
      href="#hero-curve-path"
      stroke="url(#hero-curve-silver)"
      strokeWidth="9"
      opacity="0"
      filter="url(#hero-curve-close)"
    />
  );
}
