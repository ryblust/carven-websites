import { Effect, Schema } from 'effect';

export class ClipboardUnavailable extends Schema.TaggedError<ClipboardUnavailable>()(
  'ClipboardUnavailable',
  {
    cause: Schema.Defect(),
  },
) {}

export interface ClipboardPort {
  readonly writeText: (text: string) => Promise<void>;
}

// Keep the browser boundary explicit; tests can supply a different clipboard.
export const copyText = Effect.fn('copyText')(
  (clipboard: ClipboardPort | undefined, text: string) =>
    clipboard
      ? Effect.tryPromise({
          try: () => clipboard.writeText(text),
          catch: (cause) => new ClipboardUnavailable({ cause }),
        })
      : Effect.fail(new ClipboardUnavailable({ cause: 'Clipboard API unavailable' })),
);

export const copyWithFallback = Effect.fn('copyWithFallback')(
  (clipboard: ClipboardPort | undefined, text: string, selectText: () => void) =>
    copyText(clipboard, text).pipe(
      Effect.as('copied' as const),
      Effect.catchTag('ClipboardUnavailable', () =>
        Effect.sync(() => {
          selectText();
          return 'selected' as const;
        }),
      ),
    ),
);

export interface CopyView {
  readonly select: () => void;
  readonly feedback: (result: 'copied' | 'selected') => void;
  readonly reset: () => void;
}

export const copyFeedback = Effect.fn('copyFeedback')(function* (
  clipboard: ClipboardPort | undefined,
  text: string,
  view: CopyView,
) {
  const result = yield* copyWithFallback(clipboard, text, view.select);
  yield* Effect.sync(() => view.feedback(result));
  yield* Effect.sleep('2400 millis');
  yield* Effect.sync(view.reset);
});
