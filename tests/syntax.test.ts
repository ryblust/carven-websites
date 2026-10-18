import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { Markdown } from '../scripts/content/Markdown.ts';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import carven from '../scripts/content/syntax/carven.ts';
import paper from '../scripts/content/syntax/paper.ts';
import { afterAll, beforeAll } from 'vitest';

describe('Carven string token boundaries', () => {
  let highlighter: Awaited<ReturnType<typeof createHighlighterCore>>;

  beforeAll(async () => {
    highlighter = await createHighlighterCore({
      engine: createOnigurumaEngine(import('shiki/wasm')),
      themes: [paper],
      langs: [carven],
    });
  });

  afterAll(() => highlighter?.dispose());

  it.each([
    ['raw trailing backslash', 'r"C:\\tools\\"'],
    ['raw delimiter hashes', 'r##"a "# quote and \\n"##'],
    ['raw multiline quotes', 'r#"""\n    A literal """ and \\n.\n"""#'],
    ['multiline quotes', '"""\n    A "quoted" line.\n"""'],
  ])('keeps %s inside the string and resumes highlighting after it', (_, literal) => {
    const source = `let text = ${literal};\nconst done = true;`;
    const tokens = highlighter.codeToTokensBase(source, {
      lang: 'carven',
      theme: paper.name,
    });
    const stringColor = paper.tokenColors.find((rule) => rule.scope?.includes('string'))!.settings
      .foreground;
    const keywordColor = paper.tokenColors.find((rule) => rule.scope?.includes('keyword'))!.settings
      .foreground;
    assert.strictEqual(
      tokens.map((line) => line.map((token) => token.content).join('')).join('\n'),
      source,
    );
    const stringText = tokens
      .map((line) =>
        line
          .filter((token) => token.color === stringColor)
          .map((token) => token.content)
          .join(''),
      )
      .join('\n')
      .trimEnd();
    assert.strictEqual(stringText, literal);
    assert.strictEqual(
      tokens
        .at(-1)!
        .filter((token) => token.color === keywordColor)
        .map((token) => token.content)
        .join(''),
      'const',
    );
  });
});

describe('shared syntax rendering', () => {
  it.effect('generates readable, unique heading anchors independently for each document', () =>
    Effect.gen(function* () {
      const markdown = yield* Markdown;
      const source = "## Import a module's API\n\n## Import a module's API";
      const first = yield* markdown.render('first.md', source);
      const second = yield* markdown.render('second.md', source);

      for (const html of [first, second]) {
        assert.include(html, 'id="import-a-modules-api"');
        assert.include(html, 'id="import-a-modules-api-1"');
      }
    }).pipe(Effect.provide(Markdown.layer)),
  );

  it.effect('marks runnable examples and highlighted lines without changing source', () =>
    Effect.gen(function* () {
      const markdown = yield* Markdown;
      const source = 'let first = 1;\nlet second = 2;\nlet third = 3;\nprintln(third);';
      const html = yield* markdown.render('focus.md', `\`\`\`cv run {1-2,4}\n${source}\n\`\`\``);
      assert.include(html, 'data-language="cv"');
      assert.include(html, 'data-runnable="true"');
      const fragment = yield* markdown.render('fragment.md', '```cv\nfn helper() {}\n```');
      assert.notInclude(fragment, 'data-runnable');
      const native = yield* markdown.render('native.md', '```cpp run\nint main() {}\n```');
      assert.notInclude(native, 'data-runnable');
      const emphasizedLines = [
        ...html.matchAll(/<span\b[^>]*class="line highlighted"[^>]*>([^\n]*)/g),
      ].map((match) => match[1]!.replace(/<[^>]+>/g, ''));
      assert.deepStrictEqual(emphasizedLines, [
        'let first = 1;',
        'let second = 2;',
        'println(third);',
      ]);
      const code = html.match(/<code\b[^>]*>([\s\S]*?)<\/code>/)?.[1];
      assert.strictEqual(code?.replace(/<[^>]+>/g, ''), source);
    }).pipe(Effect.provide(Markdown.layer)),
  );

  it.effect('preserves Carven source text and escapes HTML in rendered code', () =>
    Effect.gen(function* () {
      const markdown = yield* Markdown;
      const source = [
        'fn value() -> i32 {',
        '    // <script>alert("x")</script> & &lt; 中文',
        '    print("<tag attr=\'value\'>");',
        '    return 42;',
        '}',
      ].join('\n');
      const html = yield* markdown.render('sample.cv', ['```cv', source, '```'].join('\n'));
      const code = html.match(/<code\b[^>]*>([\s\S]*?)<\/code>/)?.[1];
      assert.isDefined(code);
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
});
