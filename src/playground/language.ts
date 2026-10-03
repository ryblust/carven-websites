import { StreamLanguage, type StringStream } from '@codemirror/language';

const keywords = new Set(
  'as break catch class const continue else enum export fn for if import in is let match private rethrow return struct test throw try using var while'.split(
    ' ',
  ),
);
const types = new Set(
  'i8 i16 i32 i64 u8 u16 u32 u64 isize usize f32 f64 u8x16 u8x32 f32x4 f32x8 mask4 mask8 mask16 mask32 bool char str void'.split(
    ' ',
  ),
);

interface Quoted {
  kind: 'quoted';
  closing: string;
  raw: boolean;
  multiline: boolean;
  interpolated: boolean;
}
interface Hole {
  kind: 'hole';
  depth: number;
}
interface State {
  contexts: (Quoted | Hole)[];
}

function opening(stream: StringStream): Quoted | undefined {
  const raw = stream.match(/^r(#+)?("""|")/);
  if (raw && typeof raw !== 'boolean') {
    return {
      kind: 'quoted',
      closing: raw[2]! + (raw[1] ?? ''),
      raw: true,
      multiline: raw[2] === '"""',
      interpolated: false,
    };
  }
  const quoted = stream.match(/^(f?"""|[fc]?"|')/);
  if (!quoted || typeof quoted === 'boolean') return;
  const delimiter = quoted[0].replace(/^[fc]/, '');
  return {
    kind: 'quoted',
    closing: delimiter,
    raw: false,
    multiline: delimiter === '"""',
    interpolated: quoted[0].startsWith('f'),
  };
}

// Interpolation remains string-colored. The hole stack only protects its nested
// quotes/comments from accidentally terminating the surrounding literal.
function quotedToken(stream: StringStream, state: State): string {
  const character = state.contexts[0]?.kind === 'quoted' && state.contexts[0].closing === "'";
  while (!stream.eol() && state.contexts.length) {
    const current = state.contexts.at(-1)!;
    if (current.kind === 'hole') {
      if (stream.match('//')) {
        stream.skipToEnd();
        break;
      }
      const nested = opening(stream);
      if (nested) {
        state.contexts.push(nested);
        continue;
      }
      // Consume identifiers together so a suffix r/f/c cannot become a prefix.
      if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) continue;
      const next = stream.next();
      if (next === '{') current.depth += 1;
      else if (next === '}' && --current.depth === 0) state.contexts.pop();
      continue;
    }
    if (stream.match(current.closing)) {
      state.contexts.pop();
    } else if (!current.raw && stream.eat('\\')) {
      stream.next();
    } else if (current.interpolated && stream.match('{{')) {
      continue;
    } else if (current.interpolated && stream.eat('{')) {
      state.contexts.push({ kind: 'hole', depth: 1 });
    } else {
      stream.next();
    }
  }
  // Single-line literals recover at the line boundary. Newlines inside an
  // interpolation hole are permitted; a nested single-line literal still ends.
  const current = state.contexts.at(-1);
  if (stream.eol() && current?.kind === 'quoted' && !current.multiline) {
    state.contexts.pop();
  }
  return character ? 'character' : 'string';
}

/** Presentation highlighting only; compiler diagnostics remain authoritative. */
export const carvenLanguage = StreamLanguage.define<State>({
  name: 'carven',
  startState: () => ({ contexts: [] }),
  copyState: (state) => ({ contexts: state.contexts.map((context) => ({ ...context })) }),
  token(stream, state) {
    if (state.contexts.length) return quotedToken(stream, state);
    if (stream.eatSpace()) return null;
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'lineComment';
    }
    const quoted = opening(stream);
    if (quoted) {
      state.contexts.push(quoted);
      return quotedToken(stream, state);
    }
    if (
      stream.match(
        /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:[iu](?:8|16|32|64|size)|f(?:32|64))?\b/,
      )
    ) {
      return 'number';
    }
    const identifier = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier && typeof identifier !== 'boolean') {
      const name = identifier[0];
      if (name === 'true' || name === 'false') return 'bool';
      if (name === 'nullptr') return 'null';
      if (keywords.has(name)) return 'keyword';
      if (types.has(name) || (name === 'range' && stream.match(/^\s*</, false))) {
        return 'typeName';
      }
      if (stream.match(/^\s*\(/, false)) return 'variableName.function';
      return /^[A-Z]/.test(name) ? 'typeName' : 'variableName';
    }
    if (stream.match(/^[()[\]{}]/)) return 'bracket';
    if (stream.match(/^(?:\.\.=|\.\.|[+\-*/%=!<>~&|^?:]+)/)) return 'operator';
    if (stream.match(/^[,;.]/)) return 'punctuation';
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: '//' },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'"] },
  },
});
