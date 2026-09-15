import { describe, expect, it } from 'vitest';
import { matchCodeTokens } from '../src/lib/code-motion';

describe('code token correspondence', () => {
  it('matches moved identifiers and repeated punctuation only once', () => {
    expect(
      matchCodeTokens(
        ['fn', 'quote', '(', 'x', ')', 'x'],
        ['int', 'x', 'quote', '(', 'x', ')', 'x'],
      ),
    ).toEqual([undefined, 3, 1, 2, 5, 4, undefined]);
  });
  it('handles entirely inserted or removed code', () => {
    expect(matchCodeTokens([], ['return'])).toEqual([undefined]);
    expect(matchCodeTokens(['return'], [])).toEqual([]);
  });
});
