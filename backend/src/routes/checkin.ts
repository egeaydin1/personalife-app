import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { runAgent } from "../services/agent/index.js";
import { getMemoryQueue } from "../lib/queue.js";
import { format } from "date-fns";

export async function checkinRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Get or create today's check-in
  app.get("/checkins/today", async (req) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const checkin = await prisma.dailyCheckin.findUnique({
      where: { userId_date: { userId: req.user.id, date: new Date(today) } },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        activityLogs: { include: { category: true, tags: true } },
      },
    });

    if (!checkin) {
      // Create today's checkin + kick off agent greeting
      const newCheckin = await prisma.dailyCheckin.create({
        data: { userId: req.user.id, date: new Date(today) },
      });
      return { ...newCheckin, messages: [], activityLogs: [] };
    }

    return checkin;
  });

  // List past check-ins
  app.get("/checkins", async (req) => {
    const query = z.object({
      limit: z.coerce.number().default(30),
      offset: z.coerce.number().default(0),
    }).parse(req.query);

    return prisma.dailyCheckin.findMany({
      where: { userId: req.user.id },
      orderBy: { date: "desc" },
      take: query.limit,
      skip: query.offset,
      include: { _count: { select: { activityLogs: true, messages: true } } },
    });
  });

  // Send a message in today's check-in
  app.post("/checkins/message", async (req, reply) => {
    const body = z.object({ message: z.string().min(1) }).parse(req.body);
    const today = format(new Date(), "yyyy-MM-dd");

    let checkin = await prisma.dailyCheckin.findUnique({
      where: { userId_date: { userId: req.user.id, date: new Date(today) } },
    });

    if (!checkin) {
      checkin = await prisma.dailyCheckin.create({
        data: { userId: req.user.id, date: new Date(today) },
      });
    }

    // Save user message
    await prisma.agentMessage.create({
      data: {
        userId: req.user.id,
        checkinId: checkin.id,
        role: "USER",
        content: body.message,
      },
    });

    // Fetch conversation history for context
    const history = await prisma.agentMessage.findMany({
      where: { checkinId: checkin.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // Only include USER + ASSISTANT messages — TOOL/SYSTEM messages break OpenAI message sequencing
    const agentHistory = history
      .filter(m => m.role === "USER" || m.role === "ASSISTANT")
      .map(m => ({
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      }));

    const response = await runAgent({
      userId: req.user.id,
      checkinId: checkin.id,
      userMessage: body.message,
      history: agentHistory.slice(0, -1), // exclude the user message we just saved
    });

    // Queue a memory snapshot refresh
    const memQueue = getMemoryQueue();
    await memQueue.add("refresh", { userId: req.user.id }, { jobId: `memory-${req.user.id}`, deduplication: { id: req.user.id } });

    return reply.status(201).send({ response, checkinId: checkin.id });
  });

  // Update check-in metadata
  app.patch("/checkins/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      mood: z.number().min(1).max(5).optional(),
      energyLevel: z.number().min(1).max(5).optional(),
      summary: z.string().optional(),
    }).parse(req.body);

    const checkin = await prisma.dailyCheckin.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!checkin) return reply.status(404).send({ error: "Not found" });

    return prisma.dailyCheckin.update({ where: { id }, data: body });
  });
}
