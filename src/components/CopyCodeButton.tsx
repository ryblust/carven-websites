import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { UIIcon } from './UIIcon';
import { copyFeedback } from '../effects/clipboard';
import { translate, type Locale } from '../lib/i18n';

type CopyState = 'copied' | 'selected' | 'failed';

export default function CopyCodeButton({
  source,
  locale,
  onSelect,
}: {
  source: string;
  locale: Locale;
  onSelect: () => boolean;
}) {
  const t = translate(locale);
  const [state, setState] = useState<CopyState>();
  const pending = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    setState(undefined);
    return () => pending.current?.abort();
  }, [source, locale]);

  function copy() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    void copyFeedback(
      navigator.clipboard,
      source,
      {
        select: () => {
          if (!onSelect()) throw new Error('Code selection unavailable');
        },
        feedback: setState,
        reset: () => setState(undefined),
      },
      controller.signal,
    ).catch(() => {
      if (!controller.signal.aborted) setState('failed');
    });
  }

  const label =
    state === 'copied'
      ? t('已复制', 'Copied')
      : state
        ? t('请手动复制', 'Copy manually')
        : t('复制', 'Copy');
  const announcement =
    state === 'copied'
      ? t('代码已复制到剪贴板。', 'Code copied to clipboard.')
      : state === 'selected'
        ? t('代码已选中，请手动复制。', 'Code selected. Copy it manually.')
        : state === 'failed'
          ? t(
              '自动复制未完成，请手动选择代码并复制。',
              'Automatic copying failed. Select and copy the code manually.',
            )
          : '';

  return (
    <>
      <button type="button" className="copy-code-button" onClick={copy}>
        <UIIcon icon={state === 'copied' ? Check : Copy} />
        <span>{label}</span>
      </button>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </>
  );
}
