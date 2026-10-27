import { Effect } from 'effect';
import { readFile } from 'node:fs/promises';
import { ContentRepository } from './ContentRepository.ts';
import { Markdown } from './Markdown.ts';
import { ContentError, parseArticle } from './model.ts';

export const generateContent = Effect.fn('generateContent')(function* (root: string) {
  const repository = yield* ContentRepository;
  const markdown = yield* Markdown;
  const sources = yield* repository.read(root);
  const articles = yield* Effect.forEach(
    sources,
    (source) =>
      Effect.gen(function* () {
        const { metadata, markdown: body } = yield* parseArticle(source.file, source.text);
        const html = yield* markdown.render(source.file, body);
        return { ...metadata, file: source.file, path: source.path, html };
      }),
    { concurrency: 4 },
  );
  const paths = new Set<string>();

  for (const article of articles) {
    if (
      [
        '/',
        '/404/',
        '/playground/',
        '/design/',
        '/zh/',
        '/zh/404/',
        '/zh/playground/',
        '/zh/design/',
      ].includes(article.path)
    ) {
      return yield* new ContentError({
        file: article.file,
        operation: 'metadata',
        cause: `Reserved route: ${article.path}`,
      });
    }
    if (paths.has(article.path)) {
      return yield* new ContentError({
        file: article.file,
        operation: 'metadata',
        cause: `Duplicate route: ${article.path}`,
      });
    }

    paths.add(article.path);
  }

  // Every article must have a matching translation.
  for (const article of articles) {
    const counterpart = article.path.startsWith('/zh/')
      ? article.path.slice(3)
      : `/zh${article.path}`;
    const translated = articles.find((item) => item.path === counterpart);
    if (
      !translated ||
      translated.section !== article.section ||
      translated.source !== article.source ||
      ('lesson' in article && (!('lesson' in translated) || translated.lesson !== article.lesson))
    ) {
      return yield* new ContentError({
        file: article.file,
        operation: 'metadata',
        cause: `Missing or mismatched translation: ${counterpart}`,
      });
    }
  }

  for (const prefix of ['', '/zh'] as const) {
    for (const section of ['learn', 'reference'] as const) {
      const chapters = articles
        .filter((article) => 'lesson' in article)
        .filter(
          (article) =>
            article.section === section && article.path.startsWith(`${prefix}/${section}/`),
        )
        .sort((a, b) => a.lesson - b.lesson);
      for (const [index, article] of chapters.entries()) {
        if (article.lesson !== index) {
          return yield* new ContentError({
            file: article.file,
            operation: 'metadata',
            cause: `${section} chapter numbers must be unique and contiguous from zero`,
          });
        }
      }
    }
  }

  const hero = Object.fromEntries(
    yield* Effect.forEach(
      [
        ['main.cv', 'hero.cv'],
        ['build.cv', 'hero-build.cv'],
      ] as const,
      ([name, file]) =>
        Effect.gen(function* () {
          const source = yield* Effect.tryPromise({
            try: () => readFile(new URL(`../../src/content/${file}`, import.meta.url), 'utf8'),
            catch: (cause) => new ContentError({ file, operation: 'read', cause }),
          });
          return [name, yield* markdown.highlight(file, source.trimEnd())] as const;
        }),
      { concurrency: 2 },
    ),
  );
  yield* repository.publish(root, articles, hero);
  yield* Effect.logInfo(`Prepared ${articles.length} articles.`);

  return articles.map((article) => article.path);
});
