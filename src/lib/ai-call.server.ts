import { z } from "zod";

export type AIProvider =
  | "lovable"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "nvidia"
  | "deepseek";

export type UserKey = { provider: AIProvider; key?: string; model?: string } | undefined;

export const UserKeySchema = z
  .object({
    provider: z.enum([
      "lovable",
      "openai",
      "anthropic",
      "gemini",
      "openrouter",
      "nvidia",
      "deepseek",
    ]),
    key: z.string().min(10).max(400).optional(),
    model: z.string().max(120).optional(),
  })
  .optional();

const DEFAULT_MODELS: Record<AIProvider, string> = {
  lovable: "google/gemini-3-flash-preview",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  gemini: "gemini-2.5-flash",
  openrouter: "anthropic/claude-3.5-sonnet",
  nvidia: "meta/llama-3.1-70b-instruct",
  deepseek: "deepseek-chat",
};

const OPENAI_COMPAT_BASE: Partial<Record<AIProvider, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
};

/**
 * Unified tool-call helper. Returns the parsed JSON arguments emitted by the model
 * for the requested function name. Supports Lovable AI gateway (OpenAI-compatible),
 * OpenAI direct, and Anthropic direct.
 */
export async function callAIStructured(opts: {
  userKey?: UserKey;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  parameters: Record<string, unknown>;
}): Promise<unknown> {
  const { userKey, system, user, toolName, toolDescription, parameters } = opts;
  const provider: AIProvider = userKey?.provider ?? "lovable";
  const model = userKey?.model || DEFAULT_MODELS[provider];

  if (provider === "anthropic" && userKey?.key) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": userKey.key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system,
        messages: [{ role: "user", content: user }],
        tools: [{ name: toolName, description: toolDescription, input_schema: parameters }],
        tool_choice: { type: "tool", name: toolName },
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    const block = (j.content as Array<{ type: string; name?: string; input?: unknown }>)?.find(
      (b) => b.type === "tool_use" && b.name === toolName
    );
    if (!block?.input) throw new Error("Anthropic returned no tool_use block");
    return block.input;
  }

  // OpenAI-compatible providers (OpenAI, Gemini, OpenRouter, NVIDIA NIM, DeepSeek) + Lovable gateway
  let url: string;
  let auth: string;
  const compatUrl = OPENAI_COMPAT_BASE[provider];
  if (compatUrl && userKey?.key) {
    url = compatUrl;
    auth = `Bearer ${userKey.key}`;
  } else {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    url = "https://ai.gateway.lovable.dev/v1/chat/completions";
    auth = `Bearer ${apiKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: { name: toolName, description: toolDescription, parameters },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings or use your own API key.");
    if (res.status === 401) throw new Error(`${provider} key rejected (401). Check your key in Settings.`);
    throw new Error(`${provider} gateway error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No structured tool call returned");
  return JSON.parse(call.function.arguments);
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export function currentDateAnchor() {
  const d = new Date();
  return {
    iso: d.toISOString().slice(0, 10),
    month: MONTHS[d.getMonth()],
    year: d.getFullYear(),
    ym: d.toISOString().slice(0, 7),
  };
}