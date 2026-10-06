import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'vite';

const state = vi.hoisted(() => ({
  acquired: vi.fn(),
  released: vi.fn(),
  entered: vi.fn(),
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
    generateContent: () => Effect.sync(() => state.entered()).pipe(Effect.andThen(Effect.never)),
  };
});

import { contentPlugin } from '../scripts/content/vite.ts';

describe('content development lifetime', () => {
  it('generates on change and releases resources and queued work when the server closes', async () => {
    state.acquired.mockClear();
    state.released.mockClear();
    state.entered.mockClear();
    const server = await createServer({
      configFile: false,
      plugins: [contentPlugin()],
      server: { middlewareMode: true, watch: null, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const errors = vi.spyOn(server.config.logger, 'error');
    try {
      expect(state.entered).not.toHaveBeenCalled();
      expect(state.acquired).not.toHaveBeenCalled();
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/example.md`);
      await vi.waitFor(() => expect(state.entered).toHaveBeenCalled(), { timeout: 5000 });
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/another.md`);
      await server.close();
      expect(state.acquired).toHaveBeenCalled();
      expect(state.released.mock.calls.length).toBe(state.acquired.mock.calls.length);
      expect(state.entered).toHaveBeenCalledTimes(1);
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/after-close.md`);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(state.entered).toHaveBeenCalledTimes(1);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await server.close();
      errors.mockRestore();
    }
  });
});
