import { Context, Effect, Layer } from 'effect';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import cpp from '@shikijs/langs/cpp';
import shellscript from '@shikijs/langs/shellscript';
import powershell from '@shikijs/langs/powershell';
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
  shell: 'Shell',
  shellscript: 'Shell',
  powershell: 'PowerShell',
  json: 'JSON',
  lua: 'Lua',
  text: 'Text',
  txt: 'Text',
  plaintext: 'Text',
};

export class Markdown extends Context.Service<
  Markdown,
  {
    render(file: string, markdown: string): Effect.Effect<string, ContentError>;
    highlight(file: string, source: string): Effect.Effect<string, ContentError>;
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
              langs: [carven, shellscript, powershell, cpp, json, lua],
            }),
          catch: (cause) => new ContentError({ file: 'syntax', operation: 'render', cause }),
        }),
        (highlighter) => Effect.sync(() => highlighter.dispose()),
      );
      const colors = {
        themes: { light: paper.name, dark: vesperBlack.name },
        defaultColor: false,
      } as const;
      const highlight = (file: string, source: string) =>
        Effect.try({
          try: () => highlighter.codeToHtml(source, { lang: 'carven', ...colors }),
          catch: (cause) => new ContentError({ file, operation: 'render', cause }),
        });
      const render = Effect.fn('Markdown.render')(function* (file: string, markdown: string) {
        const marked = new Marked({ gfm: true });
        marked.use(gfmHeadingId());
        marked.use({
          renderer: {
            code({ text, lang }) {
              // Execution and highlighted lines are explicit fence metadata.
              const [language = 'text', ...meta] = (lang || 'text').split(/\s+/);
              const runnable = (language === 'carven' || language === 'cv') && meta.includes('run');
              const highlighted = highlighter.codeToHtml(text, {
                lang: language,
                ...colors,
                meta: { __raw: meta.filter((value) => value !== 'run').join(' ') },
                transformers: [
                  transformerMetaHighlight(),
                  {
                    pre(node) {
                      node.properties['data-language'] = language;
                      if (runnable) node.properties['data-runnable'] = 'true';
                    },
                  },
                ],
              });
              // Labels are fixed display strings, never interpolated from authored HTML.
              const label = languageLabels[language] ?? 'Text';

              return `<div class="code-wrap"><div class="code-head"><span>${label}</span></div>${highlighted}</div>`;
            },
          },
        });

        return yield* Effect.tryPromise({
          try: async () => marked.parse(markdown),
          catch: (cause) => new ContentError({ file, operation: 'render', cause }),
        });
      });
      return Markdown.of({ render, highlight });
    }),
  );
}
