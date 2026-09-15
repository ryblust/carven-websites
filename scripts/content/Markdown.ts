import { Context, Effect, Layer } from 'effect';
import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';
import { createHighlighter } from 'shiki';
import carven from '../../src/lib/carven-grammar.ts';
import vesperBlack from './vesper-black.ts';
import { ContentError } from './model.ts';

export class Markdown extends Context.Service<
  Markdown,
  {
    render(file: string, markdown: string): Effect.Effect<string, ContentError>;
  }
>()('carven-website/content/Markdown') {
  static readonly layer = Layer.effect(
    Markdown,
    Effect.gen(function* () {
      const highlighter = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () =>
            createHighlighter({ themes: [vesperBlack], langs: [carven, 'shellscript', 'cpp'] }),
          catch: (cause) => new ContentError({ file: 'syntax', operation: 'render', cause }),
        }),
        (highlighter) => Effect.sync(() => highlighter.dispose()),
      );
      const render = Effect.fn('Markdown.render')(function* (file: string, markdown: string) {
        const slugger = new GithubSlugger();
        const marked = new Marked({ gfm: true });
        marked.use({
          renderer: {
            code({ text, lang }) {
              return highlighter.codeToHtml(text, {
                lang: lang || 'text',
                theme: vesperBlack.name,
              });
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
