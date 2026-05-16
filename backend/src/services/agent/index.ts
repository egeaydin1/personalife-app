import { prisma } from "../../lib/prisma.js";
import { chat, Message } from "../openrouter.js";
import { AGENT_TOOLS, executeTool } from "./tools.js";
import { getMemorySnapshot } from "./memory.js";

const BASE_SYSTEM_PROMPT = `You are a personal life assistant. Log the user's life accurately and ask smart follow-up questions.

## CRITICAL: Activity Logging
Call create_activity_log for EVERY activity the user mentions. Do NOT skip — save it.
Guess duration from context if not given; ask only if genuinely unclear.

Categories: okul, iş, sosyal, dijital, spor, kişisel, aile, dinlenme

## Duration inference rules
- "derse gittim" (no duration given) → ask: "Kaç saat sürdü?"
- "biraz çalıştım" → ask: "Ne kadar çalıştın? 30 dk mı, 1 saat mi?"
- "instagram baktım" → ask: "Kaç dakika?" (dijital süre önemli)
- "spor yaptım" → ask: "Kaç dakika? Ne yaptın?" (type + duration for sports)
- If duration mentioned explicitly → log it, don't ask

## Smart follow-up pattern
1. Log all mentioned activities first
2. Ask ONE question about the most important missing info:
   - Duration if activity lacks it and category is time-critical (okul, spor, dijital)
   - Person name if social activity but no name given
   - Mood/energy if it was a significant day
3. Never ask multiple questions at once

## Response format
"Kaydettim ✓ [brief list]. [Single follow-up question if needed]"

## Language
Always respond in the same language as the user (Turkish → Turkish, English → English).

## Deduplication
Before logging, mentally check if you already logged this exact activity in this conversation. Don't create duplicates.`;


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

  const [memorySnapshot, userSettings] = await Promise.all([
    getMemorySnapshot(userId),
    prisma.userSettings.findUnique({ where: { userId }, select: { customSystemPrompt: true, llmModel: true } }),
  ]);

  const customPart = userSettings?.customSystemPrompt
    ? `\n\n## User Custom Instructions\n${userSettings.customSystemPrompt}`
    : "";

  const systemMessage: Message = {
    role: "system",
    content: `${BASE_SYSTEM_PROMPT}${customPart}\n\n## Current Memory\n${memorySnapshot}${
      triggerContext ? `\n\n## Trigger Context\n${triggerContext}` : ""
    }`,
  };

  const messages: Message[] = [
    systemMessage,
    ...history,
    ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
  ];

  const model = userSettings?.llmModel ?? process.env.OPENROUTER_DEFAULT_MODEL;

  let response = await chat({
    model,
    messages,
    tools: AGENT_TOOLS,
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 800,
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
      model,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 800,
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
