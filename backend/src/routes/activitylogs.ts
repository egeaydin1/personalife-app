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
    }).parse(req.query);

    return prisma.activityLog.findMany({
      where: {
        userId: req.user.id,
        ...(query.category ? { category: { name: query.category } } : {}),
      },
      include: { category: { select: { id: true, name: true, color: true } }, tags: true },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    });
  });

  app.patch("/activity-logs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      durationMin: z.number().int().positive().optional(),
      categoryId: z.string().optional(),
    }).parse(req.body);

    const log = await prisma.activityLog.findFirst({ where: { id, userId: req.user.id } });
    if (!log) return reply.status(404).send({ error: "Not found" });

    return prisma.activityLog.update({ where: { id }, data: body });
  });

  app.delete("/activity-logs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const log = await prisma.activityLog.findFirst({ where: { id, userId: req.user.id } });
    if (!log) return reply.status(404).send({ error: "Not found" });

    await prisma.activityLog.delete({ where: { id } });
    return reply.status(204).send();
  });
}
