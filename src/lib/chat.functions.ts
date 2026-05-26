import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAIText, currentDateAnchor, UserKeySchema } from "./ai-call.server";

export const entityChat = createServerFn({ method: "POST" })
  .inputValidator((d: { context: string; messages: { role: "user" | "assistant"; content: string }[]; userKey?: unknown }) =>
    z.object({
      context: z.string().min(1).max(40000),
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(20),
      userKey: UserKeySchema,
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const dt = currentDateAnchor();
    const system = `You are an expert supply-chain risk analyst chatting with a procurement / risk manager. The current date is ${dt.month} ${dt.year}. Answer ONLY using the JSON report context below; if unknown, say so and suggest where to look. Be concrete, cite metric names from the report when relevant, and keep answers under 200 words unless asked to expand.\n\n=== REPORT CONTEXT ===\n${data.context}`;
    const text = await callAIText({ userKey: data.userKey, system, messages: data.messages });
    return { text };
  });