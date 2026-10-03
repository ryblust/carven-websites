import { isExecutionResult, type Action, type ExecutionResult } from './protocol';

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

// Each task has its own worker. Termination stops synchronous WASM immediately.
export class ExecutionSession {
  private generation = 0;
  private pending?: { worker: WorkerPort; finish: () => void };

  constructor(private readonly workerFactory: WorkerFactory = createWorker) {}

  cancel() {
    this.generation += 1;
    this.pending?.finish();
  }

  run(
    assetsBase: string,
    source: string,
    action: Action,
    progress: (phase: Progress) => void = () => {},
  ): Promise<ExecutionResult | undefined> {
    this.cancel();
    if (new TextEncoder().encode(source).byteLength > 64 * 1024) {
      return Promise.reject(new PlaygroundError('too-large'));
    }
    const id = this.generation;
    return new Promise((resolve, reject) => {
      const worker = this.workerFactory();
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (result?: ExecutionResult, error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        worker.terminate();
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
        if (
          data.type === 'progress' &&
          'phase' in data &&
          (data.phase === 'loading' || data.phase === 'running')
        ) {
          progress(data.phase);
          timeout(data.phase === 'loading' ? 120000 : 30000);
        } else if (data.type === 'result' && 'result' in data && isExecutionResult(data.result)) {
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
        worker.postMessage({ id, source, action, assetsBase });
      } catch {
        finish(undefined, new PlaygroundError('unsupported'));
      }
    });
  }
}
