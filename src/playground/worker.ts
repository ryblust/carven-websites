import { executeWasi, loadCompilerAssets, validateInput, type CompilerAssets } from './wasi';

interface WorkerScope {
  location: Location;
  postMessage(value: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
}
const scope = globalThis as unknown as WorkerScope;
let assets: Promise<CompilerAssets> | undefined;
let assetUrl: string | undefined;
let busy = false;

scope.onmessage = (event) => {
  void (async () => {
    const request = event.data as Record<string, unknown> | null;
    if (!request || !Number.isInteger(request.id) || typeof request.assetsBase !== 'string') return;
    const id = request.id;
    const report = (type: string, data: Record<string, unknown>) =>
      scope.postMessage({ id, type, ...data });
    let stage: 'assets' | 'request' | 'execution' = 'request';
    let acquired = false;
    try {
      if (busy) throw new Error('Worker is already executing a request.');
      const initializing = request.source === undefined && request.action === undefined;
      const input = initializing ? undefined : validateInput(request.source, request.action);
      const base = new URL(request.assetsBase, scope.location.href);
      if (
        base.origin !== scope.location.origin ||
        base.search ||
        base.hash ||
        !base.pathname.endsWith('/')
      ) {
        throw new Error('Compiler assets must use a same-origin directory.');
      }
      busy = true;
      acquired = true;
      stage = 'assets';
      report('progress', { phase: 'loading' });
      if (!assets || assetUrl !== base.href) {
        assetUrl = base.href;
        assets = loadCompilerAssets(base).catch((error: unknown) => {
          assets = undefined;
          throw error;
        });
      }
      const compiler = await assets;
      if (!input) {
        report('version', { version: compiler.version });
        return;
      }
      stage = 'execution';
      report('progress', { phase: 'running' });
      report('result', { result: await executeWasi(compiler, input.source, input.action) });
    } catch (error) {
      report('error', {
        code: stage,
        message: error instanceof Error ? error.message : 'Execution failed.',
      });
    } finally {
      if (acquired) busy = false;
    }
  })();
};
