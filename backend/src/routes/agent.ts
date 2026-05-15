import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { runAgent } from "../services/agent/index.js";
import { getMemorySnapshot, regenerateMemorySnapshot } from "../services/agent/memory.js";

export async function agentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Direct chat with agent (not tied to a check-in)
  app.post("/agent/chat", async (req, reply) => {
    const body = z.object({
      message: z.string().min(1),
      context: z.string().optional(),
    }).parse(req.body);

    const response = await runAgent({
      userId: req.user.id,
      userMessage: body.message,
      triggerContext: body.context,
    });

    return reply.status(201).send({ response });
  });

  // Get current memory snapshot
  app.get("/agent/memory", async (req) => {
    const content = await getMemorySnapshot(req.user.id);
    return { content };
  });

  // Force regenerate memory snapshot
  app.post("/agent/memory/refresh", async (req) => {
    const content = await regenerateMemorySnapshot(req.user.id);
    return { content };
  });

  // List recent agent messages
  app.get("/agent/messages", async (req) => {
    const query = z.object({
      limit: z.coerce.number().default(50),
    }).parse(req.query);

    return prisma.agentMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
  });

  // List triggers for debugging / visibility
  app.get("/agent/triggers", async (req) => {
    return prisma.agentTrigger.findMany({
      where: { userId: req.user.id },
      orderBy: { scheduledAt: "desc" },
      take: 50,
    });
  });
}
