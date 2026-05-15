import { prisma } from "../../lib/prisma.js";
import { chat, Message } from "../openrouter.js";
import { AGENT_TOOLS, executeTool } from "./tools.js";
import { getMemorySnapshot } from "./memory.js";

const SYSTEM_PROMPT = `You are a personal life assistant for the user. You help them track their daily activities, school schedule, tasks, and social relationships.

You have access to tools to fetch the user's data. Always use tools when you need current information instead of guessing.

Guidelines:
- Be warm, concise, and conversational
- Ask one follow-up question at a time, not multiple at once
- When the user describes activities, extract structured data and save it using create_activity_log
- If the user mentions people, note them for friend memory purposes
- If something is unclear, ask for clarification
- Respond in the same language the user writes in (Turkish or English)`;

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

    messages.push(
      { role: "assistant", content: assistantMsg.content ?? "" },
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
