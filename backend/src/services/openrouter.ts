export type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];  // required when role=assistant and tool calls were made
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatOptions = {
  model?: string;
  messages: Message[];
  tools?: Tool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: false;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatResponse = {
  id: string;
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export async function chat(options: ChatOptions): Promise<ChatResponse> {
  const model = options.model ?? process.env.OPENROUTER_DEFAULT_MODEL ?? "anthropic/claude-3.5-sonnet";

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://personalife.app",
      "X-Title": "Personalife",
    },
    body: JSON.stringify({ ...options, model }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  return res.json() as Promise<ChatResponse>;
}
