import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { highlightTree, tagHighlighter, tags } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';
import { carvenLanguage } from '../src/playground/language';

function highlighting(source: string) {
  const state = EditorState.create({ doc: source, extensions: [carvenLanguage] });
  const tree = ensureSyntaxTree(state, source.length, 1000)!;
  const spans: { from: number; to: number; style: string }[] = [];
  highlightTree(
    tree,
    tagHighlighter([
      { tag: tags.keyword, class: 'keyword' },
      { tag: tags.string, class: 'string' },
      { tag: tags.character, class: 'character' },
      { tag: tags.comment, class: 'comment' },
      { tag: tags.bracket, class: 'bracket' },
      { tag: tags.typeName, class: 'type' },
      { tag: tags.number, class: 'number' },
    ]),
    (from, to, style) => spans.push({ from, to, style }),
  );
  return {
    styleAt: (position: number) =>
      spans.find(({ from, to }) => from <= position && position < to)?.style,
    text: (style: string) =>
      spans.filter((span) => span.style === style).map(({ from, to }) => source.slice(from, to)),
  };
}

describe('Carven editor presentation language', () => {
  it('highlights reserved words and numbers without reserving ordinary identifiers', () => {
    const source = 'let letter: i32 = 0xffu32; if true { new(self); }';
    const result = highlighting(source);
    expect(result.text('keyword')).toEqual(['let', 'if']);
    expect(result.text('type')).toEqual(['i32']);
    expect(result.text('number')).toEqual(['0xffu32']);
    expect(result.styleAt(source.indexOf('letter'))).toBeUndefined();
    expect(result.styleAt(source.indexOf('new'))).toBeUndefined();
    expect(result.styleAt(source.indexOf('self'))).toBeUndefined();
  });

  it('keeps escaped ordinary strings and character literals separate from surrounding code', () => {
    const source = String.raw`let text = "if \"{ // return"; let scalar = '\''; return text;`;
    const result = highlighting(source);
    expect(result.text('keyword')).toEqual(['let', 'let', 'return']);
    expect(result.text('string')).toEqual([String.raw`"if \"{ // return"`]);
    expect(result.text('character')).toEqual([String.raw`'\''`]);
  });

  it('ends single-line literals at a newline and resumes code highlighting', () => {
    const source =
      '"unfinished\nlet first = 1;\n\'unfinished\nreturn first;\nr#"unfinished\nconst last = 2;';
    expect(highlighting(source).text('keyword')).toEqual(['let', 'return', 'const']);
  });

  it('requires raw delimiter hashes and treats backslashes as ordinary body text', () => {
    const literal = String.raw`r##"if "# { // \\"##`;
    const source = `let text = ${literal}; return text;`;
    const result = highlighting(source);
    expect(result.text('string')).toEqual([literal]);
    expect(result.text('keyword')).toEqual(['let', 'return']);
  });

  it('keeps triple strings across blank lines and closes only the matching delimiter', () => {
    const source =
      'r#"""\nif """ { // body\n\n"""#; let first = """\nreturn {\n"""; const done = true;';
    const result = highlighting(source);
    expect(result.styleAt(source.indexOf('if'))).toBe('string');
    expect(result.styleAt(source.indexOf('return'))).toBe('string');
    expect(result.text('keyword')).toEqual(['let', 'const']);
  });

  it('protects interpolation boundaries without highlighting its contents as code', () => {
    const source = 'f"value {format("if {", r#"}"#)} {{return}}"; let done = true;';
    const result = highlighting(source);
    expect(result.text('string')).toEqual([source.slice(0, source.indexOf(';'))]);
    expect(result.text('keyword')).toEqual(['let']);
    expect(result.text('bracket')).toEqual([]);
  });

  it('keeps line comments opaque and does not invent block comments', () => {
    const source = '// if " {\nlet value = 1; /* return */';
    const result = highlighting(source);
    expect(result.text('comment')).toEqual(['// if " {']);
    expect(result.text('keyword')).toEqual(['let', 'return']);
  });
});
