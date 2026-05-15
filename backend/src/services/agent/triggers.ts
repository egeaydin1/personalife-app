import { prisma } from "../../lib/prisma.js";
import { getTriggerQueue } from "../../lib/queue.js";
import { addMinutes, addDays, setHours, setMinutes, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { TriggerType } from "@prisma/client";

const RETRY_LIMIT = 3;
const POST_EVENT_BUFFER_MIN = 15;

export async function scheduleDailyCheckin(userId: string, timezone: string, timeHHMM: string) {
  const [h, m] = timeHHMM.split(":").map(Number);
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  let scheduledLocal = setMinutes(setHours(zoned, h), m);
  if (scheduledLocal <= zoned) {
    scheduledLocal = addDays(scheduledLocal, 1);
  }
  const scheduledAt = fromZonedTime(scheduledLocal, timezone);

  await createTrigger(userId, "DAILY_CHECKIN", scheduledAt);
}

export async function schedulePostClassTriggers(userId: string) {
  const courses = await prisma.course.findMany({
    where: { userId, semesterEnd: { gte: new Date() } },
  });

  for (const course of courses) {
    const now = new Date();
    const todayDow = now.getDay();

    if (!course.daysOfWeek.includes(todayDow)) continue;

    const [endH, endM] = course.endTime.split(":").map(Number);
    const endToday = setMinutes(setHours(now, endH), endM);
    const fireAt = addMinutes(endToday, POST_EVENT_BUFFER_MIN);

    if (fireAt > now) {
      await createTrigger(userId, "POST_CLASS", fireAt, {
        courseId: course.id,
        courseName: course.name,
      });
    }
  }
}

export async function scheduleMissingLogCheck(userId: string) {
  const tomorrow9am = addDays(new Date(), 1);
  tomorrow9am.setHours(9, 0, 0, 0);
  await createTrigger(userId, "MISSING_LOG", tomorrow9am);
}

export async function scheduleDeadlineReminders(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      deadline: { gte: new Date(), lte: addDays(new Date(), 2) },
    },
  });

  for (const task of tasks) {
    if (!task.deadline) continue;
    const fireAt = addMinutes(task.deadline, -24 * 60); // 24h before deadline
    if (fireAt > new Date()) {
      await createTrigger(userId, "DEADLINE_APPROACHING", fireAt, {
        taskId: task.id,
        taskTitle: task.title,
      });
    }
  }
}

export async function markTriggerFired(triggerId: string) {
  await prisma.agentTrigger.update({
    where: { id: triggerId },
    data: { status: "FIRED", firedAt: new Date() },
  });
}

export async function markTriggerFailed(triggerId: string) {
  const trigger = await prisma.agentTrigger.findUnique({ where: { id: triggerId } });
  if (!trigger) return;

  if (trigger.retryCount >= RETRY_LIMIT) {
    await prisma.agentTrigger.update({
      where: { id: triggerId },
      data: { status: "FAILED", failedAt: new Date() },
    });
    return;
  }

  const retryAt = addMinutes(new Date(), 5 * (trigger.retryCount + 1));
  await prisma.agentTrigger.update({
    where: { id: triggerId },
    data: { retryCount: { increment: 1 }, scheduledAt: retryAt },
  });

  const queue = getTriggerQueue();
  await queue.add(
    "fire",
    { triggerId, userId: trigger.userId, type: trigger.type, payload: trigger.payload },
    { delay: retryAt.getTime() - Date.now() }
  );
}

async function createTrigger(
  userId: string,
  type: TriggerType,
  scheduledAt: Date,
  payload?: Record<string, unknown>
) {
  const trigger = await prisma.agentTrigger.create({
    data: { userId, type, scheduledAt, payload: payload ?? {} },
  });

  const queue = getTriggerQueue();
  const delay = scheduledAt.getTime() - Date.now();
  await queue.add(
    "fire",
    { triggerId: trigger.id, userId, type, payload },
    { delay: Math.max(0, delay), jobId: trigger.id }
  );

  return trigger;
}
