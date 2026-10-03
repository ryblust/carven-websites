import { assert, describe, it } from '@effect/vitest';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, FileSystem, PlatformError } from 'effect';
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

const snapshot = Effect.fn('snapshot')(function* (directory: string, fs: FileSystem.FileSystem) {
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
  return { fs, root, before: yield* snapshot(`${root}/src/generated`, fs) };
});

const assertClean = Effect.fn('assertClean')(function* (root: string, fs: FileSystem.FileSystem) {
  assert.deepStrictEqual(yield* fs.readDirectory(`${root}/src`), ['generated']);
});

describe('generated content publication', () => {
  it.effect('replaces changed modules, adds new modules and removes obsolete modules', () =>
    Effect.gen(function* () {
      const { fs, root } = yield* fixture();
      yield* publish(root, fs, next);
      const files = yield* snapshot(`${root}/src/generated`, fs);
      assert.include(files['articles/first.ts'], '"new"');
      assert.include(files['articles/added.ts'], '"new"');
      assert.include(files['articles/unchanged.ts'], '"stable"');
      assert.notProperty(files, 'articles/removed.ts');
      assert.include(files['manifest.ts'], '"/added/"');
      assert.notInclude(files['manifest.ts'], '"/removed/"');
      assert.deepStrictEqual(
        Object.keys(files).filter((file) => file.startsWith('routes/')),
        ['routes/added.tsx', 'routes/first.tsx', 'routes/unchanged.tsx'],
      );
      yield* assertClean(root, fs);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('reports a staging write failure without replacing published modules', () =>
    Effect.gen(function* () {
      const { fs, root, before } = yield* fixture();
      const faulty = FileSystem.FileSystem.of({
        ...fs,
        writeFileString: (path, contents, options) =>
          path.endsWith('/manifest.ts')
            ? Effect.fail(
                PlatformError.systemError({
                  _tag: 'PermissionDenied',
                  module: 'FileSystem',
                  method: 'writeFileString',
                  pathOrDescriptor: path,
                }),
              )
            : fs.writeFileString(path, contents, options),
      });
      const error = yield* publish(root, faulty, next).pipe(Effect.flip);
      assert.strictEqual(error.operation, 'publish');
      assert.strictEqual(error.file, `${root}/src/generated`);
      assert.deepStrictEqual(yield* snapshot(`${root}/src/generated`, fs), before);
      yield* assertClean(root, fs);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('leaves unchanged modules untouched', () =>
    Effect.gen(function* () {
      const { fs, root } = yield* fixture();
      const unchanged = `${root}/src/generated/articles/unchanged.ts`;
      yield* fs.utimes(unchanged, 1, 1);
      const before = yield* fs.stat(unchanged);
      yield* publish(root, fs, next);
      const after = yield* fs.stat(unchanged);
      assert.deepStrictEqual(after.mtime, before.mtime);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );
});
