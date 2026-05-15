import { prisma } from "../../lib/prisma.js";
import { chat, Message } from "../openrouter.js";
import { AGENT_TOOLS, executeTool } from "./tools.js";
import { getMemorySnapshot } from "./memory.js";

const SYSTEM_PROMPT = `You are a personal life assistant. Your job is to help the user log and understand their daily life.

## CRITICAL: Activity Logging
When the user describes ANY activity, event, or thing they did, you MUST call create_activity_log immediately.
Do NOT just acknowledge — actually save it.

Examples of when to call create_activity_log:
- "bugün derse gittim" → create_activity_log(title="Ders", categoryName="okul", durationMin=90)
- "instagram 30 dakika baktım" → create_activity_log(title="Instagram", categoryName="dijital", durationMin=30)
- "mia ile kahve içtim" → create_activity_log(title="Mia ile kahve", categoryName="sosyal")
- "matematik ödevimi yaptım" → create_activity_log(title="Matematik ödevi", categoryName="okul")
- "spor yaptım" → create_activity_log(title="Spor", categoryName="spor")
- "aile yemeği yedik" → create_activity_log(title="Aile yemeği", categoryName="aile")

Category names to use: okul, iş, sosyal, dijital, spor, kişisel, aile, dinlenme

## Other tool usage
- Use get_active_tasks, get_upcoming_calendar_events etc. when the user asks about their data
- Use get_recent_activity_logs to check what was already logged today

## Conversation style
- Warm, concise, conversational
- After logging, briefly confirm what was saved
- Ask ONE follow-up question if something was unclear
- Ask about things NOT yet mentioned (people, duration, mood)
- Respond in the same language the user writes in (Turkish or English)
- NEVER say "I'll log that" — just DO it and confirm

## Format of confirmations
After saving activities, say something like:
"Kaydettim ✓ [kısa özet]. [Opsiyonel follow-up soru]"`;


export type AgentRunOptions = {
  userId: string;
  checkinId?: string;
  triggerId?: string;
  triggerContext?: string;
  userMessage?: string;
  history?: Message[];
};

export async function runAgent(options: AgentRunOptions): Promise<string> {
  const { userId, checkinId, triggerId, triggerContext, userMessage, history = [] } = options;

  const memorySnapshot = await getMemorySnapshot(userId);

  const systemMessage: Message = {
    role: "system",
    content: `${SYSTEM_PROMPT}\n\n## Current Context\n${memorySnapshot}${
      triggerContext ? `\n\n## Trigger Context\n${triggerContext}` : ""
    }`,
  };

  const messages: Message[] = [
    systemMessage,
    ...history,
    ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
  ];

  let response = await chat({
    messages,
    tools: AGENT_TOOLS,
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 1000,
  });

  let assistantMsg = response.choices[0].message;

  // Agentic tool-call loop
  while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    const toolResults: Message[] = [];

    for (const call of assistantMsg.tool_calls) {
      let result: unknown;
      try {
        const args = JSON.parse(call.function.arguments);
        result = await executeTool(call.function.name, args, userId);
      } catch (err) {
        result = { error: (err as Error).message };
      }

      await prisma.agentMessage.create({
        data: {
          userId,
          checkinId,
          triggerId,
          role: "TOOL",
          content: JSON.stringify(result),
          toolCalls: [call],
        },
      });

      toolResults.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: call.id,
      });
    }

    // Must include tool_calls in assistant message for OpenAI compatibility
    messages.push(
      {
        role: "assistant",
        content: assistantMsg.content ?? null,
        tool_calls: assistantMsg.tool_calls,
      },
      ...toolResults
    );

    response = await chat({
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1000,
    });

    assistantMsg = response.choices[0].message;
  }

  const finalContent = assistantMsg.content ?? "";

  await prisma.agentMessage.create({
    data: {
      userId,
      checkinId,
      triggerId,
      role: "ASSISTANT",
      content: finalContent,
    },
  });

  return finalContent;
}
