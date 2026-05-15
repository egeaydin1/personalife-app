import { Queue, Worker, Job } from "bullmq";
import { getRedis } from "./redis.js";

const connection = { connection: getRedis() };

// ── Queue names ──────────────────────────────────────────────
export const QUEUE_OCR = "ocr";
export const QUEUE_TRIGGER = "trigger";
export const QUEUE_MEMORY = "memory";

// ── Queue instances (created lazily) ────────────────────────
let ocrQueue: Queue;
let triggerQueue: Queue;
let memoryQueue: Queue;

export function getOcrQueue(): Queue {
  if (!ocrQueue) ocrQueue = new Queue(QUEUE_OCR, connection);
  return ocrQueue;
}

export function getTriggerQueue(): Queue {
  if (!triggerQueue) triggerQueue = new Queue(QUEUE_TRIGGER, connection);
  return triggerQueue;
}

export function getMemoryQueue(): Queue {
  if (!memoryQueue) memoryQueue = new Queue(QUEUE_MEMORY, connection);
  return memoryQueue;
}

// ── Job type definitions ─────────────────────────────────────
export type OcrJobData = {
  uploadId: string;
  storagePath: string;
  userId: string;
};

export type TriggerJobData = {
  triggerId: string;
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
};

export type MemoryJobData = {
  userId: string;
};
