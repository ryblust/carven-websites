import { translate, type Locale } from '../lib/i18n';
import { Cause, Effect, Exit } from 'effect';
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
    if (!code || pre.parentElement?.classList.contains('code-wrap')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrap';
    pre.replaceWith(wrapper);
    wrapper.append(pre);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = t('复制', 'Copy');
    button.setAttribute('aria-label', t('复制代码', 'Copy code'));
    wrapper.append(button);
    let pending: AbortController | undefined;

    const onCopy = () => {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const program = copyFeedback(window.navigator.clipboard, code.textContent ?? '', {
        select: () => {
          const range = document.createRange();
          range.selectNodeContents(pre);
          const selection = window.getSelection();
          if (!selection) throw new Error('Text selection is unavailable');
          selection.removeAllRanges();
          selection.addRange(range);
        },
        feedback: (result) => {
          button.textContent =
            result === 'copied' ? t('已复制', 'Copied') : t('请手动复制', 'Copy manually');
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
          button.textContent = t('复制', 'Copy');
        },
      });
      void Effect.runPromiseExit(program, { signal: controller.signal }).then((exit) => {
        if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
          console.error('Copy interaction failed', Cause.pretty(exit.cause));
          if (controller.signal.aborted) return;
          button.textContent = t('请手动复制', 'Copy manually');
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
      wrapper.replaceWith(pre);
    });
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}
