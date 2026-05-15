import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export async function friendRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/friends", async (req) => {
    return prisma.friend.findMany({
      where: { userId: req.user.id },
      include: {
        _count: { select: { memories: true } },
        memories: { orderBy: { date: "desc" }, take: 1 },
      },
      orderBy: { lastContactAt: "desc" },
    });
  });

  app.post("/friends", async (req, reply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      relationshipType: z.string().optional(),
      proximityLabel: z.string().optional(),
    }).parse(req.body);

    const friend = await prisma.friend.create({
      data: { ...body, userId: req.user.id },
    });
    return reply.status(201).send(friend);
  });

  app.patch("/friends/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      relationshipType: z.string().optional(),
      lastContactAt: z.string().datetime().optional(),
      proximityLabel: z.string().optional(),
    }).parse(req.body);

    const friend = await prisma.friend.findFirst({ where: { id, userId: req.user.id } });
    if (!friend) return reply.status(404).send({ error: "Not found" });

    return prisma.friend.update({
      where: { id },
      data: { ...body, lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : undefined },
    });
  });

  app.delete("/friends/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const friend = await prisma.friend.findFirst({ where: { id, userId: req.user.id } });
    if (!friend) return reply.status(404).send({ error: "Not found" });

    await prisma.friend.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Memories
  app.get("/friends/:id/memories", async (req, reply) => {
    const { id } = req.params as { id: string };
    const friend = await prisma.friend.findFirst({ where: { id, userId: req.user.id } });
    if (!friend) return reply.status(404).send({ error: "Not found" });

    return prisma.friendMemory.findMany({
      where: { friendId: id },
      orderBy: { date: "desc" },
    });
  });

  app.post("/friends/:id/memories", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      content: z.string().min(1),
      date: z.string().datetime(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);

    const friend = await prisma.friend.findFirst({ where: { id, userId: req.user.id } });
    if (!friend) return reply.status(404).send({ error: "Not found" });

    const memory = await prisma.friendMemory.create({
      data: { friendId: id, content: body.content, date: new Date(body.date), tags: body.tags ?? [] },
    });

    // Update last contact
    await prisma.friend.update({
      where: { id },
      data: { lastContactAt: new Date(body.date) },
    });

    return reply.status(201).send(memory);
  });

  app.delete("/friends/:friendId/memories/:memId", async (req, reply) => {
    const { friendId, memId } = req.params as { friendId: string; memId: string };
    const friend = await prisma.friend.findFirst({ where: { id: friendId, userId: req.user.id } });
    if (!friend) return reply.status(404).send({ error: "Not found" });

    await prisma.friendMemory.delete({ where: { id: memId } });
    return reply.status(204).send();
  });
}
