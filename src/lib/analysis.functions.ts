import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalysisSchema = z.object({
  commodity: z.string(),
  overview: z.string(),
  risk_score: z.number().min(0).max(100),
  risk_label: z.enum(["Low", "Moderate", "High", "Extreme"]),
  current_price: z.object({
    value: z.number(),
    unit: z.string(),
    as_of: z.string(),
  }),
  price_history: z.array(z.object({ period: z.string(), price: z.number() })),
  forecast: z.array(z.object({ period: z.string(), price: z.number() })),
  sourcing: z.array(
    z.object({
      country: z.string(),
      iso3: z.string(),
      share_pct: z.number(),
      risk_score: z.number().min(0).max(100),
      note: z.string(),
    })
  ),
  concentration: z.object({
    top3_countries_pct: z.number(),
    top3_companies_pct: z.number(),
    top_companies: z.array(z.string()),
    hhi: z.number().optional(),
    commentary: z.string(),
  }),
  short_term_risk: z.string(),
  long_term_risk: z.string(),
  recommendation: z.object({
    action: z.enum(["Hedge now", "Buy now", "Buy later", "Hold"]),
    rationale: z.string(),
    confidence: z.enum(["Low", "Medium", "High"]),
  }),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export type AnalysisData = z.infer<typeof AnalysisSchema>;

const SYSTEM = `You are a senior commodities supply-chain risk analyst. Produce structured, defensible analysis. Use realistic recent figures (you may approximate where exact live data is unavailable, but be plausible). Cite real, well-known sources (USGS, IEA, World Bank, IMF, Reuters, Bloomberg, FAO, S&P Global, Wood Mackenzie, etc.) with real URLs. Country codes must be valid ISO 3-letter (e.g. CHN, USA, RUS, COD, AUS, CHL).`;

export const generateAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commodity: string }) =>
    z.object({ commodity: z.string().min(1).max(80) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Produce a complete supply-chain risk analysis for the commodity: "${data.commodity}".

Return ALL fields. price_history: 12 monthly points ending this month. forecast: next 6 months. sourcing: 5-10 top producing countries with valid ISO3 codes and risk scores (0-100, higher = riskier). risk_score is overall global supply risk. recommendation: actionable for a procurement / treasury buyer.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the structured commodity risk analysis",
              parameters: {
                type: "object",
                properties: {
                  commodity: { type: "string" },
                  overview: { type: "string" },
                  risk_score: { type: "number" },
                  risk_label: { type: "string", enum: ["Low", "Moderate", "High", "Extreme"] },
                  current_price: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      unit: { type: "string" },
                      as_of: { type: "string" },
                    },
                    required: ["value", "unit", "as_of"],
                  },
                  price_history: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { period: { type: "string" }, price: { type: "number" } },
                      required: ["period", "price"],
                    },
                  },
                  forecast: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { period: { type: "string" }, price: { type: "number" } },
                      required: ["period", "price"],
                    },
                  },
                  sourcing: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        country: { type: "string" },
                        iso3: { type: "string" },
                        share_pct: { type: "number" },
                        risk_score: { type: "number" },
                        note: { type: "string" },
                      },
                      required: ["country", "iso3", "share_pct", "risk_score", "note"],
                    },
                  },
                  concentration: {
                    type: "object",
                    properties: {
                      top3_countries_pct: { type: "number" },
                      top3_companies_pct: { type: "number" },
                      top_companies: { type: "array", items: { type: "string" } },
                      hhi: { type: "number" },
                      commentary: { type: "string" },
                    },
                    required: ["top3_countries_pct", "top3_companies_pct", "top_companies", "commentary"],
                  },
                  short_term_risk: { type: "string" },
                  long_term_risk: { type: "string" },
                  recommendation: {
                    type: "object",
                    properties: {
                      action: { type: "string", enum: ["Hedge now", "Buy now", "Buy later", "Hold"] },
                      rationale: { type: "string" },
                      confidence: { type: "string", enum: ["Low", "Medium", "High"] },
                    },
                    required: ["action", "rationale", "confidence"],
                  },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { title: { type: "string" }, url: { type: "string" } },
                      required: ["title", "url"],
                    },
                  },
                },
                required: [
                  "commodity", "overview", "risk_score", "risk_label", "current_price",
                  "price_history", "forecast", "sourcing", "concentration",
                  "short_term_risk", "long_term_risk", "recommendation", "sources",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
      throw new Error(`AI gateway error ${res.status}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No analysis returned");
    const parsed = AnalysisSchema.parse(JSON.parse(call.function.arguments));

    // Save to history
    const { supabase, userId } = context;
    const { data: saved, error } = await supabase
      .from("analyses")
      .insert({ user_id: userId, commodity: parsed.commodity, data: parsed })
      .select("id")
      .single();
    if (error) console.error("save error", error);

    return { analysis: parsed, id: saved?.id ?? null };
  });