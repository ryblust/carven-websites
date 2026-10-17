import { Context, Effect, Layer } from 'effect';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { codeToKeyedTokens, type KeyedTokensInfo } from '@shikijs/magic-move/core';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import cpp from '@shikijs/langs/cpp';
import shellscript from '@shikijs/langs/shellscript';
import json from '@shikijs/langs/json';
import lua from '@shikijs/langs/lua';
import carven from './syntax/carven.ts';
import paper from './syntax/paper.ts';
import vesperBlack from './syntax/vesper-black.ts';
import { ContentError } from './model.ts';

const languageLabels: Record<string, string> = {
  carven: 'Carven',
  cv: 'Carven',
  cpp: 'C++',
  sh: 'Shell',
  shellscript: 'Shell',
  json: 'JSON',
  lua: 'Lua',
};

export class Markdown extends Context.Service<
  Markdown,
  {
    tokens(
      file: string,
      source: string,
      language: string,
    ): Effect.Effect<KeyedTokensInfo, ContentError>;
    render(
      file: string,
      markdown: string,
      options?: { codeBlockFrame?: boolean },
    ): Effect.Effect<string, ContentError>;
  }
>()('carven-website/content/Markdown') {
  static readonly layer = Layer.effect(
    Markdown,
    Effect.gen(function* () {
      const highlighter = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () =>
            createHighlighterCore({
              engine: createOnigurumaEngine(import('shiki/wasm')),
              themes: [paper, vesperBlack],
              langs: [carven, shellscript, cpp, json, lua],
            }),
          catch: (cause) => new ContentError({ file: 'syntax', operation: 'render', cause }),
        }),
        (highlighter) => Effect.sync(() => highlighter.dispose()),
      );
      const render = Effect.fn('Markdown.render')(function* (
        file: string,
        markdown: string,
        options?: { codeBlockFrame?: boolean },
      ) {
        const marked = new Marked({ gfm: true });
        marked.use(gfmHeadingId());
        marked.use({
          renderer: {
            code({ text, lang }) {
              // A fence may select lines for an explanation, without changing its source text.
              const [language = 'text', ...meta] = (lang || 'text').split(/\s+/);
              const highlighted = highlighter.codeToHtml(text, {
                lang: language,
                themes: { light: paper.name, dark: vesperBlack.name },
                defaultColor: false,
                meta: { __raw: meta.join(' ') },
                transformers: [
                  transformerMetaHighlight(),
                  {
                    pre(node) {
                      node.properties['data-language'] = language;
                    },
                  },
                ],
              });
              if (options?.codeBlockFrame === false) return highlighted;
              // Labels are fixed display strings, never interpolated from authored HTML.
              const label = languageLabels[language] ?? '';
              return `<div class="code-wrap"><div class="code-head"><span>${label}</span></div>${highlighted}</div>`;
            },
          },
        });
        return yield* Effect.tryPromise({
          try: async () => marked.parse(markdown),
          catch: (cause) => new ContentError({ file, operation: 'render', cause }),
        });
      });
      const tokens = (file: string, source: string, language: string) =>
        Effect.try({
          try: () =>
            codeToKeyedTokens(highlighter, source, {
              lang: language,
              themes: { light: paper.name, dark: vesperBlack.name },
              defaultColor: false,
            }),
          catch: (cause) => new ContentError({ file, operation: 'render', cause }),
        });
      return Markdown.of({ render, tokens });
    }),
  );
}
