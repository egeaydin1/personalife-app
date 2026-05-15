import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, format } from "date-fns";

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/reports/daily", async (req) => {
    const query = z.object({ date: z.string().optional() }).parse(req.query);
    const date = query.date ? new Date(query.date) : new Date();

    const [activityLogs, screenTimeEntries, checkin, tasks] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: req.user.id, createdAt: { gte: startOfDay(date), lte: endOfDay(date) } },
        include: { category: true, tags: true },
      }),
      prisma.screenTimeEntry.findMany({
        where: { upload: { userId: req.user.id, date: { gte: startOfDay(date), lte: endOfDay(date) } } },
      }),
      prisma.dailyCheckin.findFirst({
        where: { userId: req.user.id, date: { gte: startOfDay(date), lte: endOfDay(date) } },
      }),
      prisma.task.findMany({
        where: { userId: req.user.id, deadline: { gte: startOfDay(date), lte: endOfDay(date) } },
      }),
    ]);

    const totalActivityMin = activityLogs.reduce((s, l) => s + (l.durationMin ?? 0), 0);
    const totalScreenMin = screenTimeEntries.reduce((s, e) => s + e.durationMin, 0);

    return {
      date: format(date, "yyyy-MM-dd"),
      checkin,
      activityLogs,
      screenTimeEntries,
      tasks,
      summary: {
        totalActivityMin,
        totalScreenMin,
        activitiesLogged: activityLogs.length,
      },
    };
  });

  app.get("/reports/weekly", async (req) => {
    const query = z.object({ date: z.string().optional() }).parse(req.query);
    const ref = query.date ? new Date(query.date) : new Date();
    const from = startOfWeek(ref, { weekStartsOn: 1 });
    const to = endOfWeek(ref, { weekStartsOn: 1 });

    const [activityLogs, screenTimeEntries, checkins] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: req.user.id, createdAt: { gte: from, lte: to } },
        include: { category: true },
      }),
      prisma.screenTimeEntry.findMany({
        where: { upload: { userId: req.user.id, date: { gte: from, lte: to } } },
      }),
      prisma.dailyCheckin.findMany({
        where: { userId: req.user.id, date: { gte: from, lte: to } },
      }),
    ]);

    const byCategory = groupByCategory(activityLogs);
    const screenByApp = groupScreenByApp(screenTimeEntries);
    const daysSorted = buildDailyBreakdown(from, to, activityLogs);

    return {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      checkinsCompleted: checkins.length,
      totalDays: 7,
      byCategory,
      screenByApp,
      dailyBreakdown: daysSorted,
    };
  });

  app.get("/reports/monthly", async (req) => {
    const query = z.object({ month: z.string().optional() }).parse(req.query);
    const ref = query.month ? new Date(query.month + "-01") : new Date();
    const from = startOfMonth(ref);
    const to = endOfMonth(ref);

    const [activityLogs, screenTimeEntries, checkins, tasks] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: req.user.id, createdAt: { gte: from, lte: to } },
        include: { category: true },
      }),
      prisma.screenTimeEntry.findMany({
        where: { upload: { userId: req.user.id, date: { gte: from, lte: to } } },
      }),
      prisma.dailyCheckin.findMany({
        where: { userId: req.user.id, date: { gte: from, lte: to } },
      }),
      prisma.task.findMany({
        where: { userId: req.user.id, deadline: { gte: from, lte: to } },
      }),
    ]);

    return {
      month: format(from, "yyyy-MM"),
      checkinsCompleted: checkins.length,
      tasksCompleted: tasks.filter((t) => t.status === "DONE").length,
      tasksTotal: tasks.length,
      byCategory: groupByCategory(activityLogs),
      screenByApp: groupScreenByApp(screenTimeEntries),
      totalActivityHours: activityLogs.reduce((s, l) => s + (l.durationMin ?? 0), 0) / 60,
      totalScreenHours: screenTimeEntries.reduce((s, e) => s + e.durationMin, 0) / 60,
    };
  });
}

function groupByCategory(logs: any[]) {
  const map: Record<string, number> = {};
  for (const l of logs) {
    const key = l.category?.name ?? "uncategorized";
    map[key] = (map[key] ?? 0) + (l.durationMin ?? 0);
  }
  return Object.entries(map)
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

function groupScreenByApp(entries: any[]) {
  const map: Record<string, number> = {};
  for (const e of entries) {
    map[e.appName] = (map[e.appName] ?? 0) + e.durationMin;
  }
  return Object.entries(map)
    .map(([appName, minutes]) => ({ appName, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

function buildDailyBreakdown(from: Date, to: Date, logs: any[]) {
  const days: Record<string, number> = {};
  let d = from;
  while (d <= to) {
    days[format(d, "yyyy-MM-dd")] = 0;
    d = addDays(d, 1);
  }
  for (const l of logs) {
    const key = format(l.createdAt, "yyyy-MM-dd");
    if (key in days) days[key] += l.durationMin ?? 0;
  }
  return Object.entries(days).map(([date, minutes]) => ({ date, minutes }));
}
