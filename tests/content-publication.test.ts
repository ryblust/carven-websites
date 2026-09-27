import { assert, describe, it } from '@effect/vitest';
import { NodeFileSystem } from '@effect/platform-node';
import { Cause, Deferred, Effect, Fiber, FileSystem, PlatformError } from 'effect';
import { ContentRepository } from '../scripts/content/ContentRepository.ts';
import type { ArticleDocument } from '../src/content/schema.ts';

const article = (name: string, html: string): ArticleDocument => ({
  file: `${name}.md`,
  path: `/${name}/`,
  title: name,
  description: 'Publication test',
  section: 'philosophy',
  source: 'docs/philosophy.md',
  html,
});
const previous = [
  article('first', 'old'),
  article('unchanged', 'stable'),
  article('removed', 'old'),
];
const next = [article('first', 'new'), article('added', 'new'), article('unchanged', 'stable')];

const publish = (root: string, fs: FileSystem.FileSystem, articles: ArticleDocument[]) =>
  ContentRepository.use((repository) => repository.publish(root, articles)).pipe(
    Effect.provide(ContentRepository.layer),
    Effect.provideService(FileSystem.FileSystem, fs),
  );

const snapshot = Effect.fn('snapshot')(function* (root: string, fs: FileSystem.FileSystem) {
  const directory = `${root}/src/generated`;
  const files: Record<string, string> = {};
  for (const name of (yield* fs.readDirectory(directory, { recursive: true })).sort()) {
    if ((yield* fs.stat(`${directory}/${name}`)).type === 'File') {
      files[name] = yield* fs.readFileString(`${directory}/${name}`);
    }
  }
  return files;
});

const fixture = Effect.fn('fixture')(function* () {
  const fs = yield* FileSystem.FileSystem;
  const root = yield* fs.makeTempDirectoryScoped();
  yield* fs.makeDirectory(`${root}/src`);
  yield* publish(root, fs, previous);
  return { fs, root, before: yield* snapshot(root, fs) };
});

const assertClean = Effect.fn('assertClean')(function* (root: string, fs: FileSystem.FileSystem) {
  assert.isFalse(
    (yield* fs.readDirectory(`${root}/src`)).some((name) => name.startsWith('.content-')),
  );
});

