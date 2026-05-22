import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TODAY = new Date().toISOString().slice(0, 10);

export type EntityKind = "company" | "country" | "industry";

const MetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  note: z.string().optional(),
});
const CategorySchema = z.object({
  key: z.string(),
  name: z.string(),
  score: z.number().min(0).max(100),
  summary: z.string(),
  metrics: z.array(MetricSchema),
});
const RiskItemSchema = z.object({
  title: z.string(),
  category: z.string(),
  detectability: z.enum(["easy", "hard"]),
  impact: z.enum(["critical", "non-critical"]),
  action: z.string(),
  owner: z.string().optional(),
  sla: z.string().optional(),
});
const SupplierNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.number().int().min(1).max(3),
  country: z.string().optional(),
  iso3: z.string().optional(),
  risk: z.number().min(0).max(100),
  category: z.string().optional(),
});
const SupplierEdgeSchema = z.object({ from: z.string(), to: z.string() });

const WaypointSchema = z.object({
  name: z.string(),
  iso3: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  type: z.enum(["origin", "port", "airport", "hub", "border", "destination"]),
});
const ModeSchema = z.object({
  mode: z.enum(["air", "road", "sea"]),
  feasible: z.boolean(),
  lead_time_days: z.object({ min: z.number(), typical: z.number(), max: z.number() }),
  avg_cost: z.string(),
  route: z.array(WaypointSchema),
  risks: z.array(z.string()).min(1),
  alternative: z.string().optional(),
  notes: z.string().optional(),
});
const LogisticsSchema = z.object({
  origin: z.object({ name: z.string(), iso3: z.string() }),
  destination: z.object({ name: z.string(), iso3: z.string() }),
  recommended_mode: z.enum(["air", "road", "sea"]),
  summary: z.string(),
  modes: z.array(ModeSchema).min(1),
});

const PerformanceSchema = z.object({
  on_time_delivery_pct: z.number().min(0).max(100),
  lead_time_avg_days: z.number(),
  lead_time_variation_days: z.number(),
  fill_rate_pct: z.number().min(0).max(100).optional(),
  trend_12mo: z.enum(["improving", "stable", "deteriorating"]),
  commentary: z.string(),
});

const NewsItemSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string(),
  date: z.string(),
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

