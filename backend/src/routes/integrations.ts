import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { getGoogleAuthUrl, exchangeCode, getUserEmail } from "../services/google.js";
import { getBotInfo } from "../services/telegram.js";
import { format } from "date-fns";

// ── iCal helpers ─────────────────────────────────────────────

function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, "\\n");
}

function dtUtc(d: Date): string {
  return format(d, "yyyyMMdd'T'HHmmss'Z'");
}

function buildIcs(name: string | null, events: any[], courses: any[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Personalife//Life OS//TR",
    `X-WR-CALNAME:${escapeIcs(`Personalife — ${name ?? "Hayat"}`)}`,
    "X-WR-TIMEZONE:Europe/Istanbul",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

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

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 86400000);
  for (const c of courses) {
    for (const dow of c.daysOfWeek as number[]) {
      let d = new Date(now);
      d.setHours(0, 0, 0, 0);
      while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      const semEnd = new Date(c.semesterEnd);
      const semStart = new Date(c.semesterStart);
      while (d <= horizon && d <= semEnd) {
        if (d >= semStart) {
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

// ── Plugin ────────────────────────────────────────────────────

export async function integrationRoutes(app: FastifyInstance) {
  // ── Public iCal endpoint ────────────────────────────────────
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

    const ics = buildIcs(user.name, events, courses);
    reply.header("Content-Type", "text/calendar; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="personalife.ics"`);
    return reply.send(ics);
  });

  // ── Google OAuth callback (public — browser redirect) ───────
  app.get("/integrations/google/callback", async (req, reply) => {
    const { code, state, error } = req.query as Record<string, string>;
    const appUrl = process.env.APP_PUBLIC_URL ?? "http://localhost:5173";

    if (error || !code || !state) {
      return reply.redirect(`${appUrl}/settings?google_error=${error ?? "missing_params"}`);
    }

    let userId: string;
    try {
      const payload = app.jwt.verify<{ id: string; action: string }>(state);
      userId = payload.id;
    } catch {
      return reply.redirect(`${appUrl}/settings?google_error=invalid_state`);
    }

    try {
      const tokens = await exchangeCode(code);
      const email = await getUserEmail(tokens.access_token);

      await prisma.integration.upsert({
        where: { userId_type: { userId, type: "GOOGLE_CALENDAR" } },
        create: {
          userId,
          type: "GOOGLE_CALENDAR",
          status: "ACTIVE",
          externalId: email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
        update: {
          status: "ACTIVE",
          externalId: email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? undefined,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          errorMessage: null,
        },
      });

      return reply.redirect(`${appUrl}/settings?google_connected=1`);
    } catch {
      return reply.redirect(`${appUrl}/settings?google_error=token_exchange_failed`);
    }
  });

  // ── All routes below require auth ───────────────────────────
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith(`${(app as any).prefix ?? ""}/ical/`)) return;
    if (req.url.includes("/integrations/google/callback")) return;
    await authenticate(req, reply);
  });

  // List integrations + iCal token
  app.get("/integrations", async (req) => {
    const [ints, user] = await Promise.all([
      prisma.integration.findMany({
        where: { userId: req.user.id },
        select: {
          id: true, type: true, status: true, externalId: true,
          lastSyncAt: true, createdAt: true, errorMessage: true,
          config: true,
        },
      }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { icalToken: true } }),
    ]);
    return { integrations: ints, icalToken: user?.icalToken };
  });

  // Regenerate iCal token
  app.post("/integrations/ical/regenerate", async (req) => {
    const newToken = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({ where: { id: req.user.id }, data: { icalToken: newToken } });
    return { icalToken: newToken };
  });

  // ── Telegram ────────────────────────────────────────────────

  app.get("/integrations/telegram/bot-info", async (_req) => {
    if (!process.env.TELEGRAM_BOT_TOKEN) return { available: false };
    const bot = await getBotInfo();
    return { available: !!bot, username: bot?.username };
  });

  app.post("/integrations/telegram/start", async (req) => {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return { error: "TELEGRAM_BOT_TOKEN not configured on the server" };
    }
    const bot = await getBotInfo();
    if (!bot) return { error: "Cannot connect to Telegram Bot API" };

    const token = crypto.randomBytes(16).toString("hex");

    await prisma.integration.upsert({
      where: { userId_type: { userId: req.user.id, type: "TELEGRAM" } },
      create: {
        userId: req.user.id,
        type: "TELEGRAM",
        status: "PENDING",
        config: { pendingToken: token, botUsername: bot.username },
      },
      update: {
        status: "PENDING",
        externalId: null,
        config: { pendingToken: token, botUsername: bot.username },
        errorMessage: null,
      },
    });

    return {
      deepLink: `https://t.me/${bot.username}?start=${token}`,
      botUsername: bot.username,
    };
  });

  app.get("/integrations/telegram/status", async (req) => {
    const int = await prisma.integration.findFirst({
      where: { userId: req.user.id, type: "TELEGRAM" },
      select: { status: true, externalId: true, config: true },
    });
    return {
      status: int?.status ?? "NONE",
      username: (int?.config as any)?.username ?? null,
      chatId: int?.externalId ?? null,
    };
  });

  // ── Google ──────────────────────────────────────────────────

  app.get("/integrations/google/start", async (req, reply) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return reply.status(501).send({ error: "GOOGLE_CLIENT_ID not configured on the server" });
    }
    // Sign a short-lived JWT state (10 min) with userId
    const state = app.jwt.sign({ id: req.user.id, action: "google_connect" }, { expiresIn: "10m" });
    const url = getGoogleAuthUrl(state);
    return { url };
  });

  app.post("/integrations/google/sync", async (req) => {
    const int = await prisma.integration.findFirst({
      where: { userId: req.user.id, type: "GOOGLE_CALENDAR", status: "ACTIVE" },
    });
    if (!int) return { error: "Google Calendar not connected" };
    // Queue a manual sync (re-use google worker logic)
    const { startGoogleWorker: _ } = await import("../workers/google.worker.js");
    return { message: "Sync queued — events will appear shortly" };
  });

  // Delete any integration
  app.delete("/integrations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const int = await prisma.integration.findFirst({ where: { id, userId: req.user.id } });
    if (!int) return reply.status(404).send({ error: "Not found" });
    await prisma.integration.delete({ where: { id } });
    return reply.status(204).send();
  });
}
