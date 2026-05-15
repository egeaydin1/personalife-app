import { prisma } from "../../lib/prisma.js";
import { addDays, format, differenceInDays } from "date-fns";

const MAX_AGE_MINUTES = 30;

export async function getMemorySnapshot(userId: string): Promise<string> {
  const snapshot = await prisma.memorySnapshot.findUnique({ where: { userId } });

  if (snapshot) {
    const ageMin = differenceInDays(new Date(), snapshot.updatedAt) * 24 * 60;
    if (ageMin < MAX_AGE_MINUTES) return snapshot.content;
  }

  return regenerateMemorySnapshot(userId);
}

export async function regenerateMemorySnapshot(userId: string): Promise<string> {
  const now = new Date();
  const sevenDaysAgo = addDays(now, -7);
  const sevenDaysAhead = addDays(now, 7);

  const [user, tasks, courses, upcomingEvents, recentLogs, recentCheckin, friends] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.task.findMany({
        where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
        include: { course: { select: { name: true } } },
        orderBy: [{ priority: "desc" }, { deadline: "asc" }],
        take: 10,
      }),
      prisma.course.findMany({
        where: { userId, semesterEnd: { gte: now } },
        orderBy: { startTime: "asc" },
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startAt: { gte: now, lte: sevenDaysAhead } },
        orderBy: { startAt: "asc" },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        include: { category: true },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.dailyCheckin.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      prisma.friend.findMany({
        where: { userId },
        include: { memories: { orderBy: { date: "desc" }, take: 1 } },
        orderBy: { lastContactAt: "desc" },
        take: 5,
      }),
    ]);

  // Detect missing log days in last 7 days
  const logDates = new Set(
    recentLogs.map((l) => format(l.createdAt, "yyyy-MM-dd"))
  );
  const missingDays: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = format(addDays(now, -i), "yyyy-MM-dd");
    if (!logDates.has(d)) missingDays.push(d);
  }

  const content = buildSnapshot({
    user,
    tasks,
    courses,
    upcomingEvents,
    recentLogs,
    recentCheckin,
    friends,
    missingDays,
    now,
  });

  await prisma.memorySnapshot.upsert({
    where: { userId },
    create: { userId, content },
    update: { content },
  });

  return content;
}

function buildSnapshot(data: any): string {
  const { user, tasks, courses, upcomingEvents, recentLogs, recentCheckin, friends, missingDays, now } = data;

  const lines: string[] = [
    `# Memory Snapshot — ${format(now, "yyyy-MM-dd HH:mm")}`,
    `User: ${user?.name ?? "Unknown"} | TZ: ${user?.timezone ?? "Europe/Istanbul"}`,
    "",
  ];

  // Active tasks
  lines.push("## Active Tasks");
  if (tasks.length === 0) {
    lines.push("- No active tasks");
  } else {
    for (const t of tasks) {
      const deadline = t.deadline ? ` — due ${format(t.deadline, "MMM d")}` : "";
      const course = t.course ? ` [${t.course.name}]` : "";
      lines.push(`- [${t.status}] ${t.title}${course}${deadline}`);
    }
  }
  lines.push("");

  // School schedule
  lines.push("## School Schedule");
  if (courses.length === 0) {
    lines.push("- No courses entered");
  } else {
    for (const c of courses) {
      const days = c.daysOfWeek.map((d: number) =>
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
      ).join(", ");
      lines.push(`- ${c.name}: ${days} ${c.startTime}–${c.endTime}${c.room ? ` @ ${c.room}` : ""}`);
    }
  }
  lines.push("");

  // Upcoming events
  lines.push("## Upcoming (7 days)");
  if (upcomingEvents.length === 0) {
    lines.push("- No upcoming calendar events");
  } else {
    for (const e of upcomingEvents) {
      lines.push(`- ${format(e.startAt, "EEE MMM d HH:mm")} — ${e.title}`);
    }
  }
  lines.push("");

  // Recent activity summary
  lines.push("## Recent Activity Summary");
  if (recentLogs.length === 0) {
    lines.push("- No recent activity logged");
  } else {
    const byCategory: Record<string, number> = {};
    for (const l of recentLogs) {
      const cat = l.category?.name ?? "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + (l.durationMin ?? 0);
    }
    for (const [cat, min] of Object.entries(byCategory)) {
      lines.push(`- ${cat}: ${Math.round(min / 60 * 10) / 10}h this week`);
    }
  }
  if (missingDays.length > 0) {
    lines.push(`- Missing logs: ${missingDays.slice(0, 5).join(", ")}`);
  }
  lines.push("");

  // Last check-in
  lines.push("## Last Check-in");
  if (recentCheckin) {
    lines.push(`- Date: ${format(recentCheckin.date, "yyyy-MM-dd")}`);
    if (recentCheckin.summary) lines.push(`- Summary: ${recentCheckin.summary}`);
  } else {
    lines.push("- No check-ins recorded yet");
  }
  lines.push("");

  // Social notes
  lines.push("## Social Notes");
  if (friends.length === 0) {
    lines.push("- No friends added yet");
  } else {
    for (const f of friends) {
      const lastContact = f.lastContactAt
        ? `last contact ${format(f.lastContactAt, "MMM d")}`
        : "no contact recorded";
      const lastMemory = f.memories[0]?.content.slice(0, 80) ?? "";
      lines.push(`- ${f.name} (${f.relationshipType ?? "friend"}) — ${lastContact}${lastMemory ? `: "${lastMemory}"` : ""}`);
    }
  }

  return lines.join("\n");
}
