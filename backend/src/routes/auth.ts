import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  timezone: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

const onboardingSchema = z.object({
  ageRange: z.string().optional(),
  role: z.string().optional(),
  city: z.string().optional(),
  school: z.string().optional(),
  major: z.string().optional(),
  jobTitle: z.string().optional(),
  workMode: z.string().optional(),
  dailyRoutine: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  wakeTime: z.string().optional(),
  sleepTime: z.string().optional(),
  peakHours: z.string().optional(),
  agentContactPref: z.string().optional(),
  agentTone: z.string().optional(),
  goals: z.array(z.object({ title: z.string(), description: z.string().optional() })).optional(),
});

function signToken(app: FastifyInstance, payload: { id: string; email: string }, rememberMe?: boolean) {
  const expiresIn = rememberMe ? "30d" : (process.env.JWT_EXPIRES_IN ?? "7d");
  return app.jwt.sign(payload, { expiresIn });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.status(409).send({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        timezone: body.timezone ?? "Europe/Istanbul",
        icalToken: crypto.randomBytes(24).toString("hex"),
        settings: { create: {} },
      },
    });

    const token = signToken(app, { id: user.id, email: user.email }, body.rememberMe);
    return reply.status(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, onboardingCompletedAt: user.onboardingCompletedAt },
    });
  });

  app.post("/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.status(401).send({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: "Invalid credentials" });

    const token = signToken(app, { id: user.id, email: user.email }, body.rememberMe);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, onboardingCompletedAt: user.onboardingCompletedAt },
    };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true, timezone: true, settings: true,
        ageRange: true, role: true, city: true, school: true, major: true,
        jobTitle: true, workMode: true, dailyRoutine: true, focusAreas: true,
        wakeTime: true, sleepTime: true, peakHours: true,
        agentContactPref: true, agentTone: true, onboardingCompletedAt: true,
        icalToken: true,
      },
    });
    return user;
  });

  app.patch("/auth/me", { preHandler: authenticate }, async (req, reply) => {
    const body = z.object({
      name: z.string().optional(),
      timezone: z.string().optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: body,
      select: { id: true, email: true, name: true, timezone: true },
    });
    return user;
  });

  // ── Onboarding ────────────────────────────────────────────
  app.post("/auth/onboarding", { preHandler: authenticate }, async (req, reply) => {
    const body = onboardingSchema.parse(req.body);
    const { goals, ...userData } = body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...userData,
        onboardingCompletedAt: new Date(),
      },
    });

    // Create goals if provided
    if (goals && goals.length > 0) {
      await prisma.goal.createMany({
        data: goals
          .filter(g => g.title.trim())
          .map(g => ({ userId: req.user.id, title: g.title, description: g.description })),
      });
    }

    return reply.status(200).send({
      user: { id: user.id, onboardingCompletedAt: user.onboardingCompletedAt },
    });
  });
}
