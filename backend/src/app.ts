import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import path from "path";
import { errorHandler } from "./middleware/error.js";
import { authRoutes } from "./routes/auth.js";
import { taskRoutes } from "./routes/tasks.js";
import { checkinRoutes } from "./routes/checkin.js";
import { scheduleRoutes } from "./routes/schedule.js";
import { friendRoutes } from "./routes/friends.js";
import { screenTimeRoutes } from "./routes/screentime.js";
import { agentRoutes } from "./routes/agent.js";
import { reportRoutes } from "./routes/reports.js";
import { integrationRoutes } from "./routes/integrations.js";
import { categoryRoutes } from "./routes/categories.js";

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === "development"
      ? { level: "info" }
      : { level: "warn" },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  });
  await app.register(jwt, { secret: process.env.JWT_SECRET! });
  await app.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "10") * 1024 * 1024,
    },
  });

  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads";
  await app.register(staticFiles, {
    root: uploadDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(taskRoutes, { prefix: "/api/v1" });
  await app.register(checkinRoutes, { prefix: "/api/v1" });
  await app.register(scheduleRoutes, { prefix: "/api/v1" });
  await app.register(friendRoutes, { prefix: "/api/v1" });
  await app.register(screenTimeRoutes, { prefix: "/api/v1" });
  await app.register(agentRoutes, { prefix: "/api/v1" });
  await app.register(reportRoutes, { prefix: "/api/v1" });
  await app.register(integrationRoutes, { prefix: "/api/v1" });
  await app.register(categoryRoutes, { prefix: "/api/v1" });
  await app.register((await import("./routes/activitylogs.js")).activityLogRoutes, { prefix: "/api/v1" });

  return app;
}
