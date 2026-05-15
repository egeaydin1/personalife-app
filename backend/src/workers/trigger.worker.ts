import { Worker, Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { runAgent } from "../services/agent/index.js";
import { markTriggerFired, markTriggerFailed } from "../services/agent/triggers.js";
import { QUEUE_TRIGGER, TriggerJobData } from "../lib/queue.js";

const TRIGGER_PROMPTS: Record<string, (payload: any) => string> = {
  DAILY_CHECKIN: () => "Günün nasıl geçti? Bugün neler yaptın? Birlikte günlük logunı çıkaralım.",
  MORNING_FOLLOWUP: () => "Günaydın! Dün hakkında bir şey eklemek ister misin?",
  POST_CLASS: (p) => `${p?.courseName ?? "Dersin"} bitti! Bugünkü ders nasıldı? Önemli bir şey oldu mu?`,
  POST_CALENDAR_EVENT: (p) => `"${p?.eventTitle ?? "Etkinlik"}" nasıl geçti? Kaydetmek ister misin?`,
  DEADLINE_APPROACHING: (p) => `"${p?.taskTitle ?? "Bir görevin"}" deadlini yaklaşıyor. Nasıl gidiyor?`,
  MISSING_LOG: () => "Son birkaç gün log girmedin. Birlikte özet çıkarmak ister misin?",
  LONG_SILENCE: () => "Bir süredir görüşemedik! Nasılsın? Son günlerde neler oldu?",
  POST_SOCIAL_EVENT: (p) => `${p?.friendName ? `${p.friendName} ile` : "Sosyal"} etkinliğin nasıl geçti?`,
};

export function startTriggerWorker() {
  const worker = new Worker<TriggerJobData>(
    QUEUE_TRIGGER,
    async (job: Job<TriggerJobData>) => {
      const { triggerId, userId, type, payload } = job.data;

      const trigger = await prisma.agentTrigger.findUnique({ where: { id: triggerId } });
      if (!trigger || trigger.status !== "PENDING") return;

      const promptFn = TRIGGER_PROMPTS[type];
      const triggerContext = promptFn ? promptFn(payload ?? {}) : `Trigger: ${type}`;

      try {
        await runAgent({ userId, triggerId, triggerContext });
        await markTriggerFired(triggerId);
        console.log(`[trigger] ✓ ${type} fired for user ${userId}`);
      } catch (err) {
        console.error(`[trigger] ✗ ${type} failed for user ${userId}:`, err);
        await markTriggerFailed(triggerId);
        throw err;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[trigger] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
