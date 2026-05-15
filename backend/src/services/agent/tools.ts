import { prisma } from "../../lib/prisma.js";
import { Tool } from "../openrouter.js";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// ── Tool definitions (sent to LLM) ───────────────────────────

export const AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_upcoming_calendar_events",
      description: "Get upcoming calendar events for the user within a date range",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days ahead to look (default 7)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_tasks",
      description: "Get the user's active (TODO / IN_PROGRESS) tasks",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max tasks to return (default 10)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_school_schedule",
      description: "Get the user's school schedule (courses) for upcoming days",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to check (default 7)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_activity_logs",
      description: "Get recent activity logs for the user",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of past days to fetch (default 3)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_friend_memories",
      description: "Get memories/notes about a specific friend or all friends",
      parameters: {
        type: "object",
        properties: {
          friendId: { type: "string", description: "Friend ID (optional, omit for recent memories across all friends)" },
          limit: { type: "number", description: "Max memories (default 5)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_activity_log",
      description: "Save a new activity log entry extracted from the conversation",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          durationMin: { type: "number" },
          categoryName: { type: "string", description: "One of: school, work, social, digital, sports, personal_dev, rest, family, friends" },
          tags: { type: "array", items: { type: "string" } },
          source: { type: "string", enum: ["checkin", "manual"] },
        },
        required: ["title"],
      },
    },
  },
];

// ── Tool executor ────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  switch (name) {
    case "get_upcoming_calendar_events": {
      const days = (args.days as number) ?? 7;
      const now = new Date();
      return prisma.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: now, lte: addDays(now, days) },
        },
        orderBy: { startAt: "asc" },
        take: 20,
      });
    }

    case "get_active_tasks": {
      const limit = (args.limit as number) ?? 10;
      return prisma.task.findMany({
        where: {
          userId,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        include: { course: { select: { name: true } } },
        orderBy: [{ priority: "desc" }, { deadline: "asc" }],
        take: limit,
      });
    }

    case "get_school_schedule": {
      const days = (args.days as number) ?? 7;
      const now = new Date();
      const targetDays = Array.from({ length: days }, (_, i) =>
        (now.getDay() + i) % 7
      );
      return prisma.course.findMany({
        where: {
          userId,
          daysOfWeek: { hasSome: targetDays },
          semesterEnd: { gte: now },
        },
        orderBy: { startTime: "asc" },
      });
    }

    case "get_recent_activity_logs": {
      const days = (args.days as number) ?? 3;
      return prisma.activityLog.findMany({
        where: {
          userId,
          createdAt: { gte: addDays(new Date(), -days) },
        },
        include: {
          category: true,
          tags: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    }

    case "get_friend_memories": {
      if (args.friendId) {
        return prisma.friendMemory.findMany({
          where: { friendId: args.friendId as string },
          orderBy: { date: "desc" },
          take: (args.limit as number) ?? 5,
        });
      }
      return prisma.friendMemory.findMany({
        where: { friend: { userId } },
        include: { friend: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: (args.limit as number) ?? 5,
      });
    }

    case "create_activity_log": {
      let category = null;
      if (args.categoryName) {
        category = await prisma.activityCategory.upsert({
          where: { name: args.categoryName as string },
          create: { name: args.categoryName as string },
          update: {},
        });
      }

      const tagNames = (args.tags as string[]) ?? [];
      const tags = await Promise.all(
        tagNames.map((name) =>
          prisma.activityTag.upsert({
            where: { name },
            create: { name },
            update: {},
          })
        )
      );

      return prisma.activityLog.create({
        data: {
          userId,
          title: args.title as string,
          description: args.description as string | undefined,
          durationMin: args.durationMin as number | undefined,
          categoryId: category?.id,
          source: (args.source as string) ?? "checkin",
          tags: { connect: tags.map((t) => ({ id: t.id })) },
        },
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
