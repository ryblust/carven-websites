export type Action = 'run' | 'check' | 'compile' | 'format';

export interface Version {
  compilerRevision: string;
  backend: 'browser-wasi';
  revisionVerified: boolean;
  supportedLibraries: string[];
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  artifacts: { path: string; content: string }[];
  version: Version;
  durationMs: number;
  truncated: boolean;
  timedOut: boolean;
  formattedSource?: string;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isVersion(value: unknown): value is Version {
  return (
    record(value) &&
    typeof value.compilerRevision === 'string' &&
    /^[a-f0-9]{40}$/.test(value.compilerRevision) &&
    value.backend === 'browser-wasi' &&
    typeof value.revisionVerified === 'boolean' &&
    Array.isArray(value.supportedLibraries) &&
    value.supportedLibraries.every((library) => typeof library === 'string')
  );
}

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
    typeof value.timedOut === 'boolean' &&
    (value.formattedSource === undefined ||
      (typeof value.formattedSource === 'string' &&
        !value.formattedSource.includes('\0') &&
        new TextEncoder().encode(value.formattedSource).byteLength <= 64 * 1024 &&
        value.exitCode === 0 &&
        value.truncated === false &&
        value.timedOut === false)) &&
    isVersion(value.version) &&
    Array.isArray(value.artifacts) &&
    value.artifacts.every(
      (file) => record(file) && typeof file.path === 'string' && typeof file.content === 'string',
    )
  );
}
