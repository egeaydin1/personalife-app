import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { format } from "date-fns";

// ── ICS helpers ──────────────────────────────────────────────
function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, "\\n");
}

function dtUtc(d: Date): string {
  return format(d, "yyyyMMdd'T'HHmmss'Z'");
}

function buildIcs(userId: string, name: string | null, events: any[], courses: any[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Personalife//Life OS//TR",
    `X-WR-CALNAME:${escapeIcs(`Personalife — ${name ?? "Hayat"}`)}`,
    "X-WR-TIMEZONE:Europe/Istanbul",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  // Calendar events
  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:event-${ev.id}@personalife`,
      `DTSTAMP:${dtUtc(new Date())}`,
      `DTSTART:${dtUtc(new Date(ev.startAt))}`,
      `DTEND:${dtUtc(new Date(ev.endAt))}`,
      `SUMMARY:${escapeIcs(ev.title)}`,
    );
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    lines.push("END:VEVENT");
  }

  // Course occurrences for the next 90 days
  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 86400000);
  for (const c of courses) {
    for (const dow of c.daysOfWeek as number[]) {
      // Find next occurrence
      let d = new Date(now);
      d.setHours(0, 0, 0, 0);
      while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      while (d <= horizon && d <= new Date(c.semesterEnd)) {
        if (d >= new Date(c.semesterStart)) {
          const start = new Date(d); start.setHours(sh, sm, 0, 0);
          const end = new Date(d); end.setHours(eh, em, 0, 0);
          lines.push(
            "BEGIN:VEVENT",
            `UID:course-${c.id}-${start.toISOString()}@personalife`,
            `DTSTAMP:${dtUtc(new Date())}`,
            `DTSTART:${dtUtc(start)}`,
            `DTEND:${dtUtc(end)}`,
            `SUMMARY:${escapeIcs(c.name)}${c.room ? ` · ${escapeIcs(c.room)}` : ""}`,
            "CATEGORIES:Course",
            "END:VEVENT",
          );
        }
        d.setDate(d.getDate() + 7);
      }
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export async function integrationRoutes(app: FastifyInstance) {
  // ── Public iCal endpoint (token-based, no auth header) ────
  app.get("/ical/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const user = await prisma.user.findUnique({
      where: { icalToken: token },
      select: { id: true, name: true },
    });
    if (!user) return reply.status(404).send({ error: "Invalid token" });

    const [events, courses] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { userId: user.id } }),
      prisma.course.findMany({ where: { userId: user.id } }),
    ]);

    const ics = buildIcs(user.id, user.name, events, courses);
    reply.header("Content-Type", "text/calendar; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="personalife.ics"`);
    return reply.send(ics);
  });

  // ── Authenticated integration management ──────────────────
  app.addHook("preHandler", async (req, reply) => {
    // Skip auth for /ical/:token
    if (req.url.startsWith("/api/v1/ical/")) return;
    await authenticate(req, reply);
  });

  app.get("/integrations", async (req) => {
    const ints = await prisma.integration.findMany({
      where: { userId: req.user.id },
      select: { id: true, type: true, status: true, externalId: true, lastSyncAt: true, createdAt: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { icalToken: true },
    });
    return { integrations: ints, icalToken: user?.icalToken };
  });

  app.post("/integrations/ical/regenerate", async (req) => {
    const newToken = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({ where: { id: req.user.id }, data: { icalToken: newToken } });
    return { icalToken: newToken };
  });

  // Stubs for Telegram / Google — wired up in next commit
  app.post("/integrations/telegram/start", async (req, reply) => {
    return reply.status(501).send({ error: "Telegram entegrasyonu yakında — sonraki sürümde aktif olacak." });
  });

  app.post("/integrations/google/start", async (req, reply) => {
    return reply.status(501).send({ error: "Google Calendar entegrasyonu yakında — sonraki sürümde aktif olacak." });
  });

  app.delete("/integrations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const integration = await prisma.integration.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!integration) return reply.status(404).send({ error: "Not found" });

    await prisma.integration.delete({ where: { id } });
    return reply.status(204).send();
  });
}
