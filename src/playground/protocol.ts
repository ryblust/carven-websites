export type Action = 'run' | 'check' | 'compile' | 'format' | 'ast' | 'tokens';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  artifacts: { path: string; content: string }[];
  durationMs: number;
  truncated: boolean;
  formattedSource?: string;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isExecutionResult(value: unknown): value is ExecutionResult {
  return (
    record(value) &&
    typeof value.stdout === 'string' &&
    typeof value.stderr === 'string' &&
    Number.isInteger(value.exitCode) &&
    typeof value.durationMs === 'number' &&
    Number.isFinite(value.durationMs) &&
    value.durationMs >= 0 &&
    typeof value.truncated === 'boolean' &&
    (value.formattedSource === undefined ||
      (typeof value.formattedSource === 'string' &&
        !value.formattedSource.includes('\0') &&
        new TextEncoder().encode(value.formattedSource).byteLength <= 64 * 1024 &&
        value.exitCode === 0 &&
        value.truncated === false)) &&
    Array.isArray(value.artifacts) &&
    value.artifacts.every(
      (file) => record(file) && typeof file.path === 'string' && typeof file.content === 'string',
    )
  );
}
