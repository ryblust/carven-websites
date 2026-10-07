import { translate, type Locale } from '../lib/i18n';
import { copyFeedback } from './clipboard';

// React owns the surrounding article. This scoped enhancement also handles
// Markdown code blocks, and removes all listeners and work on navigation.
export function enhanceCodeBlocks(
  root: HTMLElement,
  announce: (message: string) => void,
  locale: Locale = 'zh',
): () => void {
  const t = translate(locale);
  const document = root.ownerDocument;
  const window = document.defaultView;
  if (!window) return () => {};
  const cleanups: Array<() => void> = [];
  root.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    const wrapper = pre.parentElement;
    const head = wrapper?.querySelector(':scope > .code-head');
    if (!code || !wrapper?.classList.contains('code-wrap') || !head) return;
    if (head.querySelector('.copy-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    const setLabel = (state?: 'copied' | 'manual') => {
      button.textContent =
        state === 'copied'
          ? t('已复制', 'Copied')
          : state === 'manual'
            ? t('请手动复制', 'Copy manually')
            : t('复制', 'Copy');
      button.toggleAttribute('data-copied', state === 'copied');
    };
    setLabel();
    button.setAttribute('aria-label', t('复制代码', 'Copy code'));
    head.append(button);
    let pending: AbortController | undefined;

    const onCopy = () => {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      void copyFeedback(
        window.navigator.clipboard,
        code.textContent ?? '',
        {
          select: () => {
            const range = document.createRange();
            range.selectNodeContents(pre);
            const selection = window.getSelection();
            if (!selection) throw new Error('Text selection is unavailable');
            selection.removeAllRanges();
            selection.addRange(range);
          },
          feedback: (result) => {
            setLabel(result === 'copied' ? 'copied' : 'manual');
            announce(
              result === 'copied'
                ? t('代码已复制到剪贴板', 'Code copied to clipboard')
                : t(
                    '代码已选中，请使用系统复制快捷键',
                    'Code selected. Use your system copy shortcut.',
                  ),
            );
          },
          reset: () => {
            setLabel();
          },
        },
        controller.signal,
      ).catch((error) => {
        if (!controller.signal.aborted) {
          console.error('Copy interaction failed', error);
          setLabel('manual');
          announce(
            t(
              '自动复制未完成，请手动选择代码并复制',
              'Automatic copying failed. Select and copy the code manually.',
            ),
          );
        }
      });
    };
    button.addEventListener('click', onCopy);
    cleanups.push(() => {
      pending?.abort();
      button.removeEventListener('click', onCopy);
      button.remove();
    });
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}
