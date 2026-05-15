const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
};

export async function sendMessage(chatId: string, text: string, parseMode: "Markdown" | "HTML" = "Markdown") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`${BASE()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

export async function getUpdates(offset?: number): Promise<{ ok: boolean; result: TelegramUpdate[] } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const url = `${BASE()}/getUpdates?timeout=25&allowed_updates=message${offset ? `&offset=${offset}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    return res.json() as Promise<{ ok: boolean; result: TelegramUpdate[] }>;
  } catch {
    return null;
  }
}

export async function getBotInfo(): Promise<{ username: string; first_name: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${BASE()}/getMe`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.result ?? null;
  } catch {
    return null;
  }
}
