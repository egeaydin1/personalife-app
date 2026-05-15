import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

// Predefined system category templates
const SYSTEM_TEMPLATES = [
  { name: "Okul",           color: "#5B8CFF", icon: "school",   isSystem: true },
  { name: "İş",             color: "#F59E0B", icon: "zap",      isSystem: true },
  { name: "Sosyal",         color: "#F472B6", icon: "users",    isSystem: true },
  { name: "Spor",           color: "#A3E635", icon: "heart",    isSystem: true },
  { name: "Kişisel",        color: "#8B5CF6", icon: "sparkles", isSystem: true },
  { name: "Sağlık",         color: "#22D3EE", icon: "heart",    isSystem: true },
  { name: "Aile",           color: "#F59E0B", icon: "users",    isSystem: true },
  { name: "Alışveriş",      color: "#EF4444", icon: "filter",   isSystem: true },
];

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // List user's categories + system templates as suggestions
  app.get("/categories", async (req) => {
    const userCats = await prisma.activityCategory.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { tasks: true, activityLogs: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { categories: userCats, templates: SYSTEM_TEMPLATES };
  });

  // Create a new category (from template or custom)
  app.post("/categories", async (req, reply) => {
    const body = z.object({
      name: z.string().min(1).max(50),
      color: z.string().optional(),
      icon: z.string().optional(),
    }).parse(req.body);

    // Prevent duplicates
    const existing = await prisma.activityCategory.findFirst({
      where: { userId: req.user.id, name: body.name },
    });
    if (existing) return reply.status(409).send({ error: "Bu kategori zaten mevcut" });

    const cat = await prisma.activityCategory.create({
      data: { ...body, userId: req.user.id },
    });
    return reply.status(201).send(cat);
  });

  app.patch("/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      name: z.string().min(1).max(50).optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }).parse(req.body);

    const cat = await prisma.activityCategory.findFirst({ where: { id, userId: req.user.id } });
    if (!cat) return reply.status(404).send({ error: "Not found" });

    return prisma.activityCategory.update({ where: { id }, data: body });
  });

  app.delete("/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const cat = await prisma.activityCategory.findFirst({ where: { id, userId: req.user.id } });
    if (!cat) return reply.status(404).send({ error: "Not found" });

    // Unlink tasks before deleting
    await prisma.task.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.activityCategory.delete({ where: { id } });
    return reply.status(204).send();
  });
}
