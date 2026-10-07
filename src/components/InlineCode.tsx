import { inlineCodeParts } from '../lib/inline-code';
import { HighlightedText } from './HighlightedText';
import { Fragment } from 'react';

export function InlineCode({ text, highlight = '' }: { text: string; highlight?: string }) {
  return inlineCodeParts(text).map((part, index) => {
    const content = <HighlightedText text={part.text} query={highlight} />;
    return part.code ? (
      <code key={index}>{content}</code>
    ) : (
      <Fragment key={index}>{content}</Fragment>
    );
  });
}
