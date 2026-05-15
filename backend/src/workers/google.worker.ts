import { prisma } from "../lib/prisma.js";
import { listEvents, refreshAccessToken } from "../services/google.js";
import { addDays } from "date-fns";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function getValidToken(integration: any): Promise<string | null> {
  const needsRefresh = !integration.accessToken || (
    integration.expiresAt && new Date(integration.expiresAt) < addDays(new Date(), 0)
  );

  if (needsRefresh && integration.refreshToken) {
    try {
      const tokens = await refreshAccessToken(integration.refreshToken);
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      return tokens.access_token;
    } catch (err) {
      console.error(`[google] token refresh failed for user ${integration.userId}:`, err);
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: "ERROR", errorMessage: "Token refresh failed" },
      });
      return null;
    }
  }

  return integration.accessToken;
}

async function syncUser(integration: any) {
  const accessToken = await getValidToken(integration);
  if (!accessToken) return;

  const now = new Date();
  const future = addDays(now, 60);

  let data: { items: any[] };
  try {
    data = await listEvents(accessToken, now.toISOString(), future.toISOString());
  } catch (err: any) {
    // 401 = token revoked
    if (err.message?.includes("401")) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: "ERROR", errorMessage: "Token revoked — reconnect required" },
      });
    }
    throw err;
  }

  let synced = 0;
  for (const ev of data.items ?? []) {
    const startRaw = ev.start?.dateTime ?? ev.start?.date;
    const endRaw = ev.end?.dateTime ?? ev.end?.date;
    if (!startRaw) continue;

    const startAt = new Date(startRaw);
    const endAt = endRaw ? new Date(endRaw) : addDays(startAt, 1);
    const isAllDay = !ev.start?.dateTime;

    try {
      await prisma.calendarEvent.upsert({
        where: {
          unique_user_external_event: {
            userId: integration.userId,
            externalId: ev.id,
          },
        },
        create: {
          userId: integration.userId,
          title: ev.summary ?? "(Google event)",
          description: ev.description ?? null,
          startAt,
          endAt,
          isAllDay,
          source: "google",
          externalId: ev.id,
        },
        update: {
          title: ev.summary ?? "(Google event)",
          description: ev.description ?? null,
          startAt,
          endAt,
          isAllDay,
        },
      });
      synced++;
    } catch {
      // skip conflicts silently
    }
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date(), status: "ACTIVE", errorMessage: null },
  });

  console.log(`[google] synced ${synced} events for user ${integration.userId}`);
}

async function syncAll() {
  if (!process.env.GOOGLE_CLIENT_ID) return;

  const integrations = await prisma.integration.findMany({
    where: { type: "GOOGLE_CALENDAR", status: { in: ["ACTIVE", "ERROR"] } },
    select: { id: true, userId: true, accessToken: true, refreshToken: true, expiresAt: true, status: true },
  });

  for (const int of integrations) {
    await syncUser(int).catch(err =>
      console.error(`[google] sync error for user ${int.userId}:`, (err as Error).message)
    );
  }
}

export function startGoogleWorker() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log("[google] GOOGLE_CLIENT_ID not set — Google Calendar sync skipped");
    return;
  }

  console.log("[google] Calendar sync worker started (30 min interval)");
  syncAll();
  setInterval(syncAll, SYNC_INTERVAL_MS);
}
