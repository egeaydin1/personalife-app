import { startOcrWorker } from "./workers/ocr.worker.js";
import { startTriggerWorker } from "./workers/trigger.worker.js";
import { startMemoryWorker } from "./workers/memory.worker.js";
import { prisma } from "./lib/prisma.js";
import { scheduleDailyCheckin, scheduleMissingLogCheck, scheduleDeadlineReminders } from "./services/agent/triggers.js";

async function bootstrap() {
  console.log("[worker] starting workers...");

  startOcrWorker();
  startTriggerWorker();
  startMemoryWorker();

  // Schedule daily triggers for all users on startup
  const users = await prisma.user.findMany({
    include: { settings: true },
  });

  for (const user of users) {
    const checkinTime = user.settings?.checkinTime ?? "21:00";
    await scheduleDailyCheckin(user.id, user.timezone, checkinTime);
    await scheduleMissingLogCheck(user.id);
    await scheduleDeadlineReminders(user.id);
  }

  console.log(`[worker] bootstrapped triggers for ${users.length} users`);
}

bootstrap().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
