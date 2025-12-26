import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity } from './track.entity';

type QueueTask = () => Promise<void>;

class SimpleQueue {
  private readonly queue: QueueTask[] = [];
  private running = 0;

  constructor(private readonly concurrency: number) {}

  add(task: QueueTask): void {
    this.queue.push(task);
    this.process();
  }

  private process(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) {
        continue;
      }
      this.running += 1;
      Promise.resolve()
        .then(task)
        .catch(() => undefined)
        .finally(() => {
          this.running -= 1;
          this.process();
        });
    }
  }
}

@Injectable()
export class TrackQueueService {
  private readonly logger = new Logger(TrackQueueService.name);
  private readonly searchQueue: SimpleQueue;
  private readonly downloadQueue: SimpleQueue;
  private readonly pendingSearchIds = new Set<number>();
  private readonly pendingDownloadIds = new Set<number>();
  private lastDownloadTimestamp = 0;

  constructor() {
    this.searchQueue = new SimpleQueue(2);
    this.downloadQueue = new SimpleQueue(1);
  }

  private getMaxDownloadsPerMinute(): number {
    const raw = Number(process.env.YT_DOWNLOADS_PER_MINUTE || 3);
    if (Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }
    return 1;
  }

  private async waitForDownloadSlot(): Promise<void> {
    const maxPerMinute = this.getMaxDownloadsPerMinute();
    const spacingMs = Math.floor(60000 / maxPerMinute);
    const now = Date.now();
    const nextAvailable = this.lastDownloadTimestamp + spacingMs;
    if (now < nextAvailable) {
      await new Promise((resolve) => setTimeout(resolve, nextAvailable - now));
    }
    this.lastDownloadTimestamp = Date.now();
  }

  enqueueSearch(
    track: TrackEntity,
    task: () => Promise<void>,
  ): void {
    const trackId = track?.id;
    if (trackId && this.pendingSearchIds.has(trackId)) {
      return;
    }
    if (trackId) {
      this.pendingSearchIds.add(trackId);
    }
    this.searchQueue.add(async () => {
      try {
        await task();
      } catch (error) {
        this.logger.error(error);
      } finally {
        if (trackId) {
          this.pendingSearchIds.delete(trackId);
        }
      }
    });
  }

  enqueueDownload(
    track: TrackEntity,
    task: () => Promise<void>,
  ): void {
    const trackId = track?.id;
    if (trackId && this.pendingDownloadIds.has(trackId)) {
      return;
    }
    if (trackId) {
      this.pendingDownloadIds.add(trackId);
    }
    this.downloadQueue.add(async () => {
      try {
        await this.waitForDownloadSlot();
        await task();
      } catch (error) {
        this.logger.error(error);
      } finally {
        if (trackId) {
          this.pendingDownloadIds.delete(trackId);
        }
      }
    });
  }
}
