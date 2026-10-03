import { describe, expect, it } from 'vitest';
import { type Transaction } from '@codemirror/state';
import { indentMore, redo, undo } from '@codemirror/commands';
import { sourceEditorState } from '../src/playground/editor';

describe('source editor transactions', () => {
  it('undoes and redoes multiline indentation without changing the source or selection', () => {
    const source = 'let value = 1;\nprintln(value);';
    let state = sourceEditorState(source);
    state = state.update({ selection: { anchor: 0, head: source.length } }).state;
    const before = state.selection.toJSON();
    const target = {
      get state() {
        return state;
      },
      dispatch(transaction: Transaction) {
        state = transaction.state;
      },
    };
    expect(indentMore(target)).toBe(true);
    const indented = state.doc.toString();
    expect(indented).toBe('    let value = 1;\n    println(value);');
    expect(undo(target)).toBe(true);
    expect(state.doc.toString()).toBe(source);
    expect(state.selection.toJSON()).toEqual(before);
    expect(redo(target)).toBe(true);
    expect(state.doc.toString()).toBe(indented);
  });

  it('does not carry undo history into a different example', () => {
    let state = sourceEditorState('println("first");');
    const target = {
      get state() {
        return state;
      },
      dispatch(transaction: Transaction) {
        state = transaction.state;
      },
    };
    indentMore(target);
    state = sourceEditorState('println("second");');
    expect(undo(target)).toBe(false);
    expect(state.doc.toString()).toBe('println("second");');
  });
});
