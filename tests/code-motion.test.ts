import { describe, expect, it } from 'vitest';
import { matchCodeTokens } from '../src/lib/code-motion';

describe('code token correspondence', () => {
  it.each([
    {
      name: 'moved identifiers and repeated punctuation',
      before: ['fn', 'quote', '(', 'x', ',', 'x', ')', ';', ';'],
      after: ['int', 'x', 'quote', '(', 'x', ',', 'x', ')', ';'],
    },
    { name: 'inserted code', before: [], after: ['return'] },
    { name: 'removed code', before: ['return'], after: [] },
    { name: 'unrelated code', before: ['return', '42'], after: ['break', ';'] },
  ])('provides one-to-one, same-token correspondence for $name', ({ before, after }) => {
    const matches = matchCodeTokens(Object.freeze(before), Object.freeze(after));
    expect(matches).toHaveLength(after.length);
    const used = matches.filter((index): index is number => index !== undefined);
    expect(new Set(used).size).toBe(used.length);
    matches.forEach((source, target) => {
      if (source === undefined) return;
      expect(Number.isInteger(source)).toBe(true);
      expect(source).toBeGreaterThanOrEqual(0);
      expect(source).toBeLessThan(before.length);
      expect(before[source]).toBe(after[target]);
    });
    for (const token of new Set(after)) {
      const sources = used.filter((index) => before[index] === token);
      expect(sources).toHaveLength(
        Math.min(
          before.filter((value) => value === token).length,
          after.filter((value) => value === token).length,
        ),
      );
      expect(sources.every((source, index) => index === 0 || source > sources[index - 1]!)).toBe(
        true,
      );
    }
  });
});
