import { prisma } from "../../lib/prisma.js";
import { addDays, format, differenceInMinutes } from "date-fns";

const MAX_AGE_MINUTES = 15; // refresh every 15 min (was 30 — too stale)

export async function getMemorySnapshot(userId: string): Promise<string> {
  const snapshot = await prisma.memorySnapshot.findUnique({ where: { userId } });
  if (snapshot) {
    const ageMin = differenceInMinutes(new Date(), snapshot.updatedAt);
    if (ageMin < MAX_AGE_MINUTES) return snapshot.content;
  }
  return regenerateMemorySnapshot(userId);
}

export async function regenerateMemorySnapshot(userId: string): Promise<string> {
  const now = new Date();
  const sevenDaysAgo = addDays(now, -7);
  const sevenDaysAhead = addDays(now, 7);

  const [user, tasks, courses, upcomingEvents, recentLogs, recentCheckin, friends, attendance] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { settings: true } }),
      prisma.task.findMany({
        where: { userId, status: { in: ["TODO", "IN_PROGRESS"] }, parentId: null },
        include: { course: { select: { name: true } }, category: { select: { name: true } } },
        orderBy: [{ priority: "desc" }, { deadline: "asc" }],
        take: 12,
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
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.dailyCheckin.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.friend.findMany({
        where: { userId },
        include: { memories: { orderBy: { date: "desc" }, take: 1 } },
        orderBy: { lastContactAt: "desc" },
        take: 5,
      }),
      prisma.courseAttendance.findMany({
        where: { userId, date: { gte: new Date(addDays(now, -30).toISOString().split("T")[0]) } },
        include: { course: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

  // Detect missing log days in last 7 days
  const logDates = new Set(recentLogs.map(l => format(l.createdAt, "yyyy-MM-dd")));
  const missingDays: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = format(addDays(now, -i), "yyyy-MM-dd");
    if (!logDates.has(d)) missingDays.push(d);
  }

  // Deduplicate logs by title+day, sum durations
  const logMap = new Map<string, { title: string; category: string; totalMin: number; count: number }>();
  for (const l of recentLogs) {
    const day = format(l.createdAt, "yyyy-MM-dd");
    const key = `${l.title.toLowerCase()}::${day}`;
    const cat = l.category?.name ?? "uncategorized";
    if (logMap.has(key)) {
      const e = logMap.get(key)!;
      if (l.durationMin) e.totalMin += l.durationMin;
      e.count++;
    } else {
      logMap.set(key, { title: l.title, category: cat, totalMin: l.durationMin ?? 0, count: 1 });
    }
  }

  // Category totals
  const catTotals: Record<string, number> = {};
  for (const entry of logMap.values()) {
    catTotals[entry.category] = (catTotals[entry.category] ?? 0) + entry.totalMin;
  }

  // Attendance stats
  const attendanceByCourse: Record<string, { name: string; attended: number; missed: number }> = {};
  for (const a of attendance) {
    const k = a.courseId;
    if (!attendanceByCourse[k]) attendanceByCourse[k] = { name: a.course.name, attended: 0, missed: 0 };
    if (a.attended) attendanceByCourse[k].attended++;
    else attendanceByCourse[k].missed++;
  }

  const content = buildSnapshot({
    user, tasks, courses, upcomingEvents,
    logMap, catTotals, missingDays,
    recentCheckin, friends, attendanceByCourse, now,
  });

  await prisma.memorySnapshot.upsert({
    where: { userId },
    create: { userId, content },
    update: { content },
  });

  return content;
}

function fmtH(min: number): string {
  if (min < 60) return `${min}dk`;
  return `${(min / 60).toFixed(1)}s`;
}

function buildSnapshot(data: any): string {
  const { user, tasks, courses, upcomingEvents, logMap, catTotals, missingDays, recentCheckin, friends, attendanceByCourse, now } = data;
  const lines: string[] = [
    `# Memory Snapshot — ${format(now, "yyyy-MM-dd HH:mm")}`,
    `User: ${user?.name ?? "—"} | Timezone: ${user?.timezone ?? "Europe/Istanbul"}`,
    user?.school ? `School: ${user.school} — ${user.major ?? ""}` : "",
    user?.role ? `Role: ${user.role}` : "",
    "",
  ].filter(l => l !== "" || l === "");

  // Active tasks
  lines.push("## Active Tasks");
  if (tasks.length === 0) {
    lines.push("- No active tasks");
  } else {
    for (const t of tasks) {
      const deadline = t.deadline ? ` — due ${format(new Date(t.deadline), "MMM d")}` : "";
      const cat = t.category?.name ? ` [${t.category.name}]` : t.course ? ` [${t.course.name}]` : "";
      const milestone = t.isMilestone ? " 🎯" : "";
      lines.push(`- [${t.status}]${milestone} ${t.title}${cat}${deadline}`);
    }
  }
  lines.push("");

  // School schedule
  lines.push("## School Schedule");
  if (courses.length === 0) {
    lines.push("- No courses entered");
  } else {
    for (const c of courses) {
      const days = c.daysOfWeek.map((d: number) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ");
      lines.push(`- ${c.name}: ${days} ${c.startTime}–${c.endTime}${c.room ? ` @ ${c.room}` : ""}`);
    }
  }
  lines.push("");

  // Attendance summary
  const attKeys = Object.keys(attendanceByCourse);
  if (attKeys.length > 0) {
    lines.push("## Attendance (last 30 days)");
    for (const k of attKeys) {
      const s = attendanceByCourse[k];
      const total = s.attended + s.missed;
      const rate = total > 0 ? Math.round((s.attended / total) * 100) : null;
      lines.push(`- ${s.name}: ${s.attended}/${total}${rate !== null ? ` (${rate}%)` : ""}`);
    }
    lines.push("");
  }

  // Upcoming events
  lines.push("## Upcoming (7 days)");
  if (upcomingEvents.length === 0) {
    lines.push("- No upcoming calendar events");
  } else {
    for (const e of upcomingEvents) {
      lines.push(`- ${format(new Date(e.startAt), "EEE MMM d HH:mm")} — ${e.title}`);
    }
  }
  lines.push("");

  // Recent activity by category
  lines.push("## Activity Summary (last 7 days)");
  if (logMap.size === 0) {
    lines.push("- No activity logs in last 7 days");
  } else {
    const entries = Array.from(logMap.values());
    lines.push(`- Total logged activities: ${entries.length}`);
    for (const [cat, min] of Object.entries(catTotals).sort((a, b) => (b[1] as number) - (a[1] as number))) {
      if ((min as number) > 0) lines.push(`- ${cat}: ${fmtH(min as number)}`);
    }
    lines.push("Recent:");
    for (const e of entries.slice(0, 8)) {
      lines.push(`  · ${e.title}${e.totalMin > 0 ? ` (${fmtH(e.totalMin)})` : ""} — ${e.category}`);
    }
  }
  if (missingDays.length > 0) {
    lines.push(`- Missing log days: ${missingDays.slice(0, 5).join(", ")}`);
  }
  lines.push("");

  // Last check-in
  lines.push("## Last Check-in");
  if (recentCheckin) {
    lines.push(`- Date: ${format(new Date(recentCheckin.date), "yyyy-MM-dd")}`);
    if (recentCheckin.summary) lines.push(`- Summary: ${recentCheckin.summary}`);
    if (recentCheckin.mood) lines.push(`- Mood: ${recentCheckin.mood}/5`);
  } else {
    lines.push("- No check-ins yet");
  }
  lines.push("");

  // Social notes
  lines.push("## Social Notes");
  if (friends.length === 0) {
    lines.push("- No friends recorded");
  } else {
    for (const f of friends) {
      const lastContact = f.lastContactAt ? `last contact ${format(new Date(f.lastContactAt), "MMM d")}` : "no contact recorded";
      const lastMemory = f.memories[0]?.content.slice(0, 80) ?? "";
      lines.push(`- ${f.name} (${f.relationshipType ?? "friend"}) — ${lastContact}${lastMemory ? `: "${lastMemory}"` : ""}`);
    }
  }

  // Custom system prompt addition
  if (user?.settings?.customSystemPrompt) {
    lines.push("");
    lines.push("## Custom User Instructions");
    lines.push(user.settings.customSystemPrompt);
  }

  return lines.join("\n");
}
