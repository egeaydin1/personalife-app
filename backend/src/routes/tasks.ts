import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  courseId: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  estimatedMin: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  isMilestone: z.boolean().optional(),
  milestoneDate: z.string().datetime().optional().nullable(),
  sportUnit: z.string().optional().nullable(),
  sportTarget: z.number().optional().nullable(),
  dailyRepeat: z.boolean().optional(),
  repeatDays: z.array(z.number().min(0).max(6)).optional(),
});

const TASK_INCLUDE = {
  course: { select: { name: true, color: true } },
  category: { select: { id: true, name: true, color: true, icon: true } },
  subtasks: {
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  progressLogs: { orderBy: { createdAt: "desc" as const }, take: 1 },
};

export async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ── List tasks ──────────────────────────────────────────────
  app.get("/tasks", async (req) => {
    const query = z.object({
      status: z.string().optional(),
      categoryId: z.string().optional(),
      courseId: z.string().optional(),
      parentId: z.string().optional(),
      topLevel: z.coerce.boolean().optional(), // only root tasks (no parent)
    }).parse(req.query);

    return prisma.task.findMany({
      where: {
        userId: req.user.id,
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.categoryId === "uncategorized" ? { categoryId: null } : query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.parentId ? { parentId: query.parentId } : {}),
        ...(query.topLevel ? { parentId: null } : {}),
      },
      include: TASK_INCLUDE,
      orderBy: [{ isMilestone: "desc" }, { status: "asc" }, { priority: "desc" }, { deadline: "asc" }],
    });
  });

  // ── Create task ──────────────────────────────────────────────
  app.post("/tasks", async (req, reply) => {
    const body = taskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        ...body,
        userId: req.user.id,
        deadline: body.deadline ? new Date(body.deadline) : null,
        milestoneDate: body.milestoneDate ? new Date(body.milestoneDate) : null,
        repeatDays: body.repeatDays ?? [],
      },
      include: TASK_INCLUDE,
    });
    return reply.status(201).send(task);
  });

  // ── Update task ──────────────────────────────────────────────
  app.patch("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = taskSchema.partial().parse(req.body);
    const task = await prisma.task.findFirst({ where: { id, userId: req.user.id } });
    if (!task) return reply.status(404).send({ error: "Not found" });

    return prisma.task.update({
      where: { id },
      data: {
        ...body,
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
        milestoneDate: body.milestoneDate !== undefined ? (body.milestoneDate ? new Date(body.milestoneDate) : null) : undefined,
      },
      include: TASK_INCLUDE,
    });
  });

  // ── Delete task ──────────────────────────────────────────────
  app.delete("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findFirst({ where: { id, userId: req.user.id } });
    if (!task) return reply.status(404).send({ error: "Not found" });
    await prisma.task.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ── Progress log ─────────────────────────────────────────────
  app.post("/tasks/:id/progress", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ progress: z.number().min(0).max(100), note: z.string().optional() }).parse(req.body);
    const task = await prisma.task.findFirst({ where: { id, userId: req.user.id } });
    if (!task) return reply.status(404).send({ error: "Not found" });
    return reply.status(201).send(await prisma.taskProgressLog.create({ data: { taskId: id, ...body } }));
  });
}
