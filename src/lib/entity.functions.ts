import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAIStructured, currentDateAnchor, UserKeySchema } from "./ai-call.server";

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

const PeerBenchmarkSchema = z.object({
  industry: z.string(),
  metrics: z.array(
    z.object({
      label: z.string(),
      company: z.number(),
      peer_median: z.number(),
      top_quartile: z.number(),
      unit: z.string().optional(),
      higher_is_better: z.boolean(),
    })
  ),
  commentary: z.string(),
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
  peer_benchmark: PeerBenchmarkSchema.optional(),
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
ALSO populate countries_of_operation (5-12 countries the company sources from / operates in, with valid ISO3 and a short role e.g. "HQ", "Lithium refining", "Assembly"), supplier_network (10-18 nodes across tiers 1/2/3 with edges showing who supplies whom; the company itself is NOT a node — only suppliers), critical_path (4-7 step chain from raw material to finished product), concentration_note, historical_performance (on-time delivery %, average lead time days, lead time variation in days, fill rate, 12-month trend, commentary), recent_news (EXACTLY 10 of the latest credible supply-chain-related news items with real source name, real URL, ISO date within the last 6 months, short summary, and sentiment), AND peer_benchmark (industry name + 4-6 metrics comparing the company vs. peer-median vs. top-quartile: on-time delivery %, average lead time days, ESG score, debt-to-equity, gross margin %, days payable outstanding — pick whichever are most relevant; set higher_is_better correctly per metric).`,
  country: `Return EXACTLY 3 categories with these keys/names:
- disaster ("Disaster risk"): metrics MUST include "Natural disaster frequency", "Climate exposure score", "Pandemic readiness index", "Power outage rate".
- geopolitical ("Geopolitical risk"): metrics MUST include "Trade tariff status", "Political stability index", "Sanctions watchlist status", "War/conflict proximity".
- fiscal ("Fiscal risk"): metrics MUST include "Currency volatility (12mo)", "Inflation rate", "Recent tax policy changes", "Capital controls".
Do NOT populate company-only fields (countries_of_operation, supplier_network, critical_path).`,
  industry: `Return EXACTLY 1 category:
- industry ("Industry risk"): metrics MUST include "Supplier concentration ratio (CR4)", "Technology obsolescence score", "R&D investment level (% of revenue)", "Monopolistic supplier dependency".
Do NOT populate company-only fields.`,
};

const DATE = currentDateAnchor();
const SYSTEM = `You are a senior supply-chain risk intelligence analyst. The current date is ${DATE.month} ${DATE.year} (${DATE.iso}). Produce CURRENT, defensible analysis using realistic figures reflecting market conditions in ${DATE.month} ${DATE.year}. NEVER emit any year before ${DATE.year - 1} for prices, KPIs, news dates, or performance windows. All "as_of" / "date" fields MUST fall within the last 6 months of ${DATE.iso}. Cite real, well-known sources (S&P Global, Moody's, Reuters, Bloomberg, World Bank, IMF, OECD, MSCI ESG, RepRisk, Sustainalytics, EM-DAT, ND-GAIN, Fund for Peace FSI, OFAC, ACLED, FT, WSJ) with real URLs.

RISKS array: list 6-10 concrete risks. Each MUST set detectability ("easy" = observable from public signals / KPIs, "hard" = latent or low-visibility) and impact ("critical" = material to operations/finances, "non-critical" = manageable). This drives a 2x2 risk matrix; balance items across all four quadrants where realistic. Each risk must include a concrete action.`;

function buildPrompt(kind: EntityKind, name: string, userCountry: { name: string; iso3: string }) {
  const subject =
    kind === "company"
      ? `the company "${name}"`
      : kind === "country"
      ? `the country / region "${name}"`
      : `the industry "${name}"`;

  const logisticsSpec =
    kind === "industry"
      ? ""
      : `\n\nLOGISTICS: Populate the "logistics" field for shipping from ${
          kind === "company"
            ? `the company's primary export hub`
            : `${name}'s main export gateway`
        } to the buyer in "${userCountry.name}" (${userCountry.iso3}).
- destination MUST be { name: "${userCountry.name}", iso3: "${userCountry.iso3}" }.
- Provide ALL THREE modes (air, sea, road). Mark "feasible": false (with brief notes) if a mode is impractical (e.g. road between two non-contiguous continents) but ALWAYS include it.
- For each mode: realistic lead_time_days (min/typical/max), avg_cost as a human string with units (e.g. "$4.20–$6.80 / kg", "$2,800–$4,500 / 40ft container", "$0.18–$0.24 / km / tonne"), and a route array of 3-6 waypoints with real coordinates (origin → ports/airports/hubs/borders → destination).
- risks per mode MUST cover 3-6 concrete current concerns: port congestion, war / conflict reroutes (Red Sea, Suez, Black Sea, Taiwan Strait, Panama drought), fuel cost trend, insurance / war-risk premium changes, customs delays, weather, labor strikes — whichever is realistically relevant for that lane in ${TODAY.slice(0,7)}.
- alternative: suggest an alternative port / airport / corridor when applicable.
- recommended_mode: pick the best mode given cost vs lead time vs risk for this lane today.`;

  return `Produce a complete supply-chain risk profile for ${subject} as of ${DATE.month} ${DATE.year}.

${CATEGORY_SPECS[kind]}
${logisticsSpec}

overall_score must be a weighted aggregate of the category scores (0-100, higher = riskier). as_of MUST be ${DATE.iso}. Include 4-8 real, current sources.`;
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
    historical_performance: {
      type: "object",
      properties: {
        on_time_delivery_pct: { type: "number" },
        lead_time_avg_days: { type: "number" },
        lead_time_variation_days: { type: "number" },
        fill_rate_pct: { type: "number" },
        trend_12mo: { type: "string", enum: ["improving", "stable", "deteriorating"] },
        commentary: { type: "string" },
      },
      required: ["on_time_delivery_pct", "lead_time_avg_days", "lead_time_variation_days", "trend_12mo", "commentary"],
    },
    recent_news: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          source: { type: "string" },
          url: { type: "string" },
          date: { type: "string" },
          summary: { type: "string" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        },
        required: ["title", "source", "url", "date", "summary", "sentiment"],
      },
    },
    peer_benchmark: {
      type: "object",
      properties: {
        industry: { type: "string" },
        metrics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              company: { type: "number" },
              peer_median: { type: "number" },
              top_quartile: { type: "number" },
              unit: { type: "string" },
              higher_is_better: { type: "boolean" },
            },
            required: ["label", "company", "peer_median", "top_quartile", "higher_is_better"],
          },
        },
        commentary: { type: "string" },
      },
      required: ["industry", "metrics", "commentary"],
    },
    logistics: {
      type: "object",
      properties: {
        origin: {
          type: "object",
          properties: { name: { type: "string" }, iso3: { type: "string" } },
          required: ["name", "iso3"],
        },
        destination: {
          type: "object",
          properties: { name: { type: "string" }, iso3: { type: "string" } },
          required: ["name", "iso3"],
        },
        recommended_mode: { type: "string", enum: ["air", "road", "sea"] },
        summary: { type: "string" },
        modes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["air", "road", "sea"] },
              feasible: { type: "boolean" },
              lead_time_days: {
                type: "object",
                properties: { min: { type: "number" }, typical: { type: "number" }, max: { type: "number" } },
                required: ["min", "typical", "max"],
              },
              avg_cost: { type: "string" },
              route: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    iso3: { type: "string" },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    type: { type: "string", enum: ["origin", "port", "airport", "hub", "border", "destination"] },
                  },
                  required: ["name", "lat", "lng", "type"],
                },
              },
              risks: { type: "array", items: { type: "string" } },
              alternative: { type: "string" },
              notes: { type: "string" },
            },
            required: ["mode", "feasible", "lead_time_days", "avg_cost", "route", "risks"],
          },
        },
      },
      required: ["origin", "destination", "recommended_mode", "summary", "modes"],
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
    "name", "kind", "overview", "overall_score", "overall_label", "as_of",
    "categories", "risks", "sources",
  ],
};

export const generateEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: EntityKind; name: string; userCountry?: { name: string; iso3: string }; userKey?: unknown }) =>
    z.object({
      kind: z.enum(["company", "country", "industry"]),
      name: z.string().min(1).max(120),
      userCountry: z.object({ name: z.string(), iso3: z.string() }).optional(),
      userKey: UserKeySchema,
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const userCountry = data.userCountry ?? { name: "United States", iso3: "USA" };
    const raw = await callAIStructured({
      userKey: data.userKey,
      system: SYSTEM,
      user: buildPrompt(data.kind, data.name, userCountry),
      toolName: "return_entity",
      toolDescription: "Return the structured entity risk profile",
      parameters: SCHEMA_PARAMETERS,
    });
    const parsed = EntitySchema.parse(raw);

    // Freshness guard: as_of must not be in a year too far in the past
    const asOfYear = parseInt(parsed.as_of.slice(0, 4), 10);
    if (!isNaN(asOfYear) && asOfYear < DATE.year - 1) {
      throw new Error(
        `AI returned stale data (as_of=${parsed.as_of}). Try regenerating or switch to your own OpenAI/Anthropic key in Settings.`
      );
    }

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