import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOptionalUser } from "@/integrations/supabase/optional-auth.server";
import { callAIStructured, currentDateAnchor, UserKeySchema } from "./ai-call.server";

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
  forecast: z.array(
    z.object({
      period: z.string(),
      price: z.number(),
      low: z.number().optional(),
      high: z.number().optional(),
    })
  ),
  scenario_notes: z
    .object({
      base: z.string(),
      bull: z.string(),
      bear: z.string(),
    })
    .optional(),
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

export const generateAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: { commodity: string; userKey?: unknown }) =>
    z.object({
      commodity: z.string().min(1).max(80),
      userKey: UserKeySchema,
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const date = currentDateAnchor();
    const system = `You are a senior commodities supply-chain risk analyst. The current date is ${date.month} ${date.year} (${date.iso}). EVERY figure (prices, dates, news, geopolitical context) MUST reflect realistic market conditions in ${date.month} ${date.year}. NEVER use stale 2022/2023/2024 data and NEVER emit any year before ${date.year - 1}. The price_history MUST be 12 monthly points whose LAST period equals "${date.ym}" (${date.month} ${date.year}). The forecast MUST be 6 monthly points starting the month AFTER ${date.ym}. current_price.as_of MUST fall within the last 30 days of ${date.iso}. For the forecast, provide a base price plus a "low" (P10) and "high" (P90) confidence band reflecting realistic scenario uncertainty (weather, geopolitics, demand). Provide scenario_notes describing base / bull / bear narratives. Cite real sources (USGS, IEA, World Bank, IMF, Reuters, Bloomberg, FAO, S&P Global, Wood Mackenzie, FT, WSJ) with real URLs. Country codes must be valid ISO 3-letter codes.`;

    const userPrompt = `Produce a complete supply-chain risk analysis for the commodity "${data.commodity}" as of ${date.month} ${date.year}.

price_history: EXACTLY 12 monthly points, periods in YYYY-MM format, ending in "${date.ym}". forecast: EXACTLY 6 monthly points starting "${nextMonth(date.ym)}" with base price + low (P10) + high (P90). sourcing: 5-10 producing countries with ISO3 codes and risk scores (0-100). recommendation: actionable for a procurement/treasury buyer right now. Reflect known disruptions, central-bank policy, and trade actions as of ${date.month} ${date.year}.`;

    const parameters = {
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
                      properties: {
                        period: { type: "string" },
                        price: { type: "number" },
                        low: { type: "number" },
                        high: { type: "number" },
                      },
                      required: ["period", "price", "low", "high"],
                    },
                  },
                  scenario_notes: {
                    type: "object",
                    properties: {
                      base: { type: "string" },
                      bull: { type: "string" },
                      bear: { type: "string" },
                    },
                    required: ["base", "bull", "bear"],
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
    } as const;

    const raw = await callAIStructured({
      userKey: data.userKey,
      system,
      user: userPrompt,
      toolName: "return_analysis",
      toolDescription: "Return the structured commodity risk analysis",
      parameters,
    });
    const parsed = AnalysisSchema.parse(raw);

    // Freshness guard: reject obviously stale price history (anything older than 2 years back)
    const minYear = date.year - 2;
    const stale = parsed.price_history.find((p) => {
      const y = parseInt(p.period.slice(0, 4), 10);
      return !isNaN(y) && y < minYear;
    });
    if (stale) {
      throw new Error(
        `AI returned stale data (${stale.period}). Try regenerating, switching to your own OpenAI/Anthropic key in Settings, or pick a more specific commodity name.`
      );
    }

    // Save to history
    const { supabase, userId } = await getOptionalUser();
    let id: string | null = null;
    if (supabase && userId) {
      const { data: saved, error } = await supabase
        .from("analyses")
        .insert({ user_id: userId, commodity: parsed.commodity, data: parsed })
        .select("id")
        .single();
      if (error) console.error("save error", error);
      id = saved?.id ?? null;
    }
    return { analysis: parsed, id };
  });

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 7);
}