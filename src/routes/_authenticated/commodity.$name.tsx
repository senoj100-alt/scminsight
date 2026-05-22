import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { generateAnalysis, type AnalysisData } from "@/lib/analysis.functions";
import { WorldRiskMap } from "@/components/WorldRiskMap";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, ExternalLink, Building2, Globe2, Gauge, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/commodity/$name")({
  component: CommodityPage,
});

function CommodityPage() {
  const { name } = Route.useParams();
  const commodity = decodeURIComponent(name);
  const fn = useServerFn(generateAnalysis);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["analysis", commodity],
    queryFn: () => fn({ data: { commodity } }),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm">Generating risk analysis for <span className="text-foreground font-medium">{commodity}</span>…</div>
        <div className="text-xs">This usually takes 15–30 seconds.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <div className="font-medium">Could not generate analysis</div>
        <div className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</div>
        <button onClick={() => refetch()} className="mt-4 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;
  return <Report analysis={data.analysis} regenerating={isFetching} />;
}

function Report({ analysis }: { analysis: AnalysisData; regenerating?: boolean }) {
  const a = analysis;
  const chartData = [
    ...a.price_history.map((p) => ({ period: p.period, price: p.price, kind: "h" })),
    ...a.forecast.map((p) => ({ period: p.period, price: p.price, kind: "f", forecast: p.price })),
  ];

  const last = a.price_history.at(-1)?.price ?? 0;
  const fcstEnd = a.forecast.at(-1)?.price ?? last;
  const trend = fcstEnd - last;
  const trendPct = last ? (trend / last) * 100 : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Commodity report</p>
          <h1 className="mt-1 text-4xl font-semibold">{a.commodity}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{a.overview}</p>
        </div>
        <RiskBadge score={a.risk_score} label={a.risk_label} />
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          icon={Gauge}
          label="Current price"
          value={`${a.current_price.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={`${a.current_price.unit} · ${a.current_price.as_of}`}
        />
        <Metric
          icon={trend >= 0 ? TrendingUp : TrendingDown}
          label="6-mo forecast"
          value={`${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%`}
          sub={`→ ${fcstEnd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          tone={trend >= 0 ? "warn" : "good"}
        />
        <Metric
          icon={Globe2}
          label="Top-3 countries"
          value={`${a.concentration.top3_countries_pct.toFixed(0)}%`}
          sub="of global supply"
        />
        <Metric
          icon={Building2}
          label="Top-3 companies"
          value={`${a.concentration.top3_companies_pct.toFixed(0)}%`}
          sub={a.concentration.top_companies.slice(0, 2).join(", ")}
        />
      </div>

      <Recommendation r={a.recommendation} />

      <WorldRiskMap sourcing={a.sourcing} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-medium">Price trend & forecast</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.03 250)" />
                <XAxis dataKey="period" stroke="oklch(0.68 0.02 250)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.035 250)",
                    border: "1px solid oklch(0.3 0.03 250)",
                    borderRadius: 8,
                    color: "oklch(0.96 0.01 250)",
                  }}
                />
                <ReferenceLine
                  x={a.price_history.at(-1)?.period}
                  stroke="oklch(0.78 0.16 75 / 0.5)"
                  strokeDasharray="4 4"
                  label={{ value: "now", fill: "oklch(0.78 0.16 75)", fontSize: 10, position: "top" }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="oklch(0.78 0.16 75)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="oklch(0.7 0.15 200)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">Top producers</h3>
          <div className="space-y-2">
            {[...a.sourcing].sort((x, y) => y.share_pct - x.share_pct).slice(0, 8).map((s) => (
              <div key={s.iso3} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-right tabular-nums text-muted-foreground">{s.share_pct.toFixed(1)}%</span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span>{s.country}</span>
                    <span className="text-xs text-muted-foreground">risk {s.risk_score}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, s.share_pct)}%`,
                        background: riskBar(s.risk_score),
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RiskCard title="Short-term risk (0–6 months)" body={a.short_term_risk} accent="warn" />
        <RiskCard title="Long-term risk (1–5 years)" body={a.long_term_risk} accent="info" />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-2 font-medium">Concentration analysis</h3>
        <p className="text-sm text-muted-foreground">{a.concentration.commentary}</p>
        {a.concentration.hhi != null && (
          <div className="mt-3 text-xs text-muted-foreground">
            Herfindahl–Hirschman Index (countries): <span className="text-foreground">{a.concentration.hhi.toFixed(0)}</span>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {a.concentration.top_companies.map((c) => (
            <span key={c} className="rounded-full border border-border bg-muted px-3 py-1 text-xs">{c}</span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> Sources
        </h3>
        <ul className="space-y-1.5 text-sm">
          {a.sources.map((s, i) => (
            <li key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                {s.title} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function riskBar(score: number) {
  if (score >= 75) return "oklch(0.62 0.22 25)";
  if (score >= 55) return "oklch(0.72 0.19 55)";
  if (score >= 35) return "oklch(0.82 0.16 90)";
  return "oklch(0.72 0.17 145)";
}

function RiskBadge({ score, label }: { score: number; label: string }) {
  const color = riskBar(score);
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-3 text-right">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall risk</div>
      <div className="mt-1 flex items-baseline justify-end gap-2">
        <span className="text-3xl font-semibold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <div className="mt-0.5 text-xs font-medium" style={{ color }}>{label}</div>
    </div>
  );
}

function Metric({
  icon: Icon, label, value, sub, tone,
}: {
  icon: typeof Globe2; label: string; value: string; sub?: string; tone?: "good" | "warn";
}) {
  const c = tone === "good" ? "oklch(0.72 0.17 145)" : tone === "warn" ? "oklch(0.72 0.19 55)" : undefined;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: c }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RiskCard({ title, body, accent }: { title: string; body: string; accent: "warn" | "info" }) {
  const c = accent === "warn" ? "oklch(0.72 0.19 55)" : "oklch(0.7 0.15 200)";
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: c }}>
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
        {title}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Recommendation({ r }: { r: AnalysisData["recommendation"] }) {
  const palette: Record<string, string> = {
    "Hedge now": "oklch(0.72 0.19 55)",
    "Buy now": "oklch(0.72 0.17 145)",
    "Buy later": "oklch(0.7 0.15 200)",
    "Hold": "oklch(0.82 0.16 90)",
  };
  const c = palette[r.action] ?? "oklch(0.78 0.16 75)";
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommendation</div>
          <div className="mt-1 text-2xl font-semibold" style={{ color: c }}>{r.action}</div>
        </div>
        <div className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: c, color: c }}>
          {r.confidence} confidence
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{r.rationale}</p>
    </div>
  );
}