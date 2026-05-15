import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const courseSchema = z.object({
  name: z.string().min(1),
  teacher: z.string().optional(),
  room: z.string().optional(),
  color: z.string().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  semesterStart: z.string().datetime(),
  semesterEnd: z.string().datetime(),
});

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/courses", async (req) => {
    return prisma.course.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { tasks: true } } },
      orderBy: { startTime: "asc" },
    });
  });

  app.post("/courses", async (req, reply) => {
    const body = courseSchema.parse(req.body);
    const course = await prisma.course.create({
      data: {
        ...body,
        userId: req.user.id,
        semesterStart: new Date(body.semesterStart),
        semesterEnd: new Date(body.semesterEnd),
      },
    });
    return reply.status(201).send(course);
  });

  app.patch("/courses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = courseSchema.partial().parse(req.body);

    const course = await prisma.course.findFirst({ where: { id, userId: req.user.id } });
    if (!course) return reply.status(404).send({ error: "Not found" });

    return prisma.course.update({
      where: { id },
      data: {
        ...body,
        semesterStart: body.semesterStart ? new Date(body.semesterStart) : undefined,
        semesterEnd: body.semesterEnd ? new Date(body.semesterEnd) : undefined,
      },
    });
  });

  app.delete("/courses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const course = await prisma.course.findFirst({ where: { id, userId: req.user.id } });
    if (!course) return reply.status(404).send({ error: "Not found" });

    await prisma.course.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Calendar events
  app.get("/calendar", async (req) => {
    const query = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).parse(req.query);

    return prisma.calendarEvent.findMany({
      where: {
        userId: req.user.id,
        ...(query.from || query.to
          ? {
              startAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startAt: "asc" },
    });
  });

  app.post("/calendar", async (req, reply) => {
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      isAllDay: z.boolean().optional(),
      categoryId: z.string().optional(),
    }).parse(req.body);

    const event = await prisma.calendarEvent.create({
      data: {
        ...body,
        userId: req.user.id,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
      },
    });
    return reply.status(201).send(event);
  });

  app.delete("/calendar/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const event = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user.id } });
    if (!event) return reply.status(404).send({ error: "Not found" });

    await prisma.calendarEvent.delete({ where: { id } });
    return reply.status(204).send();
  });
}
