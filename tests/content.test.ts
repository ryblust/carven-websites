import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { parseArticle } from '../scripts/content/model.ts';

const valid =
  '---\ntitle: Hello\ndescription: A complete example\nsection: learn\nsource: docs/tutorial.md\nlesson: 0\n---\n\n## Start\n';

describe('authored content boundary', () => {
  it.effect.each([
    ['learn', valid],
    ['reference', valid.replace('section: learn', 'section: reference')],
    [
      'philosophy',
      valid.replace('section: learn', 'section: philosophy').replace('lesson: 0\n', ''),
    ],
  ])('accepts %s metadata without modifying the Markdown body', ([section, source]) =>
    Effect.gen(function* () {
      const article = yield* parseArticle('hello.md', source!);
      assert.strictEqual(article.metadata.section, section);
      assert.strictEqual(article.markdown, '\n## Start\n');
    }),
  );

  it.effect.each([
    ['non-string title', valid.replace('title: Hello', 'title: 123')],
    ['empty title', valid.replace('title: Hello', 'title: " "')],
    ['untrimmed title', valid.replace('title: Hello', 'title: " Hello "')],
    ['unknown section', valid.replace('section: learn', 'section: unknown')],
    ['negative lesson', valid.replace('lesson: 0', 'lesson: -1')],
    ['fractional lesson', valid.replace('lesson: 0', 'lesson: 1.5')],
    ['missing lesson', valid.replace('lesson: 0\n', '')],
    ['misspelled property', valid.replace('description:', 'descripton:')],
    ['unexpected property', valid.replace('title: Hello', 'title: Hello\nextra: value')],
    ['malformed YAML', valid.replace('title: Hello', 'title: [')],
    ['missing frontmatter', '# No metadata'],
  ])('rejects %s with source context', ([, text]) =>
    Effect.gen(function* () {
      const error = yield* parseArticle('broken.md', text!).pipe(Effect.flip);
      assert.strictEqual(error._tag, 'ContentError');
      assert.strictEqual(error.file, 'broken.md');
      assert.strictEqual(error.operation, 'metadata');
    }),
  );
});
