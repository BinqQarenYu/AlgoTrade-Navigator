export enum PriorityLevel {
  EMERGENCY = 1,     // Manual trade orders / user actions
  MAINTENANCE = 2,   // Live data maintenance / websocket recovery
  BACKGROUND = 3,    // Lazy backfill (2-month gap)
}

interface QueuedTask<T> {
  priority: PriorityLevel;
  executor: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  addedAt: number;
}

export class ApiPriorityQueue {
  private queue: QueuedTask<any>[] = [];
  private isProcessing = false;
  private lastCallTime = 0;

  // Minimum time between requests to protect exchange rate limits globally
  private rateLimitMs: number;

  constructor(rateLimitMs: number = 200) {
    this.rateLimitMs = rateLimitMs;
  }

  // Add a promise-returning task to the strict priority queue
  public enqueue<T>(priority: PriorityLevel, executor: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        priority,
        executor,
        resolve,
        reject,
        addedAt: Date.now()
      });

      // Maintain order: Lower number = higher priority.
      // E.g. EMERGENCY (1) jumps ahead of BACKGROUND (3)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.addedAt - b.addedAt; // FIFO for same priority
      });

      this.processQueue();
    });
  }

  // Non-blocking processing loop
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        
        // Cooldown/Throttle to prevent 429 errors from bursting
        if (timeSinceLastCall < this.rateLimitMs) {
          await new Promise(r => setTimeout(r, this.rateLimitMs - timeSinceLastCall));
        }

        const task = this.queue.shift();
        if (!task) break;

        this.lastCallTime = Date.now();

        try {
            const result = await task.executor();
            task.resolve(result);
        } catch (error) {
            task.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Expose queue length for UI progress monitoring
  public getPendingCount(priorityLevel?: PriorityLevel): number {
      if (!priorityLevel) return this.queue.length;
      return this.queue.filter(t => t.priority === priorityLevel).length;
  }
}

// Global instance protecting binance/ccxt REST requests
export const globalApiQueue = new ApiPriorityQueue(150); // 150ms buffer between all REST calls