describe('content publication transaction', () => {
  it.effect.each(['write', 'backup', 'replace', 'remove'] as const)(
    'preserves the previous generation when %s fails',
    (phase) =>
      Effect.gen(function* () {
        const { fs, root, before } = yield* fixture();
        let failures = 0;
        const fail = (method: string, path: string) => {
          failures++;
          return Effect.fail(
            PlatformError.systemError({
              _tag: 'PermissionDenied',
              module: 'FileSystem',
              method,
              pathOrDescriptor: path,
              description: 'Injected publication failure',
            }),
          );
        };
        const faulty = FileSystem.FileSystem.of({
          ...fs,
          writeFileString: (path, contents, options) =>
            phase === 'write' && path.endsWith('/next/manifest.ts')
              ? fail('writeFileString', path)
              : fs.writeFileString(path, contents, options),
          copyFile: (from, to) =>
            phase === 'backup' && to.endsWith('/previous/manifest.ts')
              ? fail('copyFile', to)
              : fs.copyFile(from, to),
          rename: (from, to) =>
            phase === 'replace' && from.endsWith('/next/manifest.ts')
              ? fail('rename', to)
              : fs.rename(from, to),
          remove: (path, options) =>
            phase === 'remove' && path === `${root}/src/generated/articles/removed.ts`
              ? fail('remove', path)
              : fs.remove(path, options),
        });
        const error = yield* publish(root, faulty, next).pipe(Effect.flip);
        assert.strictEqual(error.operation, 'publish');
        assert.strictEqual(failures, 1);
        assert.deepStrictEqual(yield* snapshot(root, fs), before);
        yield* assertClean(root, fs);
      }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('cancels staging without changing the previous generation', () =>
    Effect.gen(function* () {
      const { fs, root, before } = yield* fixture();
      const entered = yield* Deferred.make<void>();
      const paused = FileSystem.FileSystem.of({
        ...fs,
        writeFileString: (path, contents, options) =>
          fs
            .writeFileString(path, contents, options)
            .pipe(
              Effect.andThen(
                path.endsWith('/next/manifest.ts')
                  ? Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never))
                  : Effect.void,
              ),
            ),
      });
      const fiber = yield* Effect.forkChild(publish(root, paused, next));
      yield* Deferred.await(entered);
      yield* Fiber.interrupt(fiber);
      const exit = yield* Fiber.await(fiber);
      assert.strictEqual(exit._tag, 'Failure');
      if (exit._tag === 'Failure') assert.isTrue(Cause.hasInterruptsOnly(exit.cause));
      assert.deepStrictEqual(yield* snapshot(root, fs), before);
      yield* assertClean(root, fs);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('retains recovery files and reports a failed rollback', () =>
    Effect.gen(function* () {
      const { fs, root, before } = yield* fixture();
      const faulty = FileSystem.FileSystem.of({
        ...fs,
        rename: (from, to) =>
          from.endsWith('/next/manifest.ts') || from.endsWith('/previous/articles/first.ts')
            ? Effect.fail(
                PlatformError.systemError({
                  _tag: 'PermissionDenied',
                  module: 'FileSystem',
                  method: 'rename',
                  pathOrDescriptor: to,
                }),
              )
            : fs.rename(from, to),
      });
      const exit = yield* publish(root, faulty, next).pipe(Effect.exit);
      assert.strictEqual(exit._tag, 'Failure');
      if (exit._tag === 'Failure') assert.include(Cause.pretty(exit.cause), 'backups retained at');
      const recovery = (yield* fs.readDirectory(`${root}/src`)).filter((name) =>
        name.startsWith('.content-'),
      );
      assert.strictEqual(recovery.length, 1);
      assert.strictEqual(
        yield* fs.readFileString(`${root}/src/${recovery[0]}/previous/articles/first.ts`),
        before['articles/first.ts'],
      );
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('finishes an in-progress commit before honoring cancellation', () =>
    Effect.gen(function* () {
      const { fs, root } = yield* fixture();
      const entered = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      const paused = FileSystem.FileSystem.of({
        ...fs,
        rename: (from, to) =>
          fs
            .rename(from, to)
            .pipe(
              Effect.andThen(
                from.endsWith('/next/articles/first.ts')
                  ? Deferred.succeed(entered, undefined).pipe(
                      Effect.andThen(Deferred.await(release)),
                    )
                  : Effect.void,
              ),
            ),
      });
      const fiber = yield* Effect.forkChild(publish(root, paused, next));
      yield* Deferred.await(entered);
      const cancellation = yield* Effect.forkChild(Fiber.interrupt(fiber), {
        startImmediately: true,
      });
      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(cancellation);
      const exit = yield* Fiber.await(fiber);
      assert.strictEqual(exit._tag, 'Failure');
      if (exit._tag === 'Failure') assert.isTrue(Cause.hasInterruptsOnly(exit.cause));
      const after = yield* snapshot(root, fs);
      assert.include(after['articles/first.ts']!, '"new"');
      assert.include(after['articles/added.ts']!, '"new"');
      assert.include(after['manifest.ts']!, '"/added/"');
      assert.notProperty(after, 'articles/removed.ts');
      assert.notInclude(after['manifest.ts']!, '"/removed/"');
      yield* assertClean(root, fs);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('preserves unchanged module modification times', () =>
    Effect.gen(function* () {
      const { fs, root } = yield* fixture();
      const unchanged = `${root}/src/generated/articles/unchanged.ts`;
      yield* fs.utimes(unchanged, 1, 1);
      const before = yield* fs.stat(unchanged);
      yield* publish(root, fs, next);
      const after = yield* fs.stat(unchanged);
      assert.deepStrictEqual(after.mtime, before.mtime);
      yield* assertClean(root, fs);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );
});
