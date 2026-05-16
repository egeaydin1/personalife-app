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

  // ── Course Attendance ────────────────────────────────────────

  // Get attendance for a date range
  app.get("/courses/attendance", async (req) => {
    const query = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      courseId: z.string().optional(),
    }).parse(req.query);

    return prisma.courseAttendance.findMany({
      where: {
        userId: req.user.id,
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.from || query.to ? {
          date: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        } : {}),
      },
      include: { course: { select: { name: true, color: true } } },
      orderBy: { date: "desc" },
    });
  });

  // Get today's pending attendance (courses that ended but not yet marked)
  app.get("/courses/attendance/pending", async (req) => {
    const now = new Date();
    const today = new Date(now.toISOString().split("T")[0]);
    const currentH = now.getHours() + now.getMinutes() / 60;
    const todayDow = now.getDay();

    const courses = await prisma.course.findMany({
      where: {
        userId: req.user.id,
        daysOfWeek: { has: todayDow },
        semesterStart: { lte: today },
        semesterEnd: { gte: today },
      },
    });

    const pending = [];
    for (const c of courses) {
      const [eh, em] = c.endTime.split(":").map(Number);
      const endH = eh + em / 60;
      if (currentH > endH + 0.25) { // at least 15 min after class ends
        const existing = await prisma.courseAttendance.findUnique({
          where: { courseId_date: { courseId: c.id, date: today } },
        });
        if (!existing) {
          pending.push({ course: c, date: today.toISOString() });
        }
      }
    }
    return { pending };
  });

  // Mark attendance
  app.post("/courses/attendance", async (req, reply) => {
    const body = z.object({
      courseId: z.string(),
      date: z.string(),
      attended: z.boolean(),
      notes: z.string().optional(),
    }).parse(req.body);

    const course = await prisma.course.findFirst({ where: { id: body.courseId, userId: req.user.id } });
    if (!course) return reply.status(404).send({ error: "Course not found" });

    const date = new Date(body.date);

    const record = await prisma.courseAttendance.upsert({
      where: { courseId_date: { courseId: body.courseId, date } },
      create: { userId: req.user.id, courseId: body.courseId, date, attended: body.attended, notes: body.notes },
      update: { attended: body.attended, notes: body.notes },
    });

    // Log to activity log
    if (body.attended) {
      const cat = await prisma.activityCategory.findFirst({ where: { userId: req.user.id, name: "okul" } });
      const [sh, sm] = course.startTime.split(":").map(Number);
      const [eh, em] = course.endTime.split(":").map(Number);
      const durationMin = (eh * 60 + em) - (sh * 60 + sm);
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          title: `${course.name} — ders`,
          durationMin,
          categoryId: cat?.id,
          source: "manual",
        },
      });
    }

    return reply.status(201).send(record);
  });

  // Summary: attendance rate per course
  app.get("/courses/attendance/summary", async (req) => {
    const courses = await prisma.course.findMany({
      where: { userId: req.user.id },
      include: { attendance: true },
    });

    return courses.map(c => ({
      courseId: c.id,
      courseName: c.name,
      color: c.color,
      total: c.attendance.length,
      attended: c.attendance.filter(a => a.attended).length,
      missed: c.attendance.filter(a => !a.attended).length,
      rate: c.attendance.length > 0
        ? Math.round((c.attendance.filter(a => a.attended).length / c.attendance.length) * 100)
        : null,
    }));
  });
}
