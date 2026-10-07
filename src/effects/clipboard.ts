export class ClipboardUnavailable extends Error {
  constructor(cause: unknown) {
    super('Clipboard API unavailable', { cause });
  }
}

export interface ClipboardPort {
  readonly writeText: (text: string) => Promise<void>;
}

// Keep the browser boundary explicit; tests can supply a different clipboard.
export async function copyText(clipboard: ClipboardPort | undefined, text: string) {
  if (!clipboard) throw new ClipboardUnavailable('Clipboard API unavailable');
  try {
    // Start the write in the click handler's user activation, before any await.
    await clipboard.writeText(text);
  } catch (cause) {
    throw new ClipboardUnavailable(cause);
  }
}

export async function copyWithFallback(
  clipboard: ClipboardPort | undefined,
  text: string,
  selectText: () => void,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  try {
    await copyText(clipboard, text);
  } catch (error) {
    signal?.throwIfAborted();
    if (!(error instanceof ClipboardUnavailable)) throw error;
    selectText();
    return 'selected' as const;
  }
  signal?.throwIfAborted();
  return 'copied' as const;
}

export interface CopyView {
  readonly select: () => void;
  readonly feedback: (result: 'copied' | 'selected') => void;
  readonly reset: () => void;
}

export async function copyFeedback(
  clipboard: ClipboardPort | undefined,
  text: string,
  view: CopyView,
  signal: AbortSignal,
) {
  const result = await copyWithFallback(clipboard, text, view.select, signal);
  signal.throwIfAborted();
  view.feedback(result);
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 2400);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
  });
  signal.throwIfAborted();
  view.reset();
}
