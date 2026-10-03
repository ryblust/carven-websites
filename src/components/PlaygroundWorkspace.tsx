import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { translate, type Locale } from '../lib/i18n';

export default function PlaygroundWorkspace({
  locale,
  editor,
  results,
}: {
  locale: Locale;
  editor: ReactNode;
  results: ReactNode;
}) {
  const t = translate(locale);
  const [split, setSplit] = useState(55);
  const [dragging, setDragging] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; x: number; split: number } | null>(null);
  const resize = (value: number) => setSplit(Math.max(25, Math.min(75, value)));

  return (
    <div
      ref={workspace}
      className="playground-workspace"
      data-dragging={dragging || undefined}
      style={{ '--playground-split': `${split}%` } as CSSProperties}
    >
      {editor}
      <div
        className="playground-divider"
        role="separator"
        tabIndex={0}
        aria-label={t('调整源码和结果的宽度', 'Resize source and results')}
        aria-orientation="vertical"
        aria-controls="playground-source-pane playground-results-pane"
        aria-valuemin={25}
        aria-valuemax={75}
        aria-valuenow={Math.round(split)}
        aria-valuetext={t(`源码占 ${Math.round(split)}%`, `Source width ${Math.round(split)}%`)}
        title={t(
          '拖动调整宽度；双击复位；方向键微调',
          'Drag to resize; double-click to reset; use arrow keys to adjust',
        )}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointer: event.pointerId, x: event.clientX, split };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          const width = workspace.current?.getBoundingClientRect().width;
          if (current?.pointer !== event.pointerId || !width) return;
          resize(current.split + ((event.clientX - current.x) / width) * 100);
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointer !== event.pointerId) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          drag.current = null;
          setDragging(false);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setDragging(false);
        }}
        onDoubleClick={() => resize(55)}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 2;
          const next = { ArrowLeft: split - step, ArrowRight: split + step, Home: 25, End: 75 }[
            event.key
          ];
          if (next === undefined) return;
          event.preventDefault();
          resize(next);
        }}
      />
      {results}
    </div>
  );
}
