import { assert, describe, it } from '@effect/vitest';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, FileSystem, Layer } from 'effect';
import { generateContent } from '../scripts/content/generate.ts';
import { ContentRepository } from '../scripts/content/ContentRepository.ts';
import { Markdown } from '../scripts/content/Markdown.ts';
import { ContentError } from '../scripts/content/model.ts';
import { ContentLive } from '../scripts/content/live.ts';
import { pathToFileURL } from 'node:url';
import { homeExamples } from '../src/content/home-examples.ts';

const lesson = (number: number) =>
  `---\ntitle: Lesson ${number}\ndescription: Test lesson\nsection: learn\nlesson: ${number}\nsource: docs/tutorial.md\n---\n\n## Body ${number}\n\n\`\`\`cv\nfn main() {}\n\`\`\`\n`;

const importGenerated = (file: string) =>
  Effect.promise(() => import(/* @vite-ignore */ pathToFileURL(file).href));

describe('content build', () => {
  it.effect('renders independent article modules and removes obsolete generated files', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();
      yield* fs.makeDirectory(`${root}/src/content/learn`, { recursive: true });
      yield* fs.makeDirectory(`${root}/src/generated/articles`, { recursive: true });
      yield* fs.writeFileString(`${root}/src/generated/articles/removed.ts`, 'obsolete');
      yield* fs.writeFileString(`${root}/src/content/learn/index.md`, lesson(0));
      yield* fs.writeFileString(`${root}/src/content/learn/values.md`, lesson(1));
      const paths = yield* generateContent(root).pipe(Effect.provide(ContentLive));
      assert.deepStrictEqual(paths, ['/learn/', '/learn/values/']);
      const first = yield* importGenerated(`${root}/src/generated/articles/learn/index.ts`);
      const second = yield* importGenerated(`${root}/src/generated/articles/learn/values.ts`);
      assert.include(first.default, 'Body 0');
      assert.notInclude(first.default, 'Body 1');
      assert.include(second.default, 'Body 1');
      assert.notInclude(second.default, 'Body 0');
      const manifest = yield* importGenerated(`${root}/src/generated/manifest.ts`);
      assert.deepStrictEqual(manifest.articlePaths, paths);
      assert.deepStrictEqual(manifest.lessonPaths, paths);
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
      assert.isFalse(yield* fs.exists(`${root}/src/generated/articles/removed.ts`));
      assert.deepStrictEqual((yield* fs.readDirectory(`${root}/src`)).sort(), [
        'content',
        'generated',
      ]);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect.each([false, true])('releases renderer resources after success/failure (%s)', (fail) =>
    Effect.gen(function* () {
      let released = 0;
      let published = 0;
      const renderer = Layer.effect(
        Markdown,
        Effect.gen(function* () {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              released++;
            }),
          );
          return Markdown.of({
            render: (file) =>
              fail
                ? Effect.fail(
                    new ContentError({ file, operation: 'render', cause: 'Invalid code language' }),
                  )
                : Effect.succeed('<p>Rendered</p>'),
          });
        }),
      );
      const repository = ContentRepository.of({
        read: () => Effect.succeed([{ file: 'learn/index.md', path: '/learn/', text: lesson(0) }]),
        publish: () =>
          Effect.sync(() => {
            published++;
          }),
      });
      const exit = yield* generateContent('/unused').pipe(
        Effect.provideService(ContentRepository, repository),
        Effect.provide(renderer),
        Effect.exit,
      );
      assert.strictEqual(exit._tag, fail ? 'Failure' : 'Success');
      assert.strictEqual(released, 1);
      assert.strictEqual(published, fail ? 0 : 1);
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
    ['reserved translated home route', '/zh/', 1],
    ['reserved translated error route', '/zh/404/', 1],
  ] as const)('rejects %s before publication', ([, path, number]) =>
    Effect.gen(function* () {
      let published = false;
      const repository = ContentRepository.of({
        read: () =>
          Effect.succeed([
            { file: 'learn/index.md', path: '/learn/', text: lesson(0) },
            { file: 'learn/values.md', path, text: lesson(number) },
          ]),
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
      const sources = [
        { file: 'learn/index.md', path: '/learn/', text: lesson(0) },
        {
          file: 'reference/index.md',
          path: '/reference/',
          text: lesson(referenceOrder).replace('section: learn', 'section: reference'),
        },
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
  it.effect.each(['complete', 'missing', 'mismatch'] as const)(
    'validates bilingual pairs (%s)',
    (mode) =>
      Effect.gen(function* () {
        let published = false;
        const sources = [
          { file: 'learn/index.md', path: '/learn/', text: lesson(0) },
          {
            file: 'zh/learn/index.md',
            path: '/zh/learn/',
            text: lesson(mode === 'mismatch' ? 1 : 0),
          },
          ...(mode === 'missing'
            ? [{ file: 'learn/values.md', path: '/learn/values/', text: lesson(1) }]
            : []),
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
      }),
  );
});
