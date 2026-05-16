import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export async function activityLogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/activity-logs", async (req) => {
    const query = z.object({
      limit: z.coerce.number().default(100),
      offset: z.coerce.number().default(0),
      category: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(req.query);

    const logs = await prisma.activityLog.findMany({
      where: {
        userId: req.user.id,
        ...(query.category ? { category: { name: query.category } } : {}),
        ...(query.from || query.to ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        } : {}),
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        tags: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    });

    // Deduplicate: merge logs with same title on same day
    const seen = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      const key = `${log.title.toLowerCase().trim()}::${day}`;
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        // Keep the one with more info; merge duration
        if (log.durationMin && existing.durationMin) {
          existing.durationMin = Math.max(existing.durationMin, log.durationMin);
        } else if (log.durationMin) {
          existing.durationMin = log.durationMin;
        }
      } else {
        seen.set(key, log);
      }
    }

    return Array.from(seen.values());
  });

  app.patch("/activity-logs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      durationMin: z.number().int().positive().optional().nullable(),
      categoryId: z.string().optional().nullable(),
    }).parse(req.body);

    const log = await prisma.activityLog.findFirst({ where: { id, userId: req.user.id } });
    if (!log) return reply.status(404).send({ error: "Not found" });

    return prisma.activityLog.update({
      where: { id },
      data: body,
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  });

  app.delete("/activity-logs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const log = await prisma.activityLog.findFirst({ where: { id, userId: req.user.id } });
    if (!log) return reply.status(404).send({ error: "Not found" });
    await prisma.activityLog.delete({ where: { id } });
    return reply.status(204).send();
  });
}
