import { inlineCodeParts } from '../lib/inline-code';

export function InlineCode({ text }: { text: string }) {
  return inlineCodeParts(text).map((part, index) =>
    part.code ? <code key={index}>{part.text}</code> : part.text,
  );
}
