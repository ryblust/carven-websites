import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import CopyCodeButton from '../components/CopyCodeButton';
import PlaygroundWorkspace from '../components/PlaygroundWorkspace';
import PlaygroundDiagnostics from '../components/PlaygroundDiagnostics';
import type { PlaygroundEditorHandle } from '../components/PlaygroundEditor';
import { translate, type Locale } from '../lib/i18n';
import { playgroundExamples as examples } from '../playground/examples';
import { ExecutionSession, PlaygroundError, type Progress } from '../playground/client';
import { href } from '../lib/site';
import type { Action, ExecutionResult } from '../playground/protocol';
import '../styles/playground.css';

const PlaygroundEditor = lazy(() => import('../components/PlaygroundEditor'));

const assetsBase = href('/playground-assets/');
const initialExample =
  examples.find((example) => example.id === 'structured-output') ?? examples[0]!;
const activeExampleKey = 'carven.playground.v1.active';
const draftKey = (id: string) => `carven.playground.v1.${id}`;

function PlaygroundSelect(props: ComponentProps<'select'>) {
  return (
    <span className="playground-select">
      <select {...props} />
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function readDraft(id: string, fallback: string) {
  try {
    return localStorage.getItem(draftKey(id)) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function Playground({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const [exampleId, setExampleId] = useState<string>(initialExample.id);
  const example = examples.find((item) => item.id === exampleId) ?? initialExample;
  const [source, setSource] = useState<string>(initialExample.source);
  const [supported, setSupported] = useState<boolean | undefined>();
  const [progress, setProgress] = useState<Progress>('loading');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExecutionResult>();
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState<'output' | 'diagnostics' | 'cpp' | 'ast' | 'tokens'>('output');
  const [resultAction, setResultAction] = useState<Action>();
  const session = useRef(new ExecutionSession());
  const editorRef = useRef<PlaygroundEditorHandle>(null);
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const activeExample = useRef<string | undefined>(undefined);

  useEffect(() => {
    setSupported(typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined');
    return () => session.current.cancel();
  }, []);

  useEffect(() => {
    let id = new URLSearchParams(hash.replace(/^#/, '')).get('example');
    // Section anchors and a removed hash should not discard the current draft.
    if (!id && activeExample.current) return;
    if (!id) {
      try {
        id = localStorage.getItem(activeExampleKey);
      } catch {
        /* Storage is optional. */
      }
    }
    const next = examples.find((item) => item.id === id) ?? initialExample;
    if (activeExample.current !== next.id) activateExample(next.id);
  }, [hash]);

  function persist(id: string, text: string) {
    try {
      localStorage.setItem(draftKey(id), text);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  function invalidate() {
    session.current.cancel();
    setBusy(false);
    setResult(undefined);
    setMessage('');
  }

  function edit(text: string) {
    invalidate();
    setSource(text);
    persist(exampleId, text);
  }

  function activateExample(id: string) {
    const next = examples.find((item) => item.id === id);
    if (!next) return;
    activeExample.current = id;
    invalidate();
    setExampleId(id);
    try {
      localStorage.setItem(activeExampleKey, id);
    } catch {
      setSaved(false);
    }
    setSource(readDraft(id, next.source));
  }

  function loadExample(id: string) {
    activateExample(id);
    void navigate({
      hash: new URLSearchParams({ example: id }).toString(),
      replace: true,
      resetScroll: false,
    });
  }

  async function run(action: Action) {
    if (!supported || busy || !source.trim()) return;
    setBusy(true);
    setProgress('loading');
    setResult(undefined);
    setMessage('');
    setResultAction(action);
    setTab(
      action === 'compile'
        ? 'cpp'
        : action === 'ast' || action === 'tokens'
          ? action
          : action === 'run'
            ? 'output'
            : 'diagnostics',
    );
    try {
      const next = await session.current.run(assetsBase, source, action, setProgress);
      if (!next) return;
      if (action === 'format' && next.formattedSource !== undefined) {
        setSource(next.formattedSource);
        persist(exampleId, next.formattedSource);
      }
      setResult(next);
      setBusy(false);
      if (next.exitCode !== 0 && next.stderr) setTab('diagnostics');
    } catch (error) {
      setBusy(false);
      setMessage(
        error instanceof PlaygroundError && error.code === 'too-large'
          ? t(
              '文件超过 64 KiB 限制，请缩短源码。',
              'This file exceeds the 64 KiB limit. Please shorten the source.',
            )
          : error instanceof PlaygroundError && error.code === 'timeout'
            ? t(
                '任务已超时并停止。请简化程序后重试。',
                'The task timed out and was stopped. Simplify the program and try again.',
              )
            : error instanceof PlaygroundError && error.code === 'assets'
              ? t(
                  '编译器资源加载失败，请检查网络后重试。',
                  'Compiler assets could not load. Check your connection and try again.',
                )
              : t(
                  '浏览器执行未完成，请重试。你的代码仍保存在编辑器中。',
                  'Browser execution could not complete. Try again; your code is still in the editor.',
                ),
      );
    }
  }

  const artifact = result?.artifacts.find((file) => file.path === 'main.cpp');
  const outputResult = resultAction === 'run' ? result : undefined;
  const primaryAction =
    tab === 'output' ? 'run' : tab === 'diagnostics' ? 'check' : tab === 'cpp' ? 'compile' : tab;
  const primaryActionLabel = {
    run: t('解释运行', 'Run'),
    check: t('检查', 'Check'),
    compile: t('生成 C++', 'Generate C++'),
    ast: t('查看 AST', 'Inspect AST'),
    tokens: t('查看 Tokens', 'Inspect Tokens'),
  }[primaryAction];
  const status = busy
    ? progress === 'loading'
      ? t('正在加载运行环境…', 'Loading runtime…')
      : t('正在执行…', 'Executing…')
    : result
      ? result.exitCode === 0
        ? t('完成', 'Completed')
        : t('未成功', 'Failed')
      : message
        ? t('任务已结束', 'Task ended')
        : t('等待运行', 'Ready when you are');

  return (
    <section className="playground container" aria-labelledby="playground-title">
      <div className="playground-intro">
        <h1 id="playground-title">{t('写一点，运行看看。', 'A little code. A real result.')}</h1>
        <p>
          {t(
            '选个例子，改一改，在浏览器里运行一个 Carven 文件。',
            'Pick an example, make it yours, and run one Carven file in your browser.',
          )}
        </p>
      </div>

      <p className="playground-description">{example.description[locale]}</p>

      {supported === false && (
        <div className="playground-connection" role="status">
          <p>
            {t(
              '此浏览器无法运行 WebAssembly Worker。你仍可编辑和复制源码。',
              'This browser cannot run WebAssembly workers. You can still edit and copy your source.',
            )}
          </p>
        </div>
      )}

      <PlaygroundWorkspace
        locale={locale}
        editor={
          <div className="playground-pane" id="playground-source-pane">
            <div className="playground-pane-header playground-source-header">
              <div className="playground-example">
                <span className="playground-file-dot" aria-hidden="true" />
                <label className="sr-only" htmlFor="playground-example">
                  {t('示例', 'Example')}
                </label>
                <PlaygroundSelect
                  id="playground-example"
                  value={exampleId}
                  onChange={(event) => loadExample(event.target.value)}
                >
                  {examples.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title[locale]}
                    </option>
                  ))}
                </PlaygroundSelect>
              </div>
              <div className="playground-source-actions">
                <button
                  disabled={busy || !supported || !source.trim()}
                  onClick={() => void run('format')}
                  title={t('使用 Graver 格式化源码', 'Format source with Graver')}
                >
                  {t('格式化', 'Format')}
                </button>
                <button onClick={() => edit(example.source)} disabled={source === example.source}>
                  {t('重置', 'Reset')}
                </button>
                <CopyCodeButton
                  key={exampleId}
                  source={source}
                  locale={locale}
                  onSelect={() => editorRef.current?.selectAll() ?? false}
                />
              </div>
            </div>
            <div className="playground-editor">
              <Suspense fallback={<pre className="playground-editor-placeholder">{source}</pre>}>
                {supported === undefined ? (
                  <pre className="playground-editor-placeholder">{source}</pre>
                ) : (
                  <PlaygroundEditor
                    key={exampleId}
                    ref={editorRef}
                    source={source}
                    locale={locale}
                    onChange={edit}
                    onRun={() => void run('run')}
                  />
                )}
              </Suspense>
            </div>
            <div className="playground-pane-footer" id="playground-editor-help">
              <span>
                {saved
                  ? t('草稿保存在此浏览器', 'Drafts saved in this browser')
                  : t(
                      '浏览器无法保存草稿，请复制源码保存',
                      'Browser storage unavailable; copy to keep your source',
                    )}
              </span>
              <span className="sr-only">
                {t('Tab 缩进 · Esc 后 Tab 离开', 'Tab to indent · Esc then Tab to leave')} · ⌘ /
                Ctrl + Enter
              </span>
            </div>
          </div>
        }
        results={
          <div
            className="playground-pane playground-results"
            id="playground-results-pane"
            aria-busy={busy}
          >
            <div
              className="playground-pane-header playground-result-header"
              role="group"
              aria-label={t('结果视图', 'Result view')}
            >
              <div className="playground-view">
                <label className="sr-only" htmlFor="playground-result-view">
                  {t('结果视图', 'Result view')}
                </label>
                <PlaygroundSelect
                  id="playground-result-view"
                  value={tab}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === 'output' ||
                      value === 'diagnostics' ||
                      value === 'cpp' ||
                      value === 'ast' ||
                      value === 'tokens'
                    )
                      setTab(value);
                  }}
                >
                  <option value="output">{t('输出', 'Output')}</option>
                  <option value="diagnostics">{t('诊断', 'Diagnostics')}</option>
                  <option value="cpp">C++</option>
                  <option value="ast">AST</option>
                  <option value="tokens">Tokens</option>
                </PlaygroundSelect>
              </div>
              <div className="playground-actions">
                {busy ? (
                  <button
                    className="button button-primary"
                    onClick={() => {
                      session.current.cancel();
                      setBusy(false);
                      setMessage(t('已取消本次任务。', 'This task was cancelled.'));
                    }}
                  >
                    {t('停止', 'Stop')}
                  </button>
                ) : (
                  <button
                    className="button button-primary"
                    disabled={!supported || !source.trim()}
                    onClick={() => void run(primaryAction)}
                    title={
                      primaryAction === 'run'
                        ? t('解释运行（⌘ / Ctrl + Enter）', 'Interpret (⌘ / Ctrl + Enter)')
                        : undefined
                    }
                  >
                    {primaryAction === 'run' && <span aria-hidden="true">▷</span>}
                    {primaryActionLabel}
                  </button>
                )}
              </div>
            </div>
            <div className="playground-result-body">
              {tab === 'cpp' && artifact ? (
                <pre tabIndex={0} aria-label="main.cpp">
                  {artifact.content}
                </pre>
              ) : tab === 'diagnostics' && result?.stderr ? (
                <PlaygroundDiagnostics
                  text={result.stderr}
                  source={source}
                  locale={locale}
                  onSelect={(location) => editorRef.current?.reveal(location)}
                />
              ) : (
                <pre tabIndex={0}>
                  {tab === 'ast' || tab === 'tokens'
                    ? result && resultAction === tab
                      ? result.stdout || t('没有语法输出。', 'No syntax output.')
                      : t(
                          `点击“查看 ${tab === 'ast' ? 'AST' : 'Tokens'}”，查看当前源码的语法。`,
                          `Choose “Inspect ${tab === 'ast' ? 'AST' : 'Tokens'}” to inspect the current source.`,
                        )
                    : tab === 'output'
                      ? outputResult?.stdout ||
                        (outputResult
                          ? t('程序没有标准输出。', 'The program produced no standard output.')
                          : t(
                              '运行程序，输出会出现在这里。',
                              'Run your program to see its output here.',
                            ))
                      : tab === 'diagnostics'
                        ? result?.stderr ||
                          (result
                            ? t('没有诊断信息。', 'No diagnostics.')
                            : t(
                                '编译器诊断会出现在这里。',
                                'Compiler diagnostics will appear here.',
                              ))
                        : t(
                            '点击“生成 C++”，查看当前源码生成的 main.cpp。',
                            'Choose “Generate C++” to inspect main.cpp generated from your current source.',
                          )}
                </pre>
              )}
            </div>
            <div className="playground-pane-footer" role="status">
              <span>{status}</span>
              {result && (
                <span>
                  {t('退出码', 'Exit')} {result.exitCode} · {(result.durationMs / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </div>
        }
      />
      {message && (
        <p className="playground-notice" role="status">
          {message}
        </p>
      )}
      {result?.truncated && (
        <p className="playground-notice" role="status">
          {t(
            '输出已达到大小限制，显示的内容不完整。',
            'The output limit was reached; the displayed output is incomplete.',
          )}
        </p>
      )}

      <div className="playground-notes" id="playground-notes">
        <p>
          {t(
            '源码在你的浏览器中检查和解释执行，不会上传。当前支持 Carven 解释器能力；C++ 库的原生调用需要本地工具链。',
            'Source is checked and interpreted in your browser; it is not uploaded. This playground supports the Carven interpreter. Native C++ library calls require a local toolchain.',
          )}
        </p>
        <p>
          {t(
            '首次运行会自动加载运行环境，无需安装。代码在浏览器内执行，有时长与输出限制，可随时停止。',
            'The runtime loads automatically on first use; no installation is needed. Code runs in your browser with time and output limits, and you can stop at any time.',
          )}
        </p>
      </div>
    </section>
  );
}
