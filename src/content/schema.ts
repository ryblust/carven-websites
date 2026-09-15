import { Schema } from 'effect';

const Text = Schema.NonEmptyString.check(Schema.isTrimmed());
const fields = {
  title: Text,
  description: Text,
  source: Text,
};

export const ArticleMetadata = Schema.Union([
  Schema.Struct({
    ...fields,
    section: Schema.Literals(['learn', 'reference']),
    lesson: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }),
  Schema.Struct({
    ...fields,
    section: Schema.Literals([
      'philosophy',
      'use-cases',
      'failure-contracts',
      'cpp-generation',
      'compile-time',
    ]),
  }),
]);

export type ArticleMetadata = typeof ArticleMetadata.Type;

export type ArticleDocument = ArticleMetadata & {
  readonly path: string;
  readonly file: string;
  readonly html: string;
};
