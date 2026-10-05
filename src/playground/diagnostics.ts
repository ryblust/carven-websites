export interface DiagnosticLocation {
  line: number;
  /** One-based UTF-8 byte column, as reported by the packaged compiler. */
  column: number;
}

export interface DiagnosticPart {
  text: string;
  location?: DiagnosticLocation;
}

/** Recognize source-frame anchors, never location-like text inside a message. */
export function diagnosticParts(text: string): DiagnosticPart[] {
  const parts: DiagnosticPart[] = [];
  const anchors = /^[ \t]*(?:-->|:::)[ \t]+(\/?main\.cv:([1-9][0-9]*):([1-9][0-9]*))[ \t]*\r?$/gm;
  let previous = 0;
  for (const match of text.matchAll(anchors)) {
    const line = Number(match[2]);
    const column = Number(match[3]);
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column)) continue;
    const start = match.index + match[0].indexOf(match[1]!);
    if (start > previous) parts.push({ text: text.slice(previous, start) });
    parts.push({ text: match[1]!, location: { line, column } });
    previous = start + match[1]!.length;
  }
  if (previous < text.length) parts.push({ text: text.slice(previous) });
  return parts;
}

/** Map compiler byte coordinates to CodeMirror's normalized UTF-16 document. */
export function diagnosticSelection(source: string, location: DiagnosticLocation) {
  const { line, column } = location;
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line < 1 || column < 1) {
    return null;
  }
  let start = 0;
  for (let number = 1; number < line; number++) {
    const newline = source.indexOf('\n', start);
    if (newline === -1) return null;
    start = newline + 1;
  }
  const newline = source.indexOf('\n', start);
  const end = newline === -1 ? source.length : newline;
  const target = column - 1;
  let bytes = 0;
  let offset = start;
  while (offset < end && bytes < target) {
    const scalar = source.codePointAt(offset)!;
    bytes += scalar <= 0x7f ? 1 : scalar <= 0x7ff ? 2 : scalar <= 0xffff ? 3 : 4;
    offset += scalar > 0xffff ? 2 : 1;
  }
  // Do not invent a nearby location for an out-of-range or mid-scalar column.
  if (bytes !== target) return null;
  // Both bytes of a CRLF terminator map to the editor's single line break.
  if (offset === end && source[offset - 1] === '\r' && source[offset] === '\n') offset -= 1;
  const scalar = source.codePointAt(offset);
  const width = offset === end || scalar === 13 ? 0 : scalar! > 0xffff ? 2 : 1;
  const normalizedLength = (position: number) =>
    source.slice(0, position).replace(/\r\n?/g, '\n').length;
  return { anchor: normalizedLength(offset), head: normalizedLength(offset + width) };
}
