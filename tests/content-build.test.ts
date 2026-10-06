import { assert, describe, it } from '@effect/vitest';
import { NodeFileSystem } from '@effect/platform-node';
import { Cause, Effect, FileSystem } from 'effect';
import { generateContent } from '../scripts/content/generate.ts';
import { ContentRepository } from '../scripts/content/ContentRepository.ts';
import { Markdown } from '../scripts/content/Markdown.ts';
import { ContentError } from '../scripts/content/model.ts';
import { ContentLive } from '../scripts/content/live.ts';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { homeExamples } from '../src/content/home-examples.ts';

const lesson = (number: number) =>
  `---\ntitle: Lesson ${number}\ndescription: Test lesson\nsection: learn\nlesson: ${number}\nsource: docs/tutorial.md\n---\n\n## Body ${number}\n\n\`\`\`cv\nfn main() {}\n\`\`\`\n`;

const bilingual = (sources: Array<{ file: string; path: string; text: string }>) => [
  ...sources,
  ...sources.map((source) => ({
    ...source,
    file: `zh/${source.file}`,
    path: `/zh${source.path}`,
  })),
];

const importGenerated = (file: string) =>
  Effect.promise(() => import(/* @vite-ignore */ pathToFileURL(file).href));

describe('content build', () => {
  it.effect('renders independent article modules and their navigation metadata', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();
      for (const prefix of ['', '/zh']) {
        yield* fs.makeDirectory(`${root}/src/content${prefix}/learn`, { recursive: true });
        yield* fs.writeFileString(`${root}/src/content${prefix}/learn/index.md`, lesson(0));
        yield* fs.writeFileString(`${root}/src/content${prefix}/learn/values.md`, lesson(1));
      }
      const paths = yield* generateContent(root).pipe(Effect.provide(ContentLive));
      assert.deepStrictEqual(paths, [
        '/learn/',
        '/learn/values/',
        '/zh/learn/',
        '/zh/learn/values/',
      ]);
      const first = yield* importGenerated(`${root}/src/generated/articles/learn/index.ts`);
      const second = yield* importGenerated(`${root}/src/generated/articles/learn/values.ts`);
      assert.include(first.default, 'Body 0');
      assert.notInclude(first.default, 'Body 1');
      assert.include(second.default, 'Body 1');
      assert.notInclude(second.default, 'Body 0');
      const manifest = yield* importGenerated(`${root}/src/generated/manifest.ts`);
      assert.deepStrictEqual(manifest.articlePaths, paths);
      assert.deepStrictEqual(manifest.lessonPaths, [
        '/learn/',
        '/zh/learn/',
        '/learn/values/',
        '/zh/learn/values/',
      ]);
      assert.deepStrictEqual(manifest.referencePaths, []);
      assert.deepStrictEqual(Object.keys(manifest.articles), paths);
      for (const metadata of Object.values(manifest.articles)) {
        assert.notProperty(metadata, 'html');
        assert.notProperty(metadata, 'file');
      }
      const home = yield* importGenerated(`${root}/src/generated/home-examples.ts`);
      assert.deepStrictEqual(Object.keys(home.homeExamples), Object.keys(homeExamples));
      for (const html of Object.values(home.homeExamples)) {
        assert.isString(html);
        assert.isNotEmpty(html);
      }
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('publishes literal article URLs as independent routes', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();
      // URL hierarchy and router token names must not imply layout or lazy modules.
      const files = ['guide.md', 'guide/route.md', 'guide/route/child.md', 'guide/lazy.md'];
      for (const prefix of ['', '/zh']) {
        yield* fs.makeDirectory(`${root}/src/content${prefix}/guide/route`, { recursive: true });
        for (const file of files) {
          yield* fs.writeFileString(
            `${root}/src/content${prefix}/${file}`,
            '---\ntitle: Guide\ndescription: A guide\nsection: philosophy\nsource: docs/guide.md\n---\n\nGuide body.\n',
          );
        }
      }
      yield* generateContent(root).pipe(Effect.provide(ContentLive));
      const { articleRoutes } = yield* importGenerated(`${root}/src/generated/article-routes.ts`);
      assert.deepStrictEqual(
        articleRoutes.map(({ type, path }: { type: string; path: string }) => ({ type, path })),
        [
          { type: 'route', path: '/guide' },
          { type: 'route', path: '/guide/lazy' },
          { type: 'route', path: '/guide/route' },
          { type: 'route', path: '/guide/route/child' },
          { type: 'route', path: '/zh/guide' },
          { type: 'route', path: '/zh/guide/lazy' },
          { type: 'route', path: '/zh/guide/route' },
          { type: 'route', path: '/zh/guide/route/child' },
        ],
      );
      const modules = new Set<string>();
      for (const route of articleRoutes) {
        assert.notProperty(route, 'children');
        assert.isTrue(yield* fs.exists(resolve(root, 'src/routes', route.file)));
        modules.add(route.file);
      }
      assert.strictEqual(modules.size, articleRoutes.length);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('reports rendering errors without publishing content', () =>
    Effect.gen(function* () {
      let published = false;
      const error = yield* generateContent('/unused').pipe(
        Effect.provideService(
          ContentRepository,
          ContentRepository.of({
            read: () =>
              Effect.succeed(
                bilingual([{ file: 'learn/index.md', path: '/learn/', text: lesson(0) }]),
              ),
            publish: () =>
              Effect.sync(() => {
                published = true;
              }),
          }),
        ),
        Effect.provideService(
          Markdown,
          Markdown.of({
            render: (file) =>
              Effect.fail(
                new ContentError({
                  file,
                  operation: 'render',
                  cause: 'Invalid code language',
                }),
              ),
          }),
        ),
        Effect.flip,
      );
      assert.strictEqual(error.operation, 'render');
      assert.isFalse(published);
    }),
  );

  it.effect('preserves old output when reading fails', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();
      yield* fs.makeDirectory(`${root}/src/generated`, { recursive: true });
      yield* fs.writeFileString(`${root}/src/generated/manifest.ts`, 'previous');
      const error = yield* generateContent(root).pipe(Effect.provide(ContentLive), Effect.flip);
      assert.strictEqual(error.operation, 'read');
      assert.strictEqual(yield* fs.readFileString(`${root}/src/generated/manifest.ts`), 'previous');
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect.each([
    ['duplicate chapter number', '/learn/values/', 0],
    ['duplicate article route', '/learn/', 1],
    ['reserved home route', '/', 1],
    ['reserved error route', '/404/', 1],
    ['reserved playground route', '/playground/', 1],
    ['reserved design route', '/design/', 1],
    ['reserved translated home route', '/zh/', 1],
    ['reserved translated error route', '/zh/404/', 1],
    ['reserved translated playground route', '/zh/playground/', 1],
    ['reserved translated design route', '/zh/design/', 1],
  ] as const)('rejects %s before publication', ([rule, path, number]) =>
    Effect.gen(function* () {
      let published = false;
      const repository = ContentRepository.of({
        read: () =>
          Effect.succeed(
            bilingual([
              { file: 'learn/index.md', path: '/learn/', text: lesson(0) },
              { file: 'learn/values.md', path, text: lesson(number) },
            ]),
          ),
        publish: () =>
          Effect.sync(() => {
            published = true;
          }),
      });
      const error = yield* generateContent('/unused').pipe(
        Effect.provideService(ContentRepository, repository),
        Effect.provideService(Markdown, Markdown.of({ render: () => Effect.succeed('html') })),
        Effect.flip,
      );
      assert.strictEqual(error.operation, 'metadata');
      if (rule.startsWith('reserved')) {
        assert.strictEqual(error.cause, `Reserved route: ${path}`);
      }
      assert.isFalse(published);
    }),
  );
});

describe('static code readability', () => {
  it.effect.each([
    ['cv', 'Carven'],
    ['cpp', 'C++'],
    ['sh', 'Shell'],
    ['text', ''],
  ])('keeps the %s code and language label readable without JavaScript', ([language, label]) =>
    Effect.gen(function* () {
      const markdown = yield* Markdown;
      const html = yield* markdown.render('code.md', `\`\`\`${language}\nexample\n\`\`\``);
      const visibleText = html.replace(/<[^>]*>/g, '');
      assert.include(visibleText, 'example');
      if (label) assert.include(visibleText, label);
    }).pipe(Effect.provide(Markdown.layer)),
  );
});

describe('independent books', () => {
  it.effect.each([0, 1])('validates reference ordering independently (%s)', (referenceOrder) =>
    Effect.gen(function* () {
      let published = false;
      const sources = bilingual([
        { file: 'learn/index.md', path: '/learn/', text: lesson(0) },
        {
          file: 'reference/index.md',
          path: '/reference/',
          text: lesson(referenceOrder).replace('section: learn', 'section: reference'),
        },
      ]);
      const result = yield* generateContent('/unused').pipe(
        Effect.provideService(
          ContentRepository,
          ContentRepository.of({
            read: () => Effect.succeed(sources),
            publish: () =>
              Effect.sync(() => {
                published = true;
              }),
          }),
        ),
        Effect.provideService(
          Markdown,
          Markdown.of({ render: () => Effect.succeed('<h2>Text</h2>') }),
        ),
        Effect.exit,
      );
      assert.strictEqual(result._tag, referenceOrder === 0 ? 'Success' : 'Failure');
      assert.strictEqual(published, referenceOrder === 0);
    }),
  );
});

describe('translation publication boundary', () => {
  it.effect.each(['complete', 'English only', 'Chinese only', 'mismatched lesson'] as const)(
    'requires matching bilingual pairs (%s)',
    (mode) =>
      Effect.gen(function* () {
        let published = false;
        const sources = [
          ...(mode === 'Chinese only'
            ? []
            : [{ file: 'learn/index.md', path: '/learn/', text: lesson(0) }]),
          ...(mode === 'English only'
            ? []
            : [
                {
                  file: 'zh/learn/index.md',
                  path: '/zh/learn/',
                  text: lesson(mode === 'mismatched lesson' ? 1 : 0),
                },
              ]),
        ];
        const result = yield* generateContent('/unused').pipe(
          Effect.provideService(
            ContentRepository,
            ContentRepository.of({
              read: () => Effect.succeed(sources),
              publish: () =>
                Effect.sync(() => {
                  published = true;
                }),
            }),
          ),
          Effect.provideService(
            Markdown,
            Markdown.of({ render: () => Effect.succeed('<p>text</p>') }),
          ),
          Effect.exit,
        );
        assert.equal(result._tag, mode === 'complete' ? 'Success' : 'Failure');
        assert.equal(published, mode === 'complete');
        if (result._tag === 'Failure') {
          assert.include(Cause.pretty(result.cause), 'Missing or mismatched translation:');
        }
      }),
  );
});
