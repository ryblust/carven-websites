import { useMemo, useSyncExternalStore } from 'react';
import { ShikiMagicMovePrecompiled } from '@shikijs/magic-move/react';
import { homeExampleTokens } from '../generated/home-tokens';
import '@shikijs/magic-move/style.css';

const names = Object.keys(homeExampleTokens) as Array<keyof typeof homeExampleTokens>;
const steps = names.map((name) => homeExampleTokens[name]);
const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribe = (notify: () => void) => {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener('change', notify);
  return () => preference.removeEventListener('change', notify);
};

export function MorphingCode({ example }: { example: keyof typeof homeExampleTokens }) {
  const reducedMotion = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(motionQuery).matches,
    () => true,
  );
  const options = useMemo(
    () => ({
      duration: reducedMotion ? 0 : 700,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      animateContainer: false,
      containerStyle: false,
    }),
    [reducedMotion],
  );
  return (
    <div className="why-code-block">
      <ShikiMagicMovePrecompiled
        steps={steps}
        step={names.indexOf(example)}
        animate={!reducedMotion}
        options={options}
      />
    </div>
  );
}
