import { Effect, Schema } from 'effect';
import { parse } from 'yaml';
import { ArticleMetadata } from '../../src/content/schema.ts';

export class ContentError extends Schema.TaggedError<ContentError>()('ContentError', {
  file: Schema.String,
  operation: Schema.Literals(['read', 'metadata', 'render', 'publish']),
  cause: Schema.Defect(),
}) {}

const decodeMetadata = Schema.decodeUnknownEffect(ArticleMetadata, { onExcessProperty: 'error' });

export const parseArticle = Effect.fn('parseArticle')(function* (file: string, text: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match)
    return yield* new ContentError({ file, operation: 'metadata', cause: 'Missing frontmatter' });
  const raw = yield* Effect.try({
    try: () => parse(match[1]!) as unknown,
    catch: (cause) => new ContentError({ file, operation: 'metadata', cause }),
  });
  const metadata = yield* decodeMetadata(raw).pipe(
    Effect.mapError((cause) => new ContentError({ file, operation: 'metadata', cause })),
  );
  return { metadata, markdown: match[2]! };
});
