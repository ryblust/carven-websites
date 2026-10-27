import type { ExecutionResult } from './protocol';

export interface SceneBar {
  label: string;
  value: number;
}

export interface SceneNode {
  id: number;
  kind: 'metric' | 'bars' | 'note';
  title: string;
  text: string;
  value: number;
  bars: SceneBar[];
}

export interface Scene {
  title: string;
  subtitle: string;
  columns: number;
  nodes: SceneNode[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= -2147483648 && (value as number) <= 2147483647;

function bar(value: unknown): value is SceneBar {
  return (
    record(value) &&
    typeof value.label === 'string' &&
    integer(value.value) &&
    value.value >= 0 &&
    value.value <= 100
  );
}

function node(value: unknown): value is SceneNode {
  return (
    record(value) &&
    integer(value.id) &&
    ['metric', 'bars', 'note'].includes(value.kind as string) &&
    typeof value.title === 'string' &&
    typeof value.text === 'string' &&
    integer(value.value) &&
    Array.isArray(value.bars) &&
    value.bars.every(bar)
  );
}

export function readScene(result: ExecutionResult): Scene | undefined {
  const file = result.artifacts.find((item) => item.path === 'host-result.json');
  if (!file) return;
  try {
    const value: unknown = JSON.parse(file.content);
    if (
      record(value) &&
      typeof value.title === 'string' &&
      typeof value.subtitle === 'string' &&
      integer(value.columns) &&
      value.columns >= 1 &&
      value.columns <= 3 &&
      Array.isArray(value.nodes) &&
      value.nodes.every(node) &&
      new Set(value.nodes.map((item) => item.id)).size === value.nodes.length
    )
      return value as unknown as Scene;
  } catch {
    // A hosted function can return data that is not a view description.
  }
}
