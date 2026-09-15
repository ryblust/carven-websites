import { Effect } from 'effect';
import { homeExamples } from '../../src/content/home-examples.ts';
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
    if (['/', '/404/', '/zh/', '/zh/404/'].includes(article.path)) {
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
  // Once bilingual authoring is present, publish only complete matching pairs.
  if (articles.some((article) => article.path.startsWith('/zh/'))) {
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
  const highlightedExamples = Object.fromEntries(
    yield* Effect.forEach(Object.entries(homeExamples), ([name, code]) =>
      Effect.gen(function* () {
        const language = name.endsWith('Cpp') ? 'cpp' : 'cv';
        const html = yield* markdown.render(
          `home-examples/${name}`,
          '```' + language + '\n' + code + '\n```',
        );
        return [name, html] as const;
      }),
    ),
  );
  yield* repository.publish(root, articles, highlightedExamples);
  yield* Effect.logInfo(`Prepared ${articles.length} articles.`);
  return articles.map((article) => article.path);
});
