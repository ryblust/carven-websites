import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { parseArticle } from '../scripts/content/model.ts';

const valid =
  '---\ntitle: Hello\ndescription: A complete example\nsection: learn\nsource: docs/tutorial.md\nlesson: 0\n---\n\n## Start\n';

describe('authored content metadata', () => {
  it.effect.each([
    ['learn', valid],
    ['reference', valid.replace('section: learn', 'section: reference')],
    [
      'philosophy',
      valid.replace('section: learn', 'section: philosophy').replace('lesson: 0\n', ''),
    ],
    ['internals', valid.replace('section: learn', 'section: internals').replace('lesson: 0\n', '')],
  ])('accepts %s metadata without modifying the Markdown body', ([section, source]) =>
    Effect.gen(function* () {
      const article = yield* parseArticle('hello.md', source!);
      assert.strictEqual(article.metadata.section, section);
      assert.strictEqual(article.markdown, '\n## Start\n');
    }),
  );
});
