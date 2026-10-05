import { executeWasi, loadCompilerAssets, validateInput } from './wasi';

interface WorkerScope {
  location: Location;
  postMessage(value: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
}
const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  void (async () => {
    const request = event.data as Record<string, unknown> | null;
    if (!request || !Number.isInteger(request.id) || typeof request.assetsBase !== 'string') return;
    const id = request.id;
    const report = (type: string, data: Record<string, unknown>) =>
      scope.postMessage({ id, type, ...data });
    let stage: 'assets' | 'request' | 'execution' = 'request';
    try {
      const input = validateInput(request.source, request.action);
      const base = new URL(request.assetsBase, scope.location.href);
      if (
        base.origin !== scope.location.origin ||
        base.search ||
        base.hash ||
        !base.pathname.endsWith('/')
      ) {
        throw new Error('Compiler assets must use a same-origin directory.');
      }
      stage = 'assets';
      report('progress', { phase: 'loading' });
      const compiler = await loadCompilerAssets(base);
      stage = 'execution';
      report('progress', { phase: 'running' });
      report('result', { result: await executeWasi(compiler, input.source, input.action) });
    } catch (error) {
      report('error', {
        code: stage,
        message: error instanceof Error ? error.message : 'Execution failed.',
      });
    }
  })();
};
