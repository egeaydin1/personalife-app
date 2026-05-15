import { prisma } from "../lib/prisma.js";
import { getUpdates, sendMessage, getBotInfo, TelegramUpdate } from "../services/telegram.js";
import { runAgent } from "../services/agent/index.js";

let lastUpdateId = 0;

async function handleUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg?.text) return;

  const text = msg.text.trim();
  const chatId = msg.chat.id.toString();

  // /start <token> — link Telegram account to user
  const startMatch = text.match(/^\/start\s+(\S+)/);
  if (startMatch) {
    const token = startMatch[1];
    const integration = await prisma.integration.findFirst({
      where: {
        type: "TELEGRAM",
        status: "PENDING",
        config: { path: ["pendingToken"], equals: token },
      },
    });

    if (!integration) {
      await sendMessage(chatId, "⚠️ Geçersiz veya süresi dolmuş bağlantı. Personalife'ta yeni bir bağlantı oluştur.");
      return;
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: "ACTIVE",
        externalId: chatId,
        config: {
          ...(integration.config as object),
          username: msg.from?.username,
          firstName: msg.from?.first_name,
        },
        lastSyncAt: new Date(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: integration.userId },
      select: { name: true },
    });

    await sendMessage(
      chatId,
      `✅ *Personalife'a bağlandın!*\n\nMerhaba ${user?.name ?? msg.from?.first_name ?? ""}! Sana check-in hatırlatmaları ve haftalık özetler göndereceğim.\n\nDirekt mesaj yazarak da check-in yapabilirsin — hepsini kaydederim.`
    );
    console.log(`[telegram] user ${integration.userId} connected — chat ${chatId}`);
    return;
  }

  // Any other message from a connected user → forward to agent
  const integration = await prisma.integration.findFirst({
    where: { type: "TELEGRAM", status: "ACTIVE", externalId: chatId },
  });

  if (!integration) {
    await sendMessage(chatId, "Önce Personalife uygulamasında Telegram'ı bağlaman gerekiyor.");
    return;
  }

  try {
    const response = await runAgent({
      userId: integration.userId,
      userMessage: text,
      triggerContext: "Telegram check-in",
    });
    await sendMessage(chatId, response);
  } catch (err) {
    console.error("[telegram] agent error:", err);
    await sendMessage(chatId, "Bir hata oluştu — lütfen tekrar dene.");
  }
}

async function pollLoop() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not set — worker skipped");
    return;
  }

  const bot = await getBotInfo();
  if (!bot) {
    console.error("[telegram] could not connect to Telegram Bot API — check your token");
    return;
  }
  console.log(`[telegram] polling as @${bot.username}`);

  while (true) {
    try {
      const data = await getUpdates(lastUpdateId > 0 ? lastUpdateId + 1 : undefined);
      if (data?.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          await handleUpdate(update).catch(err =>
            console.error("[telegram] handle update error:", err)
          );
        }
      }
    } catch (err) {
      console.error("[telegram] poll error:", (err as Error).message);
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

export function startTelegramWorker() {
  pollLoop().catch(err => console.error("[telegram] fatal:", err));
}
