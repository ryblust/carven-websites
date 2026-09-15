// Repeated tokens match in source order; no source token is used twice.
export function matchCodeTokens(before: readonly string[], after: readonly string[]) {
  const available = new Map<string, number[]>();
  before.forEach((text, index) => {
    const indices = available.get(text) ?? [];
    indices.push(index);
    available.set(text, indices);
  });
  return after.map((text) => available.get(text)?.shift());
}
