// Keep a running task intact and coalesce queued input into its latest value.
export class LatestTask {
  private timer?: ReturnType<typeof setTimeout>;
  private pending?: { execute: (current: () => boolean) => Promise<void>; revision: number };
  private revision = 0;
  private running = false;

  schedule(execute: (current: () => boolean) => Promise<void>, delay = 40) {
    this.pending = { execute, revision: ++this.revision };
    clearTimeout(this.timer);
    if (!delay) {
      this.timer = undefined;
      void this.flush();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, delay);
  }

  cancel() {
    this.revision += 1;
    this.pending = undefined;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async flush() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending && !this.timer) {
        const task = this.pending;
        this.pending = undefined;
        await task.execute(() => task.revision === this.revision);
      }
    } finally {
      this.running = false;
    }
  }
}
