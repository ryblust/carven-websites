import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { useHydrated, useLocation, useNavigate } from '@tanstack/react-router';
import {
  AlignLeft,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CodeXml,
  FolderTree,
  List,
  LoaderCircle,
  Network,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import { UIIcon } from '../components/UIIcon';
import CopyCodeButton from '../components/CopyCodeButton';
import PlaygroundWorkspace from '../components/PlaygroundWorkspace';
import PlaygroundDiagnostics from '../components/PlaygroundDiagnostics';
import type { PlaygroundEditorHandle } from '../components/PlaygroundEditor';
import { translate, type Locale } from '../lib/i18n';
import { playgroundExamples as examples, playgroundProjects } from '../playground/examples';
import { ExecutionSession, PlaygroundError, type Progress } from '../playground/client';
import { href } from '../lib/site';
import type { Action, ExecutionInput, ExecutionResult } from '../playground/protocol';
import { nextFileName, validFilePath } from '../playground/workspace';
import type { WorkspacePreset } from '../playground/workspace-examples';
import PlaygroundPreview, { readQuote, type Quote } from '../components/PlaygroundPreview';
import PlaygroundFiles from '../components/PlaygroundFiles';
import PlaygroundProjectTree from '../components/PlaygroundProjectTree';
import type { DiagnosticLocation } from '../playground/diagnostics';
import { LatestTask } from '../playground/latest-task';
import PlaygroundScene from '../components/PlaygroundScene';
import { readScene, type Scene } from '../playground/scene';
import '../styles/playground.css';
import '../styles/scene.css';

const PlaygroundEditor = lazy(() => import('../components/PlaygroundEditor'));

const assetsBase = href('/playground-assets/');
const initialExample = playgroundProjects[0]!;
const activeExampleKey = 'carven.playground.v1.active';
const draftKey = (id: string) => `carven.playground.v2.${id}`;

interface PreviewRequest {
  files: Record<string, string>;
  stdin: string;
  entry: string;
  call: NonNullable<ExecutionInput['call']>;
  apply: boolean;
  project: number;
}

function PlaygroundSelect(props: ComponentProps<'select'>) {
  return (
    <span className="playground-select">
      <select {...props} />
      <UIIcon icon={ChevronDown} />
    </span>
  );
}

function readDraft(id: string, fallback: string) {
  try {
    const stored = localStorage.getItem(draftKey(id));
    if (!stored) return fallback;
    const draft: unknown = JSON.parse(stored);

    // A draft belongs to the preset it was edited from. Old source must not
    // silently replace a newer example after a compiler or website update.
    return typeof draft === 'object' &&
      draft !== null &&
      'base' in draft &&
      draft.base === fallback &&
      'source' in draft &&
      typeof draft.source === 'string'
      ? draft.source
      : fallback;
  } catch {
    return fallback;
  }
}

export default function Playground({ locale }: { locale: Locale }) {
  const t = translate(locale);

  const [exampleId, setExampleId] = useState<string>(initialExample.id);
  const example = examples.find((item) => item.id === exampleId) ?? initialExample;
  const [files, setFiles] = useState<Record<string, string>>({ 'main.cv': initialExample.source });
  const [filename, setFilename] = useState('main.cv');
  const [stdin, setStdin] = useState('');
  const [newFile, setNewFile] = useState<string | undefined>();
  const [showTree, setShowTree] = useState(false);
  const [fileError, setFileError] = useState('');
  const [price, setPrice] = useState(1200);
  const [percent, setPercent] = useState(25);
  const [level, setLevel] = useState(60);
  const [selectedNode, setSelectedNode] = useState(0);
  const [scene, setScene] = useState<{
    value: Scene;
    sourceKey: string;
    hosting?: ExecutionResult['hosting'];
  }>();
  const [sceneError, setSceneError] = useState('');
  const [quote, setQuote] = useState<{
    value: Quote;
    sourceKey: string;
    hosting?: ExecutionResult['hosting'];
  }>();
  const [source, setSource] = useState<string>(initialExample.source);
  const hydrated = useHydrated();
  const supported = hydrated
    ? typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'
    : undefined;
  const [projectReady, setProjectReady] = useState(false);
  const [progress, setProgress] = useState<Progress>('loading');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExecutionResult>();
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState<
    'output' | 'tests' | 'diagnostics' | 'cpp' | 'ast' | 'tokens' | 'preview' | 'files'
  >('output');
  const [resultAction, setResultAction] = useState<Action>();
  const [session] = useState(() => new ExecutionSession());
  const editorRef = useRef<PlaygroundEditorHandle>(null);
  const pendingLocation = useRef<DiagnosticLocation | undefined>(undefined);
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const pricing = exampleId === 'pricing-preview';
  const studio = exampleId === 'component-studio';
  const live = pricing || studio;
  const liveSourceKey = studio ? JSON.stringify(files) : '';
  const preset: WorkspacePreset = example;
  const showFiles =
    preset.producesFiles || (resultAction !== 'call' && (result?.artifacts.length ?? 0) > 0);
  const original =
    JSON.stringify(files) === JSON.stringify({ 'main.cv': example.source, ...preset.files }) &&
    stdin === (preset.stdin ?? '');
  const activeExample = useRef<string | undefined>(undefined);
  const activeSources = useRef<Record<string, string> | undefined>(undefined);
  const lastReload = useRef<{ sourceKey: string; hosting: ExecutionResult['hosting'] } | undefined>(
    undefined,
  );
  const project = useRef(0);
  const [projectRevision, setProjectRevision] = useState(0);
  const pendingApply = useRef(false);
  const executing = useRef(false);
  const executionId = useRef(0);
  const [previewTasks] = useState(() => new LatestTask());

  function requestPreview(apply = false, delay = 40) {
    pendingApply.current ||= apply;
    const request: PreviewRequest = {
      files,
      stdin,
      entry: studio ? 'scene.cv' : 'pricing.cv',
      call: studio
        ? { name: 'view', arguments: [level, selectedNode, locale === 'zh' ? 1 : 0] }
        : { name: 'quote', arguments: [price, percent] },
      apply: pendingApply.current,
      project: project.current,
    };
    previewTasks.schedule(async (current) => {
      pendingApply.current = false;
      await execute('call', request, current);
    }, delay);
  }
  const schedulePreview = useEffectEvent(() => {
    const changed = studio && liveSourceKey !== lastReload.current?.sourceKey;
    requestPreview(changed, changed && activeSources.current ? 300 : 40);
  });

  useEffect(() => {
    if (live && tab === 'preview' && supported && projectReady) schedulePreview();
    else previewTasks.cancel();
  }, [
    price,
    percent,
    level,
    selectedNode,
    locale,
    live,
    studio,
    liveSourceKey,
    tab,
    supported,
    projectReady,
    projectRevision,
    previewTasks,
  ]);

  useEffect(() => {
    return () => {
      previewTasks.cancel();
      project.current += 1;
      session.close();
    };
  }, [session]);

  useEffect(() => {
    if (pendingLocation.current && editorRef.current?.reveal(pendingLocation.current))
      pendingLocation.current = undefined;
  }, [filename, source]);

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

  function persistWorkspace(nextFiles: Record<string, string>, nextStdin: string) {
    try {
      const preset: WorkspacePreset = example;
      const base = {
        files: { 'main.cv': example.source, ...preset.files },
        stdin: preset.stdin ?? '',
      };
      const key = `carven.playground.v3.${exampleId}`;
      if (JSON.stringify(nextFiles) === JSON.stringify(base.files) && nextStdin === base.stdin)
        localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({ base, files: nextFiles, stdin: nextStdin }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  function invalidate(keepResult = false) {
    executionId.current += 1;
    executing.current = false;
    previewTasks.cancel();
    pendingApply.current = false;
    session.cancel();
    setBusy(false);
    if (!keepResult) setResult(undefined);
    setMessage('');
    if (tab === 'files' && !preset.producesFiles) setTab('output');
  }

  function edit(text: string) {
    invalidate(studio && tab === 'preview');
    setSource(text);
    const next = { ...files, [filename]: text };
    setFiles(next);
    persistWorkspace(next, stdin);
  }

  function selectFile(path: string) {
    if (busy && tab !== 'preview') invalidate();
    setFilename(path);
    setSource(files[path]!);
    setFileError('');
  }

  function addFile() {
    const path = newFile?.trim() || nextFileName(files);
    if (
      !validFilePath(path) ||
      files[path] !== undefined ||
      Object.keys(files).length >= 16 ||
      Object.keys(files).some((file) => file.startsWith(path + '/') || path.startsWith(file + '/'))
    ) {
      setFileError(
        t(
          '请输入未使用的相对路径，最多 16 个文件。',
          'Use an unused relative path. A workspace can contain up to 16 files.',
        ),
      );
      return;
    }
    invalidate();
    const next = { ...files, [path]: '' };
    setFiles(next);
    setFilename(path);
    setSource('');
    setNewFile(undefined);
    setFileError('');
    persistWorkspace(next, stdin);
  }

  function resetWorkspace() {
    project.current += 1;
    setProjectRevision(project.current);
    activeSources.current = undefined;
    lastReload.current = undefined;
    session.close();
    pendingLocation.current = undefined;
    setNewFile(undefined);
    setFileError('');
    const preset: WorkspacePreset = example;
    const next: Record<string, string> = { 'main.cv': example.source, ...preset.files };
    invalidate();
    setFiles(next);
    setFilename(preset.selectedFile ?? 'main.cv');
    setSource(next[preset.selectedFile ?? 'main.cv']!);
    setStdin(preset.stdin ?? '');
    setQuote(undefined);
    setScene(undefined);
    setSceneError('');
    setLevel(60);
    setSelectedNode(0);
    persistWorkspace(next, preset.stdin ?? '');
  }

  function activateExample(id: string) {
    const next = examples.find((item) => item.id === id);
    if (!next) return;
    project.current += 1;
    setProjectRevision(project.current);
    activeSources.current = undefined;
    lastReload.current = undefined;
    session.close();
    pendingLocation.current = undefined;

    activeExample.current = id;
    invalidate();
    setExampleId(id);
    setTab(next.defaultView);
    setQuote(undefined);
    setScene(undefined);
    setSceneError('');
    setLevel(60);
    setSelectedNode(0);
    setNewFile(undefined);
    setFileError('');

    try {
      localStorage.setItem(activeExampleKey, id);
    } catch {
      setSaved(false);
    }

    const preset: WorkspacePreset = next;
    const base = { files: { 'main.cv': next.source, ...preset.files }, stdin: preset.stdin ?? '' };
    let restored: { files: Record<string, string>; stdin: string } = base;
    try {
      const stored = JSON.parse(localStorage.getItem(`carven.playground.v3.${id}`) ?? 'null');
      if (
        stored &&
        JSON.stringify(stored.base) === JSON.stringify(base) &&
        stored.files &&
        typeof stored.files === 'object' &&
        !Array.isArray(stored.files) &&
        Object.keys(stored.files).length <= 16 &&
        Object.entries(stored.files).every(
          ([path, text]) => validFilePath(path) && typeof text === 'string',
        ) &&
        typeof stored.files['main.cv'] === 'string' &&
        typeof stored.stdin === 'string'
      ) {
        restored = { files: stored.files, stdin: stored.stdin };
      } else if (!preset.files) {
        restored = { ...base, files: { 'main.cv': readDraft(id, next.source) } };
      }
    } catch {
      /* Storage is optional. */
    }
    const selected =
      preset.selectedFile && restored.files[preset.selectedFile] !== undefined
        ? preset.selectedFile
        : 'main.cv';
    setFiles(restored.files);
    setStdin(restored.stdin);
    setFilename(selected);
    setSource(restored.files[selected]!);
    setProjectReady(true);
  }

  function loadExample(id: string) {
    activateExample(id);
    void navigate({
      hash: new URLSearchParams({ example: id }).toString(),
      replace: true,
      resetScroll: false,
    });
  }

  function run(action: Action) {
    if (action === 'call') {
      requestPreview(true, 0);
      return;
    }
    if (executing.current) invalidate();
    else previewTasks.cancel();
    return execute(action);
  }

  async function execute(
    action: Action,
    preview?: PreviewRequest,
    current: () => boolean = () => true,
  ) {
    if (!supported || executing.current) return;
    executing.current = true;
    const id = ++executionId.current;
    const applySource = !!preview && (preview.apply || !activeSources.current);
    const background = !!preview && (studio ? !!activeSources.current : !applySource);

    if (!background) {
      setBusy(true);
      setProgress('loading');
      if (action !== resultAction) setResult(undefined);
      setMessage('');
    }
    setResultAction(action);
    if (!background)
      setTab(
        action === 'call'
          ? 'preview'
          : action === 'run' && tab === 'files'
            ? 'files'
            : action === 'compile'
              ? 'cpp'
              : action === 'ast' || action === 'tokens'
                ? action
                : action === 'run'
                  ? 'output'
                  : action === 'test'
                    ? 'tests'
                    : 'diagnostics',
      );

    try {
      const entry =
        action === 'call'
          ? preview!.entry
          : ['format', 'ast', 'tokens'].includes(action)
            ? filename
            : 'main.cv';
      const executionFiles = preview
        ? applySource
          ? preview.files
          : (activeSources.current ?? preview.files)
        : files;
      const input: ExecutionInput = {
        entry,
        files: executionFiles,
        stdin: preview?.stdin ?? stdin,
        ...(action === 'call'
          ? {
              call: preview!.call,
            }
          : {}),
      };
      let next = await session.run(
        assetsBase,
        executionFiles[entry] ?? '',
        action,
        background ? () => {} : setProgress,
        input,
      );
      if (!next) return;
      if (id !== executionId.current) return;
      if (preview) {
        if (preview.project !== project.current) return;
        if (applySource && next.hosting) {
          if (['loaded', 'reloaded', 'unchanged'].includes(next.hosting.status))
            activeSources.current = executionFiles;
          lastReload.current = { sourceKey: JSON.stringify(preview.files), hosting: next.hosting };
        } else if (
          lastReload.current?.sourceKey === JSON.stringify(preview.files) &&
          lastReload.current.hosting?.status === 'retained'
        ) {
          next = { ...next, hosting: lastReload.current.hosting };
        }
        if (!current()) return;
      }
      if (action === 'format' && next.formattedSource !== undefined) {
        edit(next.formattedSource);
      }
      // Parameter updates keep the existing status and controls in place.
      // Publish a new action result only when its outcome changes.
      if (
        !background ||
        applySource ||
        result?.exitCode !== next.exitCode ||
        resultAction !== 'call'
      )
        setResult(next);
      if (background && next.exitCode === 0) setMessage('');
      if (tab === 'files' && !preset.producesFiles && !next.artifacts.length) setTab('output');
      if (action === 'call' && studio) {
        const value = next.exitCode === 0 ? readScene(next) : undefined;
        if (value) {
          setScene({
            value,
            sourceKey: JSON.stringify(activeSources.current ?? executionFiles),
            hosting: next.hosting,
          });
          setSceneError('');
        } else {
          setSceneError(
            next.stderr ||
              (next.hosting?.diagnostics
                ? ''
                : t(
                    'view 必须返回包含 title、subtitle、columns 和有效 nodes 的 Scene。上一版画面已保留。',
                    'view must return a Scene with title, subtitle, columns and valid nodes. The previous view is kept.',
                  )),
          );
        }
      } else if (action === 'call' && next.exitCode === 0) {
        const value = readQuote(next);
        if (value)
          setQuote({
            value,
            sourceKey: JSON.stringify(activeSources.current ?? executionFiles),
            hosting: next.hosting,
          });
        else
          setMessage(
            t(
              '预览需要 quote 返回包含 subtotal、saved 和 total 整数字段的结构体。',
              'The preview expects quote to return a record with integer subtotal, saved, and total fields.',
            ),
          );
      }
      setBusy(false);
      if (next.exitCode !== 0 && next.stderr && action !== 'test' && action !== 'call')
        setTab('diagnostics');
    } catch (error) {
      if (preview && (!current() || preview.project !== project.current)) return;
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
    } finally {
      if (id === executionId.current) {
        executing.current = false;
        setBusy(false);
      }
    }
  }

  const artifact = result?.artifacts.find((file) => file.path === 'main.cpp');
  const outputResult =
    resultAction === 'run' ||
    resultAction === 'test' ||
    resultAction === 'check' ||
    resultAction === 'compile'
      ? result
      : undefined;
  const primaryAction =
    tab === 'preview'
      ? 'call'
      : tab === 'files'
        ? 'run'
        : tab === 'output'
          ? 'run'
          : tab === 'tests'
            ? 'test'
            : tab === 'diagnostics'
              ? 'check'
              : tab === 'cpp'
                ? 'compile'
                : tab;
  const primaryActionLabel = {
    call: studio ? t('立即更新', 'Update now') : t('更新预览', 'Update preview'),
    run: t('运行', 'Run'),
    test: t('测试', 'Test'),
    check: t('检查', 'Check'),
    compile: t('生成 C++', 'Generate C++'),
    ast: t('查看 AST', 'Inspect AST'),
    tokens: t('查看 Tokens', 'Inspect Tokens'),
  }[primaryAction];
  const primaryActionIcon = {
    call: Play,
    run: Play,
    test: CircleCheck,
    check: Check,
    compile: CodeXml,
    ast: Network,
    tokens: List,
  }[primaryAction];
  const statusIcon = busy
    ? LoaderCircle
    : result
      ? result.hosting?.status === 'retained'
        ? CircleAlert
        : result.exitCode === 0
          ? CircleCheck
          : CircleAlert
      : message
        ? CircleAlert
        : CircleDashed;
  const status = busy
    ? progress === 'loading'
      ? t('正在加载…', 'Loading…')
      : t('正在执行…', 'Executing…')
    : result
      ? result.hosting?.status === 'retained'
        ? t('使用上一版有效实现', 'Using the last valid version')
        : result.exitCode === 0
          ? t('完成', 'Completed')
          : t('未成功', 'Failed')
      : message
        ? t('任务已结束', 'Task ended')
        : t('等待运行', 'Ready when you are');

  return (
    <section
      className="playground container"
      aria-labelledby="playground-title"
      data-project-ready={projectReady}
    >
      <div className="playground-intro">
        <h1 id="playground-title">
          {t('在浏览器中验证程序。', 'Explore Carven in your browser.')}
        </h1>
        <p>
          {t(
            '打开一个项目，修改源码或输入，在浏览器里运行、测试，或查看生成的 C++。',
            'Open a project, edit its source or inputs, then run, test, or inspect the generated C++ in your browser.',
          )}
        </p>
      </div>

      <p className="playground-description">{example.description[locale]}</p>
      <p className="playground-project-note">
        {t(
          '每个示例是一个独立项目，main.cv 是运行入口。切换示例会恢复各自的文件与草稿。',
          'Each example is a separate project with main.cv as its entry. Switching examples restores that project’s files and draft.',
        )}
      </p>
      <p className="playground-native-note">
        {t('需要构建原生项目？', 'Building a native project?')}{' '}
        <a href={href(locale === 'zh' ? '/zh/reference/build/' : '/reference/build/')}>
          {t(
            '用 build.cv 定义目标，在本机运行 carven build、carven run 和 carven test。',
            'Define targets with build.cv and run carven build, carven run, and carven test locally.',
          )}
        </a>
      </p>

      {supported === false && (
        <div className="playground-connection" role="status">
          <p>
            {t(
              '此浏览器无法运行 Playground，请换用其他浏览器。',
              'This browser cannot run the Playground. Try another browser.',
            )}
          </p>
        </div>
      )}

      <div className="playground-project">
        {!projectReady && (
          <p className="playground-opening" role="status">
            {t('正在打开项目…', 'Opening project…')}
          </p>
        )}
        <PlaygroundWorkspace
          locale={locale}
          editor={
            <div className="playground-pane" id="playground-source-pane">
              <div className="playground-pane-header playground-source-header">
                <div className="playground-example">
                  <label className="sr-only" htmlFor="playground-example">
                    {t('项目', 'Project')}
                  </label>
                  <PlaygroundSelect
                    id="playground-example"
                    value={exampleId}
                    onChange={(event) => loadExample(event.target.value)}
                  >
                    {!playgroundProjects.some((item) => item.id === exampleId) && (
                      <option value={exampleId}>{example.title[locale]}</option>
                    )}
                    {playgroundProjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title[locale]}
                      </option>
                    ))}
                  </PlaygroundSelect>
                </div>
                <div className="playground-source-actions">
                  <button
                    disabled={busy || !supported || !source.trim() || !filename.endsWith('.cv')}
                    onClick={() => void run('format')}
                    title={t('格式化 Carven 源码', 'Format Carven source')}
                  >
                    <UIIcon icon={AlignLeft} />
                    {t('格式化', 'Format')}
                  </button>
                  <button onClick={resetWorkspace}>
                    <UIIcon icon={RotateCcw} />
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
              <div className="playground-source-body">
                <div
                  className="playground-file-tabs"
                  role="group"
                  aria-label={t('项目文件', 'Project files')}
                >
                  <button
                    className="playground-tree-toggle"
                    aria-label={t('文件树', 'File tree')}
                    aria-expanded={showTree}
                    onClick={() => setShowTree(!showTree)}
                  >
                    <UIIcon icon={FolderTree} />
                  </button>
                  {Object.keys(files).map((path) => (
                    <button
                      key={path}
                      aria-pressed={filename === path}
                      onClick={() => selectFile(path)}
                    >
                      {path}
                    </button>
                  ))}
                  <button
                    className="playground-add-file"
                    onClick={() =>
                      setNewFile(newFile === undefined ? nextFileName(files) : undefined)
                    }
                    disabled={Object.keys(files).length >= 16}
                    aria-label={t('添加文件', 'Add file')}
                  >
                    +
                  </button>
                </div>
                {newFile !== undefined && (
                  <form
                    className="playground-file-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addFile();
                    }}
                  >
                    <input
                      autoFocus
                      aria-label={t('新文件路径', 'New file path')}
                      onFocus={(event) => event.target.select()}
                      value={newFile}
                      onChange={(event) => setNewFile(event.target.value)}
                    />
                    <button type="submit">{t('添加', 'Add')}</button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFile(undefined);
                        setFileError('');
                      }}
                    >
                      {t('取消', 'Cancel')}
                    </button>
                  </form>
                )}
                {fileError && (
                  <p className="playground-file-error" role="alert">
                    {fileError}
                  </p>
                )}
                <div className="playground-code-area">
                  {showTree && (
                    <PlaygroundProjectTree
                      files={files}
                      selected={filename}
                      onSelect={selectFile}
                      locale={locale}
                    />
                  )}
                  <div className="playground-editor">
                    {!filename.endsWith('.cv') ? (
                      <textarea
                        className="playground-data-editor"
                        aria-label={t(`${filename} 文件内容`, `${filename} file contents`)}
                        value={source}
                        onChange={(event) => edit(event.target.value)}
                        spellCheck={false}
                      />
                    ) : (
                      <Suspense
                        fallback={<pre className="playground-editor-placeholder">{source}</pre>}
                      >
                        {supported === undefined ? (
                          <pre className="playground-editor-placeholder">{source}</pre>
                        ) : (
                          <PlaygroundEditor
                            key={`${exampleId}:${filename}`}
                            ref={editorRef}
                            filename={filename}
                            source={source}
                            locale={locale}
                            onChange={edit}
                            onRun={() => void run(primaryAction)}
                          />
                        )}
                      </Suspense>
                    )}
                  </div>
                </div>
                <details
                  className="playground-input"
                  key={exampleId}
                  open={exampleId === 'workspace-report' ? true : undefined}
                >
                  <summary>
                    {t('标准输入', 'Standard input')}{' '}
                    <span>{new TextEncoder().encode(stdin).byteLength} B</span>
                  </summary>
                  <textarea
                    aria-label={t('标准输入内容', 'Standard input contents')}
                    placeholder={t(
                      '程序从 stdin 读取的文本',
                      'Text for your program to read from stdin',
                    )}
                    value={stdin}
                    onChange={(event) => {
                      invalidate();
                      setStdin(event.target.value);
                      persistWorkspace(files, event.target.value);
                    }}
                    spellCheck={false}
                  />
                </details>
              </div>
              <div className="playground-pane-footer" id="playground-editor-help">
                <span>
                  {original
                    ? t('原始示例', 'Original example')
                    : saved
                      ? t('已修改 · 草稿保存在此浏览器', 'Edited · Draft saved in this browser')
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
                        value === 'tests' ||
                        value === 'diagnostics' ||
                        value === 'cpp' ||
                        value === 'ast' ||
                        value === 'tokens' ||
                        value === 'preview' ||
                        value === 'files'
                      )
                        setTab(value);
                    }}
                  >
                    {live && <option value="preview">{t('交互预览', 'Live preview')}</option>}
                    {showFiles && <option value="files">{t('生成的文件', 'Files')}</option>}
                    <option value="output">{t('输出', 'Output')}</option>
                    <option value="tests">{t('测试结果', 'Tests')}</option>
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
                        invalidate();
                        setMessage(t('已取消本次任务。', 'This task was cancelled.'));
                      }}
                    >
                      <UIIcon icon={Square} />
                      {t('停止', 'Stop')}
                    </button>
                  ) : (
                    <button
                      className="button button-primary"
                      disabled={
                        !supported ||
                        ((primaryAction === 'ast' || primaryAction === 'tokens') &&
                          !filename.endsWith('.cv'))
                      }
                      onClick={() => void run(primaryAction)}
                      title={`${primaryActionLabel} (⌘ / Ctrl + Enter)`}
                    >
                      <UIIcon icon={primaryActionIcon} />
                      {primaryActionLabel}
                    </button>
                  )}
                </div>
              </div>
              <div className="playground-result-body">
                {tab === 'preview' && studio ? (
                  <PlaygroundScene
                    locale={locale}
                    scene={scene?.value}
                    level={level}
                    onLevel={setLevel}
                    selected={selectedNode}
                    onSelect={setSelectedNode}
                    hosting={
                      resultAction === 'call' ? (result?.hosting ?? scene?.hosting) : scene?.hosting
                    }
                    pendingSource={!!scene && scene.sourceKey !== JSON.stringify(files)}
                    error={sceneError}
                  />
                ) : tab === 'preview' ? (
                  <PlaygroundPreview
                    locale={locale}
                    price={price}
                    percent={percent}
                    onPrice={(value) => {
                      setPrice(value);
                    }}
                    onPercent={(value) => {
                      setPercent(value);
                    }}
                    quote={quote?.value}
                    hosting={
                      resultAction === 'call' ? (result?.hosting ?? quote?.hosting) : quote?.hosting
                    }
                    pendingSource={!!quote && quote.sourceKey !== JSON.stringify(files)}
                    busy={busy}
                    error={resultAction === 'call' ? result?.stderr : undefined}
                  />
                ) : tab === 'files' ? (
                  <PlaygroundFiles
                    locale={locale}
                    files={result?.artifacts ?? []}
                    stdout={result?.stdout}
                  />
                ) : tab === 'cpp' && artifact ? (
                  <pre tabIndex={0} aria-label="main.cpp">
                    {artifact.content}
                  </pre>
                ) : (tab === 'diagnostics' || (tab === 'tests' && resultAction === 'test')) &&
                  result &&
                  (result.stderr || outputResult?.stdout) ? (
                  <PlaygroundDiagnostics
                    text={result.stderr}
                    stdout={outputResult?.stdout}
                    source={source}
                    files={files}
                    locale={locale}
                    onSelect={(location) => {
                      const file = location.file ?? 'main.cv';
                      if (file === filename) editorRef.current?.reveal(location);
                      else {
                        pendingLocation.current = location;
                        selectFile(file);
                      }
                    }}
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
                            ? t(
                                '本次操作没有标准输出。',
                                'This action produced no standard output.',
                              )
                            : t(
                                '运行程序，输出会出现在这里。',
                                'Run your program to see its output here.',
                              ))
                        : tab === 'tests'
                          ? t(
                              '点击“测试”，解释执行项目源码中的 test 和 async test。const test 在分析时执行；原生项目测试在本机运行 carven test。',
                              'Choose “Test” to interpret test and async test blocks in the project sources. Static tests run during analysis; use carven test locally for native project tests.',
                            )
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
                <span className="playground-status">
                  <UIIcon icon={statusIcon} className={busy ? 'icon-spinning' : undefined} />
                  {status}
                </span>
                {result && (
                  <span>
                    {t('退出码', 'Exit')} {result.exitCode} ·{' '}
                    {(result.durationMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            </div>
          }
        />
      </div>
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
    </section>
  );
}
