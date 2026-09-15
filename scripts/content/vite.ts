import { Cause, Effect, Exit, ManagedRuntime, Semaphore } from 'effect';
import { relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { generateContent } from './generate.ts';
import { ContentLive } from './live.ts';

export function contentPlugin(): Plugin {
  let dispose: (() => Promise<void>) | undefined;
  return {
    name: 'carven-content',
    apply: 'serve',
    async configureServer(server) {
      const runtime = ManagedRuntime.make(ContentLive);
      const serial = Semaphore.makeUnsafe(1);
      const controller = new AbortController();
      const contentDirectory = resolve(server.config.root, 'src/content');
      const changed = (event: string, file: string) => {
        const path = relative(contentDirectory, file);
        if (
          !['add', 'change', 'unlink'].includes(event) ||
          path.startsWith('..') ||
          !path.endsWith('.md')
        )
          return;
        void runtime
          .runPromiseExit(
            generateContent(server.config.root).pipe(
              serial.withPermit,
              Effect.tap(() => Effect.sync(() => server.ws.send({ type: 'full-reload' }))),
            ),
            { signal: controller.signal },
          )
          .then((exit) => {
            if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) return;
            const message = Cause.pretty(exit.cause);
            server.config.logger.error(message);
            if (!controller.signal.aborted) {
              server.ws.send({
                type: 'error',
                err: { message, stack: message, plugin: 'carven-content' },
              });
            }
          });
      };
      try {
        await runtime.runPromise(generateContent(server.config.root));
      } catch (error) {
        await runtime.dispose();
        throw error;
      }
      server.watcher.add(contentDirectory);
      server.watcher.on('all', changed);
      dispose = () => {
        server.watcher.off('all', changed);
        controller.abort();
        return runtime.dispose();
      };
    },
    async closeBundle() {
      const cleanup = dispose;
      dispose = undefined;
      await cleanup?.();
    },
  };
}
