import { FastifyInstance } from "fastify";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { getOcrQueue } from "../lib/queue.js";
import { format } from "date-fns";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/uploads";

export async function screenTimeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/screen-time", async (req) => {
    const query = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(req.query);

    return prisma.screenTimeUpload.findMany({
      where: {
        userId: req.user.id,
        ...(query.from || query.to ? {
          date: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        } : {}),
      },
      include: { entries: true },
      orderBy: { date: "desc" },
    });
  });

  // Upload a screenshot — returns job ID immediately, processes async
  app.post("/screen-time/upload", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file provided" });

    const maxBytes = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "10") * 1024 * 1024;
    const body = data.fields as Record<string, { value: string }>;
    const dateStr = body?.date?.value ?? format(new Date(), "yyyy-MM-dd");

    const userDir = path.join(UPLOAD_DIR, req.user.id);
    await fs.mkdir(userDir, { recursive: true });

    const filename = `${Date.now()}-${data.filename}`;
    const storagePath = path.join(userDir, filename);

    const fileBuffer = await data.toBuffer();
    if (fileBuffer.length > maxBytes) {
      return reply.status(413).send({ error: "File too large" });
    }

    await fs.writeFile(storagePath, fileBuffer);

    const upload = await prisma.screenTimeUpload.create({
      data: {
        userId: req.user.id,
        filename: data.filename,
        storagePath,
        date: new Date(dateStr),
        status: "PENDING",
      },
    });

    const queue = getOcrQueue();
    const job = await queue.add("process", {
      uploadId: upload.id,
      storagePath,
      userId: req.user.id,
    });

    await prisma.screenTimeUpload.update({
      where: { id: upload.id },
      data: { jobId: job.id?.toString() },
    });

    return reply.status(202).send({ uploadId: upload.id, jobId: job.id, status: "PENDING" });
  });

  app.get("/screen-time/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const upload = await prisma.screenTimeUpload.findFirst({
      where: { id, userId: req.user.id },
      include: { entries: true },
    });
    if (!upload) return reply.status(404).send({ error: "Not found" });
    return upload;
  });

  app.delete("/screen-time/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const upload = await prisma.screenTimeUpload.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!upload) return reply.status(404).send({ error: "Not found" });

    // Delete file and DB record
    await fs.unlink(upload.storagePath).catch(() => {});
    await prisma.screenTimeUpload.delete({ where: { id } });
    return reply.status(204).send();
  });
}
