import { Context, Effect, Layer } from 'effect';
import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';
import { createHighlighter } from 'shiki';
import carven from '../../src/lib/carven-grammar.ts';
import paper from './paper.ts';
import vesperBlack from './vesper-black.ts';
import { ContentError } from './model.ts';

const languageLabels: Record<string, string> = {
  carven: 'Carven',
  cv: 'Carven',
  cpp: 'C++',
  sh: 'Shell',
  shellscript: 'Shell',
};

export class Markdown extends Context.Service<
  Markdown,
  {
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
            createHighlighter({
              themes: [paper, vesperBlack],
              langs: [carven, 'shellscript', 'cpp'],
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
        const slugger = new GithubSlugger();
        const marked = new Marked({ gfm: true });
        marked.use({
          renderer: {
            code({ text, lang }) {
              const language = lang || 'text';
              const highlighted = highlighter.codeToHtml(text, {
                lang: language,
                themes: { light: paper.name, dark: vesperBlack.name },
                defaultColor: false,
                transformers: [
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
            heading({ tokens, depth }) {
              const inner = this.parser.parseInline(tokens);
              const slug = slugger.slug(inner.replace(/<[^>]*>/g, ''));
              return `<h${depth} id="${slug}">${inner}</h${depth}>\n`;
            },
          },
        });
        return yield* Effect.tryPromise({
          try: async () => marked.parse(markdown),
          catch: (cause) => new ContentError({ file, operation: 'render', cause }),
        });
      });
      return Markdown.of({ render });
    }),
  );
}
