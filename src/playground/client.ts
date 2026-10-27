import {
  isExecutionResult,
  type Action,
  type ExecutionInput,
  type ExecutionResult,
} from './protocol';
import type { CompilerAssets } from './wasi';

export type Progress = 'loading' | 'running';

export class PlaygroundError extends Error {
  constructor(
    public readonly code: 'unsupported' | 'assets' | 'execution' | 'too-large' | 'timeout',
  ) {
    super(code);
  }
}

type WorkerPort = Pick<
  Worker,
  'postMessage' | 'terminate' | 'addEventListener' | 'removeEventListener'
>;

type WorkerFactory = () => WorkerPort;
const createWorker: WorkerFactory = () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

// Hosted calls reuse one worker; other actions keep isolated runtimes.
// Termination still stops a busy WASM worker immediately.
export class ExecutionSession {
  private generation = 0;
  private pending?: { worker: WorkerPort; finish: () => void };
  private readonly compilers = new Map<string, CompilerAssets>();
  private hosting?: { base: string; worker: WorkerPort };
  private checkpoint?: { base: string; source: string; input: ExecutionInput };

  constructor(private readonly workerFactory: WorkerFactory = createWorker) {}

  cancel() {
    this.generation += 1;
    this.pending?.finish();
  }

  close() {
    this.cancel();
    this.hosting?.worker.postMessage({ type: 'close' });
    this.hosting?.worker.terminate();
    this.hosting = undefined;
    this.checkpoint = undefined;
  }

  run(
    assetsBase: string,
    source: string,
    action: Action,
    progress: (phase: Progress) => void = () => {},
    input: ExecutionInput = {},
  ): Promise<ExecutionResult | undefined> {
    this.cancel();

    if (new TextEncoder().encode(source).byteLength > 64 * 1024) {
      return Promise.reject(new PlaygroundError('too-large'));
    }
    const base = new URL(assetsBase, globalThis.location?.href ?? import.meta.url).href;
    if (
      (this.hosting && this.hosting.base !== base) ||
      (this.checkpoint && this.checkpoint.base !== base)
    )
      this.close();
    const id = this.generation;

    return new Promise((resolve, reject) => {
      const reuseHosting = action === 'call' && this.hosting !== undefined;
      const worker = action === 'call' && this.hosting ? this.hosting.worker : this.workerFactory();
      if (action === 'call') this.hosting = { base, worker };
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      const finish = (result?: ExecutionResult, error?: Error) => {
        if (settled) return;

        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        if (action !== 'call' || !result || result.truncated || result.exitCode === 137) {
          worker.terminate();
          if (this.hosting?.worker === worker) this.hosting = undefined;
        }
        if (this.pending?.worker === worker) this.pending = undefined;
        if (id !== this.generation) resolve(undefined);
        else if (error) reject(error);
        else resolve(result);
      };

      const timeout = (milliseconds: number) => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(undefined, new PlaygroundError('timeout')), milliseconds);
      };

      const onMessage = ((event: MessageEvent<unknown>) => {
        const data = event.data;
        if (
          typeof data !== 'object' ||
          !data ||
          !('id' in data) ||
          data.id !== id ||
          !('type' in data)
        )
          return;
        if (data.type === 'assets' && 'compiler' in data) {
          const compiler = data.compiler as CompilerAssets | null;
          if (
            compiler?.module instanceof WebAssembly.Module &&
            compiler.files &&
            typeof compiler.files === 'object' &&
            !Array.isArray(compiler.files) &&
            Object.values(compiler.files).every((source) => typeof source === 'string')
          ) {
            // Only cache assets after the worker has loaded and validated them.
            // Modules share compiled code; each worker still owns its runtime state.
            this.compilers.set(base, compiler);
          } else {
            finish(undefined, new PlaygroundError('assets'));
          }
        } else if (
          data.type === 'progress' &&
          'phase' in data &&
          (data.phase === 'loading' || data.phase === 'running')
        ) {
          progress(data.phase);
          timeout(data.phase === 'loading' ? 120000 : 30000);
        } else if (
          data.type === 'result' &&
          'result' in data &&
          isExecutionResult(data.result) &&
          (action !== 'format' ||
            data.result.exitCode !== 0 ||
            typeof data.result.formattedSource === 'string')
        ) {
          if (
            action === 'call' &&
            data.result.hosting &&
            !data.result.truncated &&
            data.result.exitCode !== 137 &&
            ['loaded', 'reloaded', 'unchanged'].includes(data.result.hosting.status)
          )
            this.checkpoint = { base, source, input };
          finish(data.result);
        } else {
          finish(
            undefined,
            new PlaygroundError(
              data.type === 'error' && 'code' in data && data.code === 'assets'
                ? 'assets'
                : 'execution',
            ),
          );
        }
      }) as EventListener;
      const onError = (() => finish(undefined, new PlaygroundError('execution'))) as EventListener;
      this.pending = { worker, finish: () => finish() };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      timeout(120000);

      try {
        worker.postMessage({
          id,
          source,
          action,
          assetsBase: base,
          compiler: this.compilers.get(base),
          input,
          checkpoint: action === 'call' && !reuseHosting ? this.checkpoint : undefined,
        });
      } catch {
        finish(undefined, new PlaygroundError('unsupported'));
      }
    });
  }
}
