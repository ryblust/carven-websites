import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { Markdown } from '../scripts/content/Markdown.ts';

describe('shared syntax rendering', () => {
  it.effect('preserves code and escapes HTML while applying the Vesper palette', () =>
    Effect.gen(function* () {
      const markdown = yield* Markdown;
      const html = yield* markdown.render(
        'sample.cv',
        [
          '```cv',
          'fn value() -> i32 {',
          '    // return is a comment',
          '    print("<script>return</script>");',
          '    return 42;',
          '}',
          '```',
        ].join('\n'),
      );
      assert.include(html, 'color:#A0A0A0">fn');
      assert.match(html, /color:#FFC799">\s*value/);
      assert.match(html, /color:#FFC799">\s*print/);
      assert.include(html, '#929292');
      assert.include(html, '&#x3C;script>return&#x3C;/script>');
      assert.notInclude(html, '<script>');
      assert.include(html, '    ');
    }).pipe(Effect.provide(Markdown.layer)),
  );
});
