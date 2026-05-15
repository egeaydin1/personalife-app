import { Worker, Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { extractScreenTime } from "../services/ocr.js";
import { QUEUE_OCR, OcrJobData } from "../lib/queue.js";

export function startOcrWorker() {
  const worker = new Worker<OcrJobData>(
    QUEUE_OCR,
    async (job: Job<OcrJobData>) => {
      const { uploadId, storagePath, userId } = job.data;

      await prisma.screenTimeUpload.update({
        where: { id: uploadId },
        data: { status: "PROCESSING" },
      });

      try {
        const entries = await extractScreenTime(storagePath);

        await prisma.$transaction([
          prisma.screenTimeEntry.deleteMany({ where: { uploadId } }),
          prisma.screenTimeEntry.createMany({
            data: entries.map((e) => ({
              uploadId,
              appName: e.appName,
              durationMin: e.durationMin,
              confidence: e.confidence,
            })),
          }),
          prisma.screenTimeUpload.update({
            where: { id: uploadId },
            data: { status: "DONE" },
          }),
        ]);

        console.log(`[ocr] ✓ upload ${uploadId}: ${entries.length} entries extracted`);
      } catch (err) {
        await prisma.screenTimeUpload.update({
          where: { id: uploadId },
          data: { status: "FAILED" },
        });
        console.error(`[ocr] ✗ upload ${uploadId}:`, err);
        throw err;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[ocr] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
