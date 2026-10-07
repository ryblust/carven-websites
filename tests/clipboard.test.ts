import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyFeedback, copyText, copyWithFallback } from '../src/effects/clipboard';

afterEach(() => vi.useRealTimers());

describe('copy interaction', () => {
  it('preserves exact source and starts writing within the user activation', async () => {
    const text = 'fn main() {\n    let answer = 42;\n}\n';
    const writeText = vi.fn(async () => {});
    const select = vi.fn();
    const result = copyWithFallback({ writeText }, text, select);
    expect(writeText).toHaveBeenCalledWith(text);
    await expect(result).resolves.toBe('copied');
    expect(select).not.toHaveBeenCalled();
  });

  it('recovers permission denial by selecting the code', async () => {
    const select = vi.fn();
    await expect(
      copyWithFallback(
        {
          writeText: async () => {
            throw new Error('Permission denied');
          },
        },
        'code',
        select,
      ),
    ).resolves.toBe('selected');
    expect(select).toHaveBeenCalledOnce();
    await expect(copyText(undefined, 'code')).rejects.toThrow();
  });

  it('shows feedback before clearing it after a delay', async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const result = copyFeedback(
      undefined,
      'code',
      {
        select: () => events.push('select'),
        feedback: (value) => events.push(`feedback:${value}`),
        reset: () => events.push('reset'),
      },
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['select', 'feedback:selected']);
    await vi.advanceTimersByTimeAsync(2400);
    await result;
    expect(events).toEqual(['select', 'feedback:selected', 'reset']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancellation clears the timer and prevents stale feedback', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const events: string[] = [];
    const result = copyFeedback(
      undefined,
      'code',
      {
        select: () => {},
        feedback: (value) => events.push(value),
        reset: () => events.push('reset'),
      },
      controller.signal,
    );
    const cancelled = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['selected']);
    controller.abort();
    await cancelled;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(2400);
    expect(events).toEqual(['selected']);
  });

  it.each([true, false])(
    'ignores a pending clipboard result after cancellation (success: %s)',
    async (success) => {
      let finish!: () => void;
      const controller = new AbortController();
      const select = vi.fn();
      const feedback = vi.fn();
      const result = copyFeedback(
        {
          writeText: () =>
            new Promise<void>((resolve, reject) => {
              finish = () => (success ? resolve() : reject(new Error('Permission denied')));
            }),
        },
        'code',
        { select, feedback, reset: vi.fn() },
        controller.signal,
      );
      const cancelled = expect(result).rejects.toMatchObject({ name: 'AbortError' });
      controller.abort();
      finish();
      await cancelled;
      expect(select).not.toHaveBeenCalled();
      expect(feedback).not.toHaveBeenCalled();
    },
  );
});
