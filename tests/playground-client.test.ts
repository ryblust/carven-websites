import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecutionSession } from '../src/playground/client';
import type { ExecutionResult } from '../src/playground/protocol';

class WorkerDouble extends EventTarget {
  sent: { id: number; source: string; action: string }[] = [];
  postMessage(message: { id: number; source: string; action: string }) {
    this.sent.push(message);
  }
  terminate() {}
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
  truncated: false,
};

afterEach(() => vi.useRealTimers());

describe('browser execution results', () => {
  it('returns the execution result', async () => {
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const source = 'println("中文");\n';
    const running = session.run('/project/playground-assets/', source, 'run');
    const request = worker.sent[0]!;
    worker.reply({ id: request.id, type: 'result', result });
    expect(await running).toEqual(result);
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
    next.reply({ id: next.sent[0]!.id, type: 'result', result });
    expect(await second).toEqual(result);
  });

  it('reports an execution failure', async () => {
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const running = session.run('/assets/', 'source', 'run');
    const failure = expect(running).rejects.toMatchObject({ code: 'execution' });
    worker.dispatchEvent(new Event('error'));
    await failure;
  });

  it('reports a timeout when execution does not finish', async () => {
    vi.useFakeTimers();
    const worker = new WorkerDouble();
    const session = new ExecutionSession(() => worker);
    const running = session.run('/assets/', 'loop {}', 'run');
    const failure = expect(running).rejects.toMatchObject({ code: 'timeout' });
    worker.reply({ id: worker.sent[0]!.id, type: 'progress', phase: 'running' });
    await vi.runAllTimersAsync();
    await failure;
  });

  it('reports source beyond the editor size limit', async () => {
    const factory = vi.fn(() => new WorkerDouble());
    await expect(
      new ExecutionSession(factory).run('/assets/', '中'.repeat(22000), 'check'),
    ).rejects.toMatchObject({ code: 'too-large' });
  });
});
