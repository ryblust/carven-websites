import SceneCanvas from './SceneCanvas';
import { translate, type Locale } from '../lib/i18n';
import type { ExecutionResult } from '../playground/protocol';
import type { Scene } from '../playground/scene';

export default function PlaygroundScene({
  locale,
  scene,
  level,
  onLevel,
  selected,
  onSelect,
  hosting,
  pendingSource = false,
  error,
}: {
  locale: Locale;
  scene?: Scene;
  level: number;
  onLevel: (value: number) => void;
  selected: number;
  onSelect: (id: number) => void;
  hosting?: ExecutionResult['hosting'];
  pendingSource?: boolean;
  error?: string;
}) {
  const t = translate(locale);
  return (
    <div className="playground-preview playground-scene">
      <div className="playground-preview-heading">
        <span className="playground-eyebrow">
          {t('CARVEN 组件工作台', 'CARVEN COMPONENT STUDIO')}
        </span>
        <h2>{t('源码，变成画面。', 'From source to screen.')}</h2>
        <p>
          {t(
            '修改组件或布局，停笔后自动更新。检查失败时，上一版有效实现继续运行。',
            'Edit components or layout. Changes apply automatically; failed checks keep the previous version running.',
          )}
        </p>
      </div>

      <label className="scene-input">
        <span>
          {t('输入值', 'Input value')} <output>{level}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={level}
          onChange={(event) => onLevel(Number(event.target.value))}
        />
      </label>

      {scene ? (
        <SceneCanvas locale={locale} scene={scene} selected={selected} onSelect={onSelect} />
      ) : (
        <p className="scene-empty">
          {t('正在等待 Carven 返回组件。', 'Waiting for Carven to return the components.')}
        </p>
      )}

      <p className="scene-status" role="status">
        {pendingSource && !error && !hosting?.diagnostics
          ? t(
              '正在等待源码检查，当前画面保持可用。',
              'Waiting for source checks. The current view stays usable.',
            )
          : scene
            ? error
              ? t('保留上次有效画面', 'Keeping the last valid view')
              : hosting?.status === 'retained'
                ? t(
                    `使用上一版有效实现 · 版本 ${hosting.revision}`,
                    `Using the last valid implementation · version ${hosting.revision}`,
                  )
                : t(
                    `由 Carven 返回组件 · 版本 ${hosting?.revision ?? 1}`,
                    `Components returned by Carven · version ${hosting?.revision ?? 1}`,
                  )
            : t(
                '选择组件，或调整输入值来探索预览。',
                'Select a component or change the input value to explore the preview.',
              )}
      </p>
      <p className="playground-preview-tip">
        {t(
          '修改源码中的组件类型、顺序或列数，再切到「测试结果」运行同一文件中的内联测试。',
          'Change component types, their order, or the column count in the source. Choose Tests to run the inline tests in the same file.',
        )}
      </p>

      {error && (
        <div className="playground-reload-error" role="status">
          <strong>{t('视图未更新', 'View not updated')}</strong>
          <pre>{error}</pre>
        </div>
      )}
      {hosting?.diagnostics && (
        <div className="playground-reload-error" role="status">
          <strong>
            {hosting.status === 'unavailable'
              ? t('还没有可用的实现', 'No valid implementation yet')
              : t(
                  '源码检查未通过，上一版实现继续运行',
                  'Source checks failed. The previous implementation is still running.',
                )}
          </strong>
          <pre>{hosting.diagnostics}</pre>
        </div>
      )}
    </div>
  );
}
