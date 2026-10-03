import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import {
  bracketMatching,
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';
import { carvenLanguage } from './language';

const highlighting = HighlightStyle.define([
  { tag: tags.keyword, class: 'cv-keyword' },
  { tag: [tags.string, tags.character], class: 'cv-string' },
  { tag: tags.comment, class: 'cv-comment' },
  { tag: [tags.number, tags.bool], class: 'cv-literal' },
  { tag: tags.typeName, class: 'cv-type' },
]);

export function sourceEditorState(source: string, extensions: Extension = []) {
  return EditorState.create({
    doc: source,
    extensions: [
      history(),
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      bracketMatching(),
      closeBrackets(),
      carvenLanguage,
      syntaxHighlighting(highlighting),
      indentUnit.of('    '),
      EditorState.tabSize.of(4),
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      extensions,
    ],
  });
}
