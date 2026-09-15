import { assert, describe, it } from '@effect/vitest';
import { Cause, Effect, Fiber } from 'effect';
import { TestClock } from 'effect/testing';
import { copyFeedback, copyText, copyWithFallback } from '../src/effects/clipboard';

describe('copy interaction', () => {
  it.effect('preserves exact source code', () =>
    Effect.gen(function* () {
      const text = 'fn main() {\n    let answer = 42;\n}\n';
      let written = '';
      const result = yield* copyWithFallback(
        {
          writeText: async (value) => {
            written = value;
          },
        },
        text,
        () => {
          throw new Error('Unexpected fallback');
        },
      );
      assert.strictEqual(written, text);
      assert.strictEqual(result, 'copied');
    }),
  );

  it.effect('recovers permission denial by selecting the code', () =>
    Effect.gen(function* () {
      let selected = false;
      const result = yield* copyWithFallback(
        {
          writeText: async () => {
            throw new Error('Permission denied');
          },
        },
        'code',
        () => {
          selected = true;
        },
      );
      assert.strictEqual(result, 'selected');
      assert.isTrue(selected);
      const error = yield* copyText(undefined, 'code').pipe(Effect.flip);
      assert.strictEqual(error._tag, 'ClipboardUnavailable');
    }),
  );

  it.effect('clears feedback after the display interval', () =>
    Effect.gen(function* () {
      const events: string[] = [];
      const fiber = yield* Effect.forkChild(
        copyFeedback(undefined, 'code', {
          select: () => events.push('selected'),
          feedback: (result) => events.push(result),
          reset: () => events.push('reset'),
        }),
      );
      yield* TestClock.adjust('2399 millis');
      assert.deepStrictEqual(events, ['selected', 'selected']);
      yield* TestClock.adjust('1 millis');
      yield* Fiber.join(fiber);
      assert.deepStrictEqual(events, ['selected', 'selected', 'reset']);
    }),
  );

  it.effect('navigation or a new copy cancels stale delayed feedback', () =>
    Effect.gen(function* () {
      const events: string[] = [];
      const fiber = yield* Effect.forkChild(
        copyFeedback(undefined, 'code', {
          select: () => {},
          feedback: (result) => events.push(result),
          reset: () => events.push('reset'),
        }),
      );
      yield* TestClock.adjust('1 millis');
      yield* Fiber.interrupt(fiber);
      yield* TestClock.adjust('3 seconds');
      assert.deepStrictEqual(events, ['selected']);
    }),
  );

  it.effect('a failed selection remains an observable defect', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        copyWithFallback(undefined, 'code', () => {
          throw new Error('Selection failed');
        }),
      );
      assert.strictEqual(exit._tag, 'Failure');
      if (exit._tag === 'Failure') {
        assert.isTrue(Cause.hasDies(exit.cause));
        assert.isFalse(Cause.hasInterruptsOnly(exit.cause));
      }
    }),
  );
});
