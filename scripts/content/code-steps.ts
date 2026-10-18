import { syncTokenKeys, type KeyedTokensInfo } from '@shikijs/magic-move/core';
import type { CodeStep } from '../../src/lib/code-tokens.ts';

let cached: { signature: string; steps: [string, CodeStep][] } | undefined;

export function precompileCodeSteps(tokens: Readonly<Record<string, KeyedTokensInfo>>) {
  const signature = JSON.stringify(tokens);
  if (cached?.signature === signature) return cached.steps;

  const entries = Object.entries(tokens);
  const steps: [string, CodeStep][] = entries.map(([name, step]) => [
    name,
    {
      tokens: step.tokens.map(({ content, htmlStyle, color }) => ({
        content,
        ...(htmlStyle ? { htmlStyle } : {}),
        ...(color ? { color } : {}),
      })),
      matches: {},
    },
  ]);

  for (const [sourcePosition, [sourceName, source]] of entries.entries()) {
    const indices = new Map(source.tokens.map((token, index) => [token.key, index]));
    for (
      let targetPosition = sourcePosition + 1;
      targetPosition < entries.length;
      targetPosition++
    ) {
      const [targetName, target] = entries[targetPosition]!;
      const matched = syncTokenKeys(source, {
        ...target,
        tokens: target.tokens.map((token) => ({ ...token })),
      }).to;
      const matches = matched.tokens.flatMap((token, targetIndex) => {
        const sourceIndex = indices.get(token.key);
        return sourceIndex !== undefined && token.content.trim()
          ? [[sourceIndex, targetIndex] as [number, number]]
          : [];
      });
      // A token pair is also valid in reverse. Sharing it keeps both directions
      // consistent and avoids repeating the expensive text diff.
      steps[targetPosition]![1].matches[sourceName] = matches;
      steps[sourcePosition]![1].matches[targetName] = matches.map(([from, to]) => [to, from]);
    }
  }

  cached = { signature, steps };

  return steps;
}
