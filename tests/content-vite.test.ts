import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'vite';

const state = vi.hoisted(() => ({
  acquired: vi.fn(),
  released: vi.fn(),
  entered: vi.fn(),
  runs: 0,
}));

vi.mock('../scripts/content/live.ts', async () => {
  const { Effect, Layer } = await import('effect');
  return {
    ContentLive: Layer.effectDiscard(
      Effect.acquireRelease(
        Effect.sync(() => state.acquired()),
        () => Effect.sync(() => state.released()),
      ),
    ),
  };
});
vi.mock('../scripts/content/generate.ts', async () => {
  const { Effect } = await import('effect');
  return {
    generateContent: () =>
      Effect.suspend(() =>
        ++state.runs === 1
          ? Effect.void
          : Effect.sync(() => state.entered()).pipe(Effect.andThen(Effect.never)),
      ),
  };
});

import { contentPlugin } from '../scripts/content/vite.ts';

describe('content development lifetime', () => {
  it('releases resources and cancels queued generation when a middleware server closes', async () => {
    state.runs = 0;
    state.acquired.mockClear();
    state.released.mockClear();
    state.entered.mockClear();
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    state.entered.mockImplementation(entered);
    const server = await createServer({
      configFile: false,
      plugins: [contentPlugin()],
      server: { middlewareMode: true, watch: null, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const listenerCount = server.watcher.listenerCount('all');
    const errors = vi.spyOn(server.config.logger, 'error');
    try {
      expect(server.httpServer).toBeNull();
      expect(state.runs).toBe(1);
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/example.md`);
      await started;
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/another.md`);
      await server.close();
      expect(state.acquired).toHaveBeenCalledTimes(1);
      expect(state.released).toHaveBeenCalledTimes(1);
      expect(state.entered).toHaveBeenCalledTimes(1);
      expect(server.watcher.listenerCount('all')).toBeLessThan(listenerCount);
      expect(errors).not.toHaveBeenCalled();
      await server.close();
      expect(state.released).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
      errors.mockRestore();
    }
  });
});
