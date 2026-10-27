import type { CSSProperties } from 'react';
import type { Locale } from '../lib/i18n';
import type { Scene } from '../playground/scene';

/** The page supplies state; Carven supplies the component descriptions. */
export default function SceneCanvas({
  locale,
  scene,
  selected,
  onSelect,
}: {
  locale: Locale;
  scene: Scene;
  selected: number;
  onSelect: (id: number) => void;
}) {
  return (
    <section
      className="scene-canvas"
      aria-label={locale === 'zh' ? 'Carven 组件预览' : 'Carven component preview'}
    >
      <header className="scene-heading">
        <h3>{scene.title}</h3>
        <p>{scene.subtitle}</p>
      </header>
      <div className="scene-grid" style={{ '--scene-columns': scene.columns } as CSSProperties}>
        {scene.nodes.map((node) => {
          return (
            <button
              key={node.id}
              type="button"
              className={`scene-node scene-node-${node.kind}`}
              aria-pressed={selected === node.id}
              onClick={() => onSelect(node.id)}
            >
              <span className="scene-node-title">{node.title}</span>
              {node.kind === 'metric' && (
                <strong className="scene-metric">
                  {node.value.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                </strong>
              )}
              {node.kind === 'bars' && (
                <span className="scene-bars">
                  {node.bars.map((bar, index) => (
                    <span className="scene-bar" key={index}>
                      <span className="scene-bar-label">
                        <span>{bar.label}</span>
                        <span>{bar.value}%</span>
                      </span>
                      <svg
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label={`${bar.label}: ${bar.value}%`}
                      >
                        <title>{`${bar.label}: ${bar.value}%`}</title>
                        <rect className="scene-bar-track" width="100" height="6" rx="2" />
                        <rect
                          className="scene-bar-fill"
                          height="6"
                          rx="2"
                          style={{ width: `${bar.value}px` }}
                        />
                      </svg>
                    </span>
                  ))}
                </span>
              )}
              {node.text && <span className="scene-node-text">{node.text}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
