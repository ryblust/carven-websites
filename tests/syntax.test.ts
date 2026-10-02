import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { Markdown } from '../scripts/content/Markdown.ts';

describe('shared syntax rendering', () => {
  it.effect.each(['cv', 'carven', 'cpp', 'sh'])(
    'preserves source text and escapes HTML in %s code',
    (language) =>
      Effect.gen(function* () {
        const markdown = yield* Markdown;
        const source = [
          'fn value() -> i32 {',
          '    // <script>alert("x")</script> & &lt; 中文',
          '    print("<tag attr=\'value\'>");',
          '    return 42;',
          '}',
        ].join('\n');
        const html = yield* markdown.render(
          'sample.cv',
          ['```' + language, source, '```'].join('\n'),
        );
        const code = html.match(/<code\b[^>]*>([\s\S]*?)<\/code>/)?.[1];
        assert.isDefined(code);
        assert.include(html, '--shiki-light:');
        assert.include(html, '--shiki-dark:');
        assert.notMatch(html, /<\/?(?:script|tag)\b/i);
        const text = code!
          .replace(/<[^>]+>/g, '')
          .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
            if (entity.startsWith('#')) {
              const hexadecimal = entity[1]?.toLowerCase() === 'x';
              return String.fromCodePoint(
                Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10),
              );
            }
            const named: Record<string, string> = {
              amp: '&',
              lt: '<',
              gt: '>',
              quot: '"',
              apos: "'",
            };
            return named[entity.toLowerCase()]!;
          });
        assert.strictEqual(text, source);
      }).pipe(Effect.provide(Markdown.layer)),
  );

  it.effect('rejects unsupported code languages with source context', () =>
    Effect.gen(function* () {
      const markdown = yield* Markdown;
      const error = yield* markdown
        .render('unknown.md', '```unsupported-language\ncode\n```')
        .pipe(Effect.flip);
      assert.strictEqual(error._tag, 'ContentError');
      assert.strictEqual(error.file, 'unknown.md');
      assert.strictEqual(error.operation, 'render');
    }).pipe(Effect.provide(Markdown.layer)),
  );
});
