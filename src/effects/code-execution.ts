import { translate, type Locale } from '../lib/i18n';
import { href } from '../lib/site';
import type { ExecutionSession } from '../playground/client';

export function enhanceCodeExecution(root: HTMLElement, locale: Locale): () => void {
  const t = translate(locale);
  const document = root.ownerDocument;
  const cleanups: Array<() => void> = [];
  let session: ExecutionSession | undefined;
  let active: (() => void) | undefined;
  let disposed = false;

  root
    .querySelectorAll<HTMLPreElement>(
      'pre[data-runnable="true"][data-language="carven"], pre[data-runnable="true"][data-language="cv"]',
    )
    .forEach((pre) => {
      const code = pre.querySelector('code');
      const wrapper = pre.parentElement;
      const actions = wrapper?.querySelector(':scope > .code-head .code-actions');
      if (!code || !wrapper?.classList.contains('code-wrap') || !actions) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'run-button';
      button.textContent = t('运行', 'Run');
      button.setAttribute('aria-label', t('运行 Carven 代码', 'Run Carven code'));
      actions.prepend(button);

      const panel = document.createElement('div');
      panel.className = 'code-run-result';
      panel.hidden = true;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', t('执行结果', 'Execution result'));
      const status = document.createElement('p');
      status.className = 'code-run-status';
      status.setAttribute('role', 'status');
      panel.append(status);
      wrapper.append(panel);

      let request = 0;
      let running = false;

      const setRunning = (value: boolean) => {
        running = value;
        button.toggleAttribute('data-running', value);
        button.textContent = value ? t('停止', 'Stop') : t('运行', 'Run');
        button.setAttribute(
          'aria-label',
          value ? t('停止运行', 'Stop execution') : t('运行 Carven 代码', 'Run Carven code'),
        );
        panel.setAttribute('aria-busy', String(value));
      };

      const stop = () => {
        if (!running) return;
        request += 1;
        session?.cancel();
        setRunning(false);
        status.textContent = t('已停止', 'Stopped');
        if (active === stop) active = undefined;
      };

      const stream = (label: string, text: string) => {
        if (!text) return;
        const heading = document.createElement('p');
        heading.className = 'code-run-label';
        heading.textContent = label;
        const output = document.createElement('pre');
        output.tabIndex = 0;
        output.setAttribute('aria-label', label);
        output.textContent = text;
        panel.append(heading, output);
      };

      const run = async () => {
        if (running) {
          stop();
          return;
        }

        active?.();
        active = stop;
        const id = ++request;
        panel.replaceChildren(status);
        panel.hidden = false;
        status.textContent = t('正在加载编译器…', 'Loading compiler…');
        setRunning(true);

        try {
          const { ExecutionSession } = await import('../playground/client');
          if (disposed || id !== request) return;
          session ??= new ExecutionSession();
          const result = await session.run(
            href('/playground-assets/'),
            code.textContent ?? '',
            'run',
            (phase) => {
              if (disposed || id !== request) return;
              status.textContent =
                phase === 'loading'
                  ? t('正在加载编译器…', 'Loading compiler…')
                  : t('正在运行…', 'Running…');
            },
          );
          if (disposed || id !== request || !result) return;

          status.textContent = result.truncated
            ? t('输出已达到上限', 'Output limit reached')
            : result.exitCode !== 0
              ? t('运行失败', 'Execution failed')
              : result.stdout || result.stderr
                ? t('运行完成', 'Completed')
                : t('运行完成，没有输出', 'Completed without output');
          stream(t('标准输出', 'Standard output'), result.stdout);
          stream(t('诊断', 'Diagnostics'), result.stderr);
        } catch {
          if (disposed || id !== request) return;
          status.textContent = t(
            '运行未完成，请重试。',
            'Execution could not complete. Try again.',
          );
        } finally {
          if (!disposed && id === request) {
            setRunning(false);
            if (active === stop) active = undefined;
          }
        }
      };

      const onClick = () => {
        void run();
      };
      button.addEventListener('click', onClick);
      cleanups.push(() => {
        request += 1;
        button.removeEventListener('click', onClick);
        button.remove();
        panel.remove();
      });
    });

  return () => {
    disposed = true;
    active = undefined;
    session?.cancel();
    cleanups.forEach((cleanup) => cleanup());
  };
}
