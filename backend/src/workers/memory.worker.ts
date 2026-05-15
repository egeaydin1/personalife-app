import { Worker, Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { regenerateMemorySnapshot } from "../services/agent/memory.js";
import { QUEUE_MEMORY, MemoryJobData } from "../lib/queue.js";

export function startMemoryWorker() {
  const worker = new Worker<MemoryJobData>(
    QUEUE_MEMORY,
    async (job: Job<MemoryJobData>) => {
      const { userId } = job.data;
      await regenerateMemorySnapshot(userId);
      console.log(`[memory] ✓ snapshot refreshed for user ${userId}`);
    },
    {
      connection: getRedis(),
      concurrency: 3,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[memory] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
