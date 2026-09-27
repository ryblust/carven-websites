import { join, relative, resolve, dirname } from 'node:path';
import { Cause, Context, Effect, FileSystem, Layer, Schema } from 'effect';
import type { ArticleDocument } from '../../src/content/schema.ts';
import { ContentError } from './model.ts';

interface Source {
  readonly file: string;
  readonly path: string;
  readonly text: string;
}

const SourcePath = Schema.String.check(
  Schema.isPattern(/^(?:[a-z][a-z0-9-]*\/)*[a-z][a-z0-9-]*\.md$/),
);
const decodeSourcePath = Schema.decodeUnknownEffect(SourcePath);

export class ContentRepository extends Context.Service<
  ContentRepository,
  {
    read(root: string): Effect.Effect<Source[], ContentError>;
    publish(
      root: string,
      articles: readonly ArticleDocument[],
      homeExamples?: Readonly<Record<string, string>>,
    ): Effect.Effect<void, ContentError>;
  }
>()('carven-website/content/ContentRepository') {
  static readonly layer = Layer.effect(
    ContentRepository,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const files = Effect.fn('ContentRepository.files')(function* (
        directory: string,
      ): Effect.fn.Return<string[], ContentError> {
        const names = yield* fs
          .readDirectory(directory)
          .pipe(
            Effect.mapError(
              (cause) => new ContentError({ file: directory, operation: 'read', cause }),
            ),
          );
        const groups = yield* Effect.forEach(
          names,
          (name) =>
            Effect.gen(function* () {
              const file = join(directory, name);
              const info = yield* fs
                .stat(file)
                .pipe(
                  Effect.mapError((cause) => new ContentError({ file, operation: 'read', cause })),
                );
              if (info.type === 'Directory') return yield* files(file);
              return file.endsWith('.md') ? [file] : [];
            }),
          { concurrency: 4 },
        );
        return groups.flat().sort();
      });

      const read = Effect.fn('ContentRepository.read')(function* (root: string) {
        const directory = resolve(root, 'src/content');
        const sources = yield* files(directory);
        return yield* Effect.forEach(
          sources,
          (file) =>
            Effect.gen(function* () {
              const name = yield* decodeSourcePath(
                relative(directory, file).replaceAll('\\', '/'),
              ).pipe(
                Effect.mapError(
                  (cause) => new ContentError({ file, operation: 'metadata', cause }),
                ),
              );
              const slug = name
                .replace(/\.md$/, '')
                .replace(/(^|\/)index$/, '$1')
                .replace(/\/$/, '');
              const path = slug ? `/${slug}/` : '/';
              const text = yield* fs
                .readFileString(file)
                .pipe(
                  Effect.mapError((cause) => new ContentError({ file, operation: 'read', cause })),
                );
              return { file: name, path, text };
            }),
          { concurrency: 4 },
        );
      });

      const publish = Effect.fn('ContentRepository.publish')(function* (
        root: string,
        articles: readonly ArticleDocument[],
        homeExamples: Readonly<Record<string, string>> = {},
      ) {
        const output = resolve(root, 'src/generated');
        const manifest = Object.fromEntries(
          articles.map(({ html: _html, path, file: _file, ...metadata }) => [path, metadata]),
        );
        const chapterPaths = (section: 'learn' | 'reference') =>
          articles
            .filter((article) => 'lesson' in article)
            .filter((article) => article.section === section)
            .sort((a, b) => a.lesson - b.lesson)
            .map((article) => article.path);
        const lessonPaths = chapterPaths('learn');
        const referencePaths = chapterPaths('reference');
        const modules = new Map(
          articles.map((article) => [
            `articles/${article.file.replace(/\.md$/, '.ts')}`,
            `// Generated from src/content/${article.file}.\nexport default ${JSON.stringify(article.html)};\n`,
          ]),
        );
        modules.set(
          'home-examples.ts',
          `// Generated from src/content/home-examples.ts. Do not edit.\nexport const homeExamples = ${JSON.stringify(homeExamples)} as const;\n`,
        );
        modules.set(
          'manifest.ts',
          [
            '// Generated from src/content. Do not edit.',
            "import type { ArticleMetadata } from '../content/schema.ts';",
            `export const articles = ${JSON.stringify(manifest, null, 2)} as const satisfies Record<string, ArticleMetadata>;`,
            'export type ArticlePath = keyof typeof articles;',
            `export const articlePaths = ${JSON.stringify(articles.map((article) => article.path))} as const satisfies readonly ArticlePath[];`,
            `export const lessonPaths = ${JSON.stringify(lessonPaths)} as const satisfies readonly ArticlePath[];`,
            `export const referencePaths = ${JSON.stringify(referencePaths)} as const satisfies readonly ArticlePath[];`,
            '',
          ].join('\n'),
        );

        yield* Effect.scoped(
          Effect.gen(function* () {
            let retainBackups = false;
            const staging = yield* Effect.acquireRelease(
              fs.makeTempDirectory({
                directory: resolve(root, 'src'),
                prefix: '.content-',
              }),
              (directory) =>
                retainBackups
                  ? Effect.void
                  : fs.remove(directory, { recursive: true }).pipe(Effect.orDie),
            );
            const changes: Array<{ target: string; staged?: string; backup?: string }> = [];
            for (const [name, text] of modules) {
              const target = join(output, name);
              const exists = yield* fs.exists(target);
              if (exists && (yield* fs.readFileString(target)) === text) continue;
              const staged = join(staging, 'next', name);
              yield* fs.makeDirectory(dirname(staged), { recursive: true });
              yield* fs.writeFileString(staged, text);
              yield* fs.makeDirectory(dirname(target), { recursive: true });
              changes.push({
                target,
                staged,
                backup: exists ? join(staging, 'previous', name) : undefined,
              });
            }
            // Prepare removals and backups before changing any published file.
            const existing = yield* fs.readDirectory(output, { recursive: true });
            for (const name of existing) {
              const target = join(output, name);
              if (
                !modules.has(name.replaceAll('\\', '/')) &&
                (yield* fs.stat(target)).type === 'File'
              ) {
                changes.push({ target, backup: join(staging, 'previous', name) });
              }
            }
            for (const { target, backup } of changes) {
              if (!backup) continue;
              yield* fs.makeDirectory(dirname(backup), { recursive: true });
              yield* fs.copyFile(target, backup);
            }

            const committed: typeof changes = [];
            yield* Effect.gen(function* () {
              for (const change of changes) {
                if (change.staged) yield* fs.rename(change.staged, change.target);
                else yield* fs.remove(change.target);
                committed.push(change);
              }
            }).pipe(
              Effect.onError(() =>
                Effect.gen(function* () {
                  retainBackups = true;
                  for (const { target, backup } of [...committed].reverse()) {
                    if (backup) yield* fs.rename(backup, target);
                    else yield* fs.remove(target);
                  }
                  retainBackups = false;
                }).pipe(
                  Effect.catch((cause) =>
                    Effect.die(
                      new Error(`Content rollback failed; backups retained at ${staging}`, {
                        cause,
                      }),
                    ),
                  ),
                ),
              ),
              // Shutdown may cancel preparation, but must wait for commit or rollback.
              Effect.uninterruptible,
            );
          }),
        ).pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(
                cause,
                (error) => new ContentError({ file: output, operation: 'publish', cause: error }),
              ),
            ),
          ),
        );
      });
      return ContentRepository.of({ read, publish });
    }),
  );
}
