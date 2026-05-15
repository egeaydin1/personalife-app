import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  courseId: z.string().optional(),
  goalId: z.string().optional(),
  deadline: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  estimatedMin: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/tasks", async (req) => {
    const query = z.object({
      status: z.string().optional(),
      courseId: z.string().optional(),
    }).parse(req.query);

    return prisma.task.findMany({
      where: {
        userId: req.user.id,
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.courseId ? { courseId: query.courseId } : {}),
      },
      include: {
        course: { select: { name: true, color: true } },
        progressLogs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { deadline: "asc" }],
    });
  });

  app.post("/tasks", async (req, reply) => {
    const body = taskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: { ...body, userId: req.user.id, deadline: body.deadline ? new Date(body.deadline) : undefined },
    });
    return reply.status(201).send(task);
  });

  app.patch("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = taskSchema.partial().parse(req.body);

    const task = await prisma.task.findFirst({ where: { id, userId: req.user.id } });
    if (!task) return reply.status(404).send({ error: "Not found" });

    return prisma.task.update({
      where: { id },
      data: { ...body, deadline: body.deadline ? new Date(body.deadline) : undefined },
    });
  });

  app.delete("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findFirst({ where: { id, userId: req.user.id } });
    if (!task) return reply.status(404).send({ error: "Not found" });

    await prisma.task.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.post("/tasks/:id/progress", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ progress: z.number().min(0).max(100), note: z.string().optional() }).parse(req.body);

    const task = await prisma.task.findFirst({ where: { id, userId: req.user.id } });
    if (!task) return reply.status(404).send({ error: "Not found" });

    return reply.status(201).send(
      await prisma.taskProgressLog.create({ data: { taskId: id, ...body } })
    );
  });
}
