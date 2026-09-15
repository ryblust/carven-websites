import { join, relative, resolve, dirname } from 'node:path';
import { Context, Effect, FileSystem, Layer, Schema } from 'effect';
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
            const staging = yield* fs.makeTempDirectoryScoped({
              directory: resolve(root, 'src'),
              prefix: '.content-',
            });
            for (const [name, text] of modules) {
              const staged = join(staging, name);
              const target = join(output, name);
              yield* fs.makeDirectory(dirname(staged), { recursive: true });
              yield* fs.writeFileString(staged, text);
              yield* fs.makeDirectory(dirname(target), { recursive: true });
              const unchanged =
                (yield* fs.exists(target)) && (yield* fs.readFileString(target)) === text;
              if (!unchanged) yield* fs.rename(staged, target);
            }
            // Generated articles removed from the source must not survive in the output.
            const existing = yield* fs.readDirectory(output, { recursive: true });
            for (const name of existing) {
              const target = join(output, name);
              if (
                !modules.has(name.replaceAll('\\', '/')) &&
                (yield* fs.stat(target)).type === 'File'
              ) {
                yield* fs.remove(target);
              }
            }
          }),
        ).pipe(
          Effect.mapError(
            (cause) => new ContentError({ file: output, operation: 'publish', cause }),
          ),
        );
      });
      return ContentRepository.of({ read, publish });
    }),
  );
}
