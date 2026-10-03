import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecutionSession } from '../src/playground/client';
import type { ExecutionResult } from '../src/playground/protocol';

class WorkerDouble extends EventTarget {
  terminated = false;
  sent: { id: number; source: string; action: string }[] = [];
  postMessage(message: { id: number; source: string; action: string }) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

const result: ExecutionResult = {
  stdout: '42\n',
  stderr: '',
  exitCode: 0,
  artifacts: [],
  durationMs: 4,
  timedOut: false,
  truncated: false,
  version: {
    compilerRevision: '6d477cd14863f3d394196afde02b0dd9493a618e',
    backend: 'browser-wasi',
    revisionVerified: true,
    supportedLibraries: [],
  },
};

afterEach(() => vi.useRealTimers());

describe('browser execution ownership', () => {
  it('preserves source exactly and accepts only a valid result for the current task', async () => {
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const source = 'println("中文");\n';
    const running = session.run('/project/playground-assets/', source, 'run');
    const request = worker.sent[0]!;
    expect(request.source).toBe(source);
    worker.reply({ id: request.id + 1, type: 'result', result });
    expect(worker.terminated).toBe(false);
    worker.reply({ id: request.id, type: 'result', result });
    expect(await running).toEqual(result);
    expect(worker.terminated).toBe(true);
  });

  it('stops execution and prevents a cancelled task from publishing a late result', async () => {
    const old = new WorkerDouble();
    const next = new WorkerDouble();
    const workers = [old, next];
    const session = new ExecutionSession(() => workers.shift()!);
    const first = session.run('/assets/', 'old', 'run');
    const second = session.run('/assets/', 'new', 'check');
    old.reply({ id: old.sent[0]!.id, type: 'result', result });
    expect(await first).toBeUndefined();
    expect(old.terminated).toBe(true);
    next.reply({ id: next.sent[0]!.id, type: 'result', result });
    expect(await second).toEqual(result);
  });

  it('rejects malformed results instead of displaying them as successful execution', async () => {
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const running = session.run('/assets/', 'source', 'run');
    const failure = expect(running).rejects.toMatchObject({ code: 'execution' });
    worker.reply({
      id: worker.sent[0]!.id,
      type: 'result',
      result: { stdout: '<script>bad</script>' },
    });
    await failure;
    expect(worker.terminated).toBe(true);
  });

  it('publishes only a complete successful formatter replacement', async () => {
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const running = session.run('/assets/', 'let   value=1;', 'format');
    const formatted = { ...result, formattedSource: 'let value = 1;\n' };
    expect(worker.sent[0]?.action).toBe('format');
    worker.reply({ id: worker.sent[0]!.id, type: 'result', result: formatted });
    expect((await running)?.formattedSource).toBe('let value = 1;\n');
    expect(worker.terminated).toBe(true);
  });

  it('rejects formatter responses that cannot safely replace source', async () => {
    const formatted = { ...result, formattedSource: 'let value = 1;\n' };
    for (const invalid of [
      result,
      { ...formatted, exitCode: 2 },
      { ...formatted, truncated: true },
      { ...formatted, timedOut: true },
      { ...formatted, formattedSource: '\0' },
      { ...formatted, formattedSource: '界'.repeat(22000) },
    ]) {
      const worker = new WorkerDouble();
      const session = new ExecutionSession(() => worker);
      const running = session.run('/assets/', 'let   value=1;', 'format');
      const failure = expect(running).rejects.toMatchObject({ code: 'execution' });
      worker.reply({ id: worker.sent[0]!.id, type: 'result', result: invalid });
      await failure;
      expect(worker.terminated).toBe(true);
    }
  });

  it('enforces the wall-clock limit even when synchronous execution sends no more events', async () => {
    vi.useFakeTimers();
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const running = session.run('/assets/', 'loop {}', 'run');
    const failure = expect(running).rejects.toMatchObject({ code: 'timeout' });
    worker.reply({ id: worker.sent[0]!.id, type: 'progress', phase: 'running' });
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    expect(worker.terminated).toBe(true);
  });

  it('rejects oversized UTF-8 source before creating a worker', async () => {
    const factory = vi.fn(() => new WorkerDouble());
    await expect(
      new ExecutionSession(factory).run('/assets/', '中'.repeat(22000), 'check'),
    ).rejects.toMatchObject({ code: 'too-large' });
    expect(factory).not.toHaveBeenCalled();
  });
});
