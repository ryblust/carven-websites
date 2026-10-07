import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'vite';

const state = vi.hoisted(() => ({ resources: 0, running: 0, started: 0, blockGeneration: false }));

// Replace only the owned I/O scope and the long-running generation operation.
// Vite's server and the plugin's shutdown behavior remain real.
vi.mock('../scripts/content/live.ts', async () => {
  const { Effect, Layer } = await import('effect');
  return {
    ContentLive: Layer.effectDiscard(
      Effect.acquireRelease(
        Effect.sync(() => state.resources++),
        () => Effect.sync(() => state.resources--),
      ),
    ),
  };
});
vi.mock('../scripts/content/generate.ts', async () => {
  const { Effect } = await import('effect');
  return {
    generateContent: () =>
      Effect.acquireRelease(
        Effect.sync(() => {
          state.started++;
          state.running++;
        }),
        () => Effect.sync(() => state.running--),
      ).pipe(
        Effect.andThen(Effect.suspend(() => (state.blockGeneration ? Effect.never : Effect.void))),
        Effect.scoped,
      ),
  };
});

import { contentPlugin } from '../scripts/content/vite.ts';

describe('content development lifetime', () => {
  it('interrupts pending generation and releases its resources when the server closes', async () => {
    state.resources = 0;
    state.running = 0;
    state.started = 0;
    state.blockGeneration = false;
    const server = await createServer({
      configFile: false,
      plugins: [contentPlugin()],
      server: { middlewareMode: true, watch: null, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    state.blockGeneration = true;
    const errors = vi.spyOn(server.config.logger, 'error');
    const messages = vi.spyOn(server.ws, 'send').mockImplementation(() => {});
    try {
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/example.md`);
      await vi.waitFor(() => expect(state.running).toBeGreaterThan(0), { timeout: 5000 });
      expect(state.resources).toBeGreaterThan(0);
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/another.md`);
      await server.close();
      expect(state.running).toBe(0);
      expect(state.resources).toBe(0);
      const startedBeforeClose = state.started;
      server.watcher.emit('all', 'change', `${server.config.root}/src/content/after-close.md`);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(state.started).toBe(startedBeforeClose);
      expect(state.running).toBe(0);
      expect(state.resources).toBe(0);
      expect(messages).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await server.close();
      messages.mockRestore();
      errors.mockRestore();
    }
  });
});
