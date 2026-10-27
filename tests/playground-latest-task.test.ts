import { afterEach, expect, it, vi } from 'vitest';
import { LatestTask } from '../src/playground/latest-task';

afterEach(() => vi.useRealTimers());

it('coalesces drag updates and serializes work without publishing an older result', async () => {
  vi.useFakeTimers();
  const calls: number[] = [];
  const published: number[] = [];
  let finish!: () => void;
  const queue = new LatestTask();
  const task = (value: number) => async (current: () => boolean) => {
    calls.push(value);
    if (value === 1)
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    if (current()) published.push(value);
  };
  queue.schedule(task(1));
  await vi.runOnlyPendingTimersAsync();
  queue.schedule(task(2));
  queue.schedule(task(3));
  await vi.runOnlyPendingTimersAsync();
  expect(calls).toEqual([1]);
  finish();
  await vi.waitFor(() => expect(calls).toEqual([1, 3]));
  expect(published).toEqual([3]);
});

it('cancels queued updates and prevents in-flight results from returning after navigation', async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const published = vi.fn();
  const queue = new LatestTask();
  const task = (value: number) => async (current: () => boolean) => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    if (current()) published(value);
  };
  queue.schedule(task(1), 0);
  queue.schedule(task(2));
  queue.cancel();
  finish();
  await vi.runAllTimersAsync();
  expect(published).not.toHaveBeenCalled();
});
