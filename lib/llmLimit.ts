export class Semaphore {
  private inFlight = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire() {
    if (this.inFlight < this.max) {
      this.inFlight++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.inFlight++;
  }

  release() {
    this.inFlight--;
    const next = this.queue.shift();
    if (next) next();
  }
}

export async function withSemaphore<T>(sem: Semaphore, fn: () => Promise<T>) {
  await sem.acquire();
  try {
    return await fn();
  } finally {
    sem.release();
  }
}