const EntitySchema = z.object({
  name: z.string(),
  kind: z.enum(["company", "country", "industry"]),
  overview: z.string(),
  overall_score: z.number().min(0).max(100),
  overall_label: z.enum(["Low", "Moderate", "High", "Extreme"]),
  as_of: z.string(),
  categories: z.array(CategorySchema).min(1),
  risks: z.array(RiskItemSchema).min(3),
  // company-only
  countries_of_operation: z
    .array(z.object({ country: z.string(), iso3: z.string(), role: z.string() }))
    .optional(),
  supplier_network: z
    .object({ nodes: z.array(SupplierNodeSchema), edges: z.array(SupplierEdgeSchema) })
    .optional(),
  critical_path: z.array(z.string()).optional(),
  concentration_note: z.string().optional(),
  historical_performance: PerformanceSchema.optional(),
  recent_news: z.array(NewsItemSchema).optional(),
  logistics: LogisticsSchema.optional(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export type EntityData = z.infer<typeof EntitySchema>;

const CATEGORY_SPECS: Record<EntityKind, string> = {
  company: `Return EXACTLY 4 categories with these keys/names (in this order):
- operational ("Operational risk"): metrics MUST include "Workforce union %", "Production capacity utilisation", "Quality defect rate (DPMO)", and one more relevant operational KRI.
- financial ("Financial risk"): metrics MUST include "Credit score / rating", "Debt-to-equity", "Days payable outstanding", "Recent revenue trend (YoY)".
- reputational ("Reputational risk"): metrics MUST include "ESG score", "News sentiment (last 90d)", "Labor violation history", "Regulatory fines (last 24mo)".
- structural ("Structural risk"): metrics MUST include "Single-source Tier 2/3 dependency", "Ownership / control changes", "Recent M&A activity", "Geographic concentration".
ALSO populate countries_of_operation (5-12 countries the company sources from / operates in, with valid ISO3 and a short role e.g. "HQ", "Lithium refining", "Assembly"), supplier_network (10-18 nodes across tiers 1/2/3 with edges showing who supplies whom; the company itself is NOT a node — only suppliers), critical_path (4-7 step chain from raw material to finished product), and concentration_note.`,
  country: `Return EXACTLY 3 categories with these keys/names:
- disaster ("Disaster risk"): metrics MUST include "Natural disaster frequency", "Climate exposure score", "Pandemic readiness index", "Power outage rate".
- geopolitical ("Geopolitical risk"): metrics MUST include "Trade tariff status", "Political stability index", "Sanctions watchlist status", "War/conflict proximity".
- fiscal ("Fiscal risk"): metrics MUST include "Currency volatility (12mo)", "Inflation rate", "Recent tax policy changes", "Capital controls".
Do NOT populate company-only fields (countries_of_operation, supplier_network, critical_path).`,
  industry: `Return EXACTLY 1 category:
- industry ("Industry risk"): metrics MUST include "Supplier concentration ratio (CR4)", "Technology obsolescence score", "R&D investment level (% of revenue)", "Monopolistic supplier dependency".
Do NOT populate company-only fields.`,
};

const SYSTEM = `You are a senior supply-chain risk intelligence analyst. Today is ${TODAY}. Produce CURRENT, defensible analysis using realistic figures reflecting market conditions as of ${TODAY} — never stale 2022/2023 data. Cite real, well-known sources (S&P Global, Moody's, Reuters, Bloomberg, World Bank, IMF, OECD, MSCI ESG, RepRisk, Sustainalytics, EM-DAT, ND-GAIN, Fund for Peace FSI, OFAC, ACLED, FT, WSJ) with real URLs.

RISKS array: list 6-10 concrete risks. Each MUST set detectability ("easy" = observable from public signals / KPIs, "hard" = latent or low-visibility) and impact ("critical" = material to operations/finances, "non-critical" = manageable). This drives a 2x2 risk matrix; balance items across all four quadrants where realistic. Each risk must include a concrete action.`;

function buildPrompt(kind: EntityKind, name: string) {
  const subject =
    kind === "company"
      ? `the company "${name}"`
      : kind === "country"
      ? `the country / region "${name}"`
      : `the industry "${name}"`;
  return `Produce a complete supply-chain risk profile for ${subject} as of ${TODAY}.

${CATEGORY_SPECS[kind]}

overall_score must be a weighted aggregate of the category scores (0-100, higher = riskier). as_of MUST be ${TODAY}. Include 4-8 real, current sources.`;
}

const SCHEMA_PARAMETERS = {
  type: "object",
  properties: {
    name: { type: "string" },
    kind: { type: "string", enum: ["company", "country", "industry"] },
    overview: { type: "string" },
    overall_score: { type: "number" },
    overall_label: { type: "string", enum: ["Low", "Moderate", "High", "Extreme"] },
    as_of: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          score: { type: "number" },
          summary: { type: "string" },
          metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                note: { type: "string" },
              },
              required: ["label", "value"],
            },
          },
        },
        required: ["key", "name", "score", "summary", "metrics"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          detectability: { type: "string", enum: ["easy", "hard"] },
          impact: { type: "string", enum: ["critical", "non-critical"] },
          action: { type: "string" },
          owner: { type: "string" },
          sla: { type: "string" },
        },
        required: ["title", "category", "detectability", "impact", "action"],
      },
    },
    countries_of_operation: {
      type: "array",
      items: {
        type: "object",
        properties: {
          country: { type: "string" },
          iso3: { type: "string" },
          role: { type: "string" },
        },
        required: ["country", "iso3", "role"],
      },
    },
    supplier_network: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              tier: { type: "number" },
              country: { type: "string" },
              iso3: { type: "string" },
              risk: { type: "number" },
              category: { type: "string" },
            },
            required: ["id", "name", "tier", "risk"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: { from: { type: "string" }, to: { type: "string" } },
            required: ["from", "to"],
          },
        },
      },
      required: ["nodes", "edges"],
    },
    critical_path: { type: "array", items: { type: "string" } },
    concentration_note: { type: "string" },
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
    "name", "kind", "overview", "overall_score", "overall_label", "as_of",
    "categories", "risks", "sources",
  ],
};

export const generateEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: EntityKind; name: string }) =>
    z.object({
      kind: z.enum(["company", "country", "industry"]),
      name: z.string().min(1).max(120),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(data.kind, data.name) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_entity",
              description: "Return the structured entity risk profile",
              parameters: SCHEMA_PARAMETERS,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_entity" } },
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
    const parsed = EntitySchema.parse(JSON.parse(call.function.arguments));

    const { supabase, userId } = context;
    const { data: saved } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        commodity: parsed.name,
        data: parsed,
        kind: data.kind,
      } as never)
      .select("id")
      .single();

    return { entity: parsed, id: saved?.id ?? null };
  });