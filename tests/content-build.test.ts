import { assert, describe, it } from '@effect/vitest';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, FileSystem } from 'effect';
import { pathToFileURL } from 'node:url';
import { generateContent } from '../scripts/content/generate.ts';
import { Markdown } from '../scripts/content/Markdown.ts';
import { ContentLive } from '../scripts/content/live.ts';

const chapter = (section: 'learn' | 'reference', number: number) =>
  `---\ntitle: Chapter ${number}\ndescription: Test chapter\nsection: ${section}\nlesson: ${number}\nsource: docs/${section}.md\n---\n\n## Body ${number}\n\n\`\`\`cv\nfn main() {}\n\`\`\`\n`;

const importGenerated = (file: string) =>
  Effect.promise(() => import(/* @vite-ignore */ pathToFileURL(file).href));

describe('content build', () => {
  it.effect('renders bilingual articles with separate tutorial and reference navigation', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();

      for (const prefix of ['', '/zh']) {
        for (const section of ['learn', 'reference'] as const) {
          yield* fs.makeDirectory(`${root}/src/content${prefix}/${section}`, { recursive: true });
          yield* fs.writeFileString(
            `${root}/src/content${prefix}/${section}/index.md`,
            chapter(section, 0),
          );
          yield* fs.writeFileString(
            `${root}/src/content${prefix}/${section}/values.md`,
            chapter(section, 1),
          );
        }
      }

      yield* generateContent(root).pipe(Effect.provide(ContentLive));
      const { articles, lessonPaths, referencePaths } = yield* importGenerated(
        `${root}/src/generated/manifest.ts`,
      );
      const { referenceSearch } = yield* importGenerated(
        `${root}/src/generated/reference-search.ts`,
      );
      assert.deepStrictEqual(Object.keys(referenceSearch).sort(), [
        '/reference/',
        '/reference/values/',
        '/zh/reference/',
        '/zh/reference/values/',
      ]);

      for (const section of ['learn', 'reference']) {
        const navigation = section === 'learn' ? lessonPaths : referencePaths;
        for (const prefix of ['', '/zh']) {
          assert.deepStrictEqual(
            navigation.filter((path: string) => path.startsWith(`${prefix}/${section}/`)),
            [`${prefix}/${section}/`, `${prefix}/${section}/values/`],
          );
          assert.strictEqual(articles[`${prefix}/${section}/values/`].title, 'Chapter 1');
          const overview = yield* importGenerated(
            `${root}/src/generated/articles${prefix}/${section}/index.ts`,
          );
          const values = yield* importGenerated(
            `${root}/src/generated/articles${prefix}/${section}/values.ts`,
          );
          assert.include(overview.default, 'Body 0');
          assert.include(values.default, 'Body 1');
        }
      }
    }).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  it.effect('preserves literal article URLs including router token names', () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();
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
      assert.deepStrictEqual(articleRoutes.map((route: { path: string }) => route.path).sort(), [
        '/guide',
        '/guide/lazy',
        '/guide/route',
        '/guide/route/child',
        '/zh/guide',
        '/zh/guide/lazy',
        '/zh/guide/route',
        '/zh/guide/route/child',
      ]);
    }).pipe(Effect.provide(NodeFileSystem.layer)),
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
