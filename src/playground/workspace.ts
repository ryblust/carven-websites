import type { ExecutionInput } from './protocol';
const maxSourceBytes = 64 * 1024;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const maxWorkspaceBytes = 256 * 1024;

export function nextFileName(files: Record<string, string>): string {
  let number = 1;
  let path = 'helper.cv';
  while (Object.keys(files).some((file) => file === path || file.startsWith(path + '/'))) {
    path = `helper${++number}.cv`;
  }
  return path;
}

export function validFilePath(path: string): boolean {
  return (
    path.length <= 160 &&
    /^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(path) &&
    !/^(?:crafts|bin|generated)(?:\/|$)/.test(path)
  );
}

export function validateExecutionInput(value: unknown = {}): ExecutionInput {
  if (!record(value)) throw new Error('Invalid workspace.');
  const entry = value.entry ?? 'main.cv';
  const files = value.files ?? {};
  const stdin = value.stdin ?? '';
  if (
    typeof entry !== 'string' ||
    !validFilePath(entry) ||
    !entry.endsWith('.cv') ||
    !record(files) ||
    Object.keys(files).length > 16 ||
    typeof stdin !== 'string' ||
    stdin.includes('\0')
  ) {
    throw new Error('Invalid workspace.');
  }
  let bytes = new TextEncoder().encode(stdin).byteLength;
  const paths = [...new Set([entry, ...Object.keys(files)])];
  if (
    paths.length > 16 ||
    paths.some((path) => paths.some((other) => other.startsWith(path + '/')))
  )
    throw new Error('Conflicting workspace files.');
  if (bytes > maxSourceBytes) throw new Error('Input exceeds 64 KiB.');
  for (const [path, content] of Object.entries(files)) {
    if (!validFilePath(path) || typeof content !== 'string' || content.includes('\0'))
      throw new Error('Invalid workspace file.');
    bytes += new TextEncoder().encode(content).byteLength;
  }
  if (bytes > maxWorkspaceBytes) throw new Error('Workspace exceeds 256 KiB.');
  const call = value.call;
  if (
    call !== undefined &&
    (!record(call) ||
      typeof call.name !== 'string' ||
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(call.name) ||
      !Array.isArray(call.arguments) ||
      call.arguments.length > 8 ||
      !call.arguments.every(
        (arg) => Number.isInteger(arg) && arg >= -2147483648 && arg <= 2147483647,
      ))
  ) {
    throw new Error('Invalid function arguments.');
  }
  return {
    entry,
    files: files as Record<string, string>,
    stdin,
    ...(call ? { call: call as NonNullable<ExecutionInput['call']> } : {}),
  };
}
