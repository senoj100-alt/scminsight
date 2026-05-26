import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Globe2, Sparkles, Network, Route as RouteIcon, Activity, Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { RiskMatrix } from "./RiskMatrix";
import { SupplierNetwork } from "./SupplierNetwork";
import { LogisticsView } from "./LogisticsView";
import { DisruptionSimulator } from "./DisruptionSimulator";
import { PeerBenchmark } from "./PeerBenchmark";
import { EsgBreakdown } from "./EsgBreakdown";
import { FinancialHealth } from "./FinancialHealth";
import { SanctionsWatchlist } from "./SanctionsWatchlist";
import { ContractsPanel } from "./ContractsPanel";
import { ScoreExplain } from "./ScoreExplain";
import { MitigationEngine } from "./MitigationEngine";
import { OpsPanel } from "./OpsPanel";
import { AlertsManager } from "./AlertsManager";
import { ProvenancePanel } from "./ProvenancePanel";
import { EntityChat } from "./EntityChat";
import type { EntityData } from "@/lib/entity.functions";
import { applyWeights, labelForScore, useUserSettings } from "@/lib/user-settings";

function riskColor(score: number) {
  if (score >= 75) return "oklch(0.62 0.22 25)";
  if (score >= 55) return "oklch(0.72 0.19 55)";
  if (score >= 35) return "oklch(0.82 0.16 90)";
  return "oklch(0.72 0.17 145)";
}

export function EntityReport({ entity, onRefresh, isRefreshing, lastFetchedAt }: { entity: EntityData; onRefresh?: () => void; isRefreshing?: boolean; lastFetchedAt?: number }) {
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const e = entity;
  const entityKey = `${e.kind}:${e.name}`;
  const weighted = useMemo(
    () => applyWeights(e.categories.map((c) => ({ key: c.key, score: c.score })), settings.weights),
    [e.categories, settings.weights]
  );
  const isCustom = weighted !== e.overall_score;
  const displayScore = weighted;
  const displayLabel = isCustom ? labelForScore(weighted) : e.overall_label;
  const color = riskColor(displayScore);

  const goCountry = (country: string) =>
    navigate({ to: "/country/$name", params: { name: encodeURIComponent(country) } });
  const goCompany = (company: string) =>
    navigate({ to: "/company/$name", params: { name: encodeURIComponent(company) } });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">{e.kind} report</p>
          <h1 className="mt-1 text-4xl font-semibold">{e.name}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{e.overview}</p>
          <p className="mt-1 text-xs text-muted-foreground">As of {e.as_of}</p>
        </div>
        <div className="flex items-stretch gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs hover:border-primary hover:text-primary disabled:opacity-50"
              title="Sync to latest date — regenerate this report with today's data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Sync to latest
            </button>
          )}
          <div className="rounded-lg border border-border bg-card px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Overall risk {isCustom && <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">custom weights</span>}
          </div>
          <div className="mt-1 flex items-baseline justify-end gap-2">
            <span className="text-3xl font-semibold tabular-nums" style={{ color }}>{displayScore}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <div className="mt-0.5 text-xs font-medium" style={{ color }}>{displayLabel}</div>
          {isCustom && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">unweighted {e.overall_score}</div>
          )}
          </div>
        </div>
      </header>

      <div className={`grid gap-4 md:grid-cols-2 ${e.categories.length >= 4 ? "lg:grid-cols-4" : e.categories.length === 3 ? "lg:grid-cols-3" : ""}`}>
        {e.categories.map((c) => {
          const cc = riskColor(c.score);
          return (
            <div key={c.key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{c.name}</div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: cc }}>{c.score}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.summary}</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {c.metrics.map((m, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 border-t border-border/40 pt-1.5">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="text-right text-foreground">{m.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <RiskMatrix risks={e.risks} />

      <ScoreExplain entity={e} />
      <ProvenancePanel entity={e} lastFetchedAt={lastFetchedAt ?? Date.now()} />
      <AlertsManager entity={e} entityKey={entityKey} />
      <MitigationEngine entity={e} entityKey={entityKey} />
      <OpsPanel entity={e} entityKey={entityKey} />

      {e.kind === "company" && e.countries_of_operation && e.countries_of_operation.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Countries of operation</h3>
            <span className="text-xs text-muted-foreground">Double-click a country to open its risk profile</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {e.countries_of_operation.map((c) => (
              <button
                key={c.iso3}
                onDoubleClick={() => goCountry(c.country)}
                title="Double-click for country risk"
                className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
              >
                <span className="font-medium text-foreground">{c.country}</span>
                <span className="ml-2 text-muted-foreground">{c.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {e.kind === "company" && e.supplier_network && (
        <>
          <SupplierNetwork
            company={e.name}
            network={e.supplier_network}
            onNodeCountry={(country) => goCountry(country)}
            onNodeCompany={(company) => goCompany(company)}
          />
          <DisruptionSimulator network={e.supplier_network} />
        </>
      )}

      {e.kind === "company" && e.critical_path && e.critical_path.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <RouteIcon className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Critical path · raw material → finished product</h3>
          </div>
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {e.critical_path.map((step, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs">{step}</span>
                {i < e.critical_path!.length - 1 && <span className="text-muted-foreground">→</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {e.logistics && <LogisticsView logistics={e.logistics} />}

      {e.kind === "company" && e.peer_benchmark && (
        <PeerBenchmark benchmark={e.peer_benchmark} />
      )}

      {e.kind === "company" && e.financial_health && <FinancialHealth fh={e.financial_health} />}
      {e.kind === "company" && e.esg_breakdown && <EsgBreakdown esg={e.esg_breakdown} />}
      {e.sanctions && <SanctionsWatchlist s={e.sanctions} />}
      {e.kind === "company" && e.contracts && e.contracts.length > 0 && <ContractsPanel contracts={e.contracts} />}

      {e.kind === "company" && e.historical_performance && (
        <PerformancePanel perf={e.historical_performance} />
      )}

      {e.kind === "company" && e.recent_news && e.recent_news.length > 0 && (
        <NewsPanel news={e.recent_news} />
      )}

      {e.concentration_note && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Network className="h-4 w-4 text-primary" />
            Concentration analysis
          </div>
          <p className="text-sm text-muted-foreground">{e.concentration_note}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> Sources
        </h3>
        <ul className="space-y-1.5 text-sm">
          {e.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                {s.title} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <EntityChat title={e.kind} context={JSON.stringify(e).slice(0, 30000)} />
    </div>
  );
}

function PerformancePanel({ perf }: { perf: NonNullable<EntityData["historical_performance"]> }) {
  const TrendIcon = perf.trend_12mo === "improving" ? TrendingUp : perf.trend_12mo === "deteriorating" ? TrendingDown : Minus;
  const trendColor =
    perf.trend_12mo === "improving" ? "oklch(0.72 0.17 145)" :
    perf.trend_12mo === "deteriorating" ? "oklch(0.62 0.22 25)" :
    "oklch(0.82 0.16 90)";
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-medium">
        <Activity className="h-4 w-4 text-primary" /> Historical performance (last 12 months)
      </h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="On-time delivery" value={`${perf.on_time_delivery_pct.toFixed(1)}%`} />
        <Kpi label="Avg. lead time" value={`${perf.lead_time_avg_days.toFixed(1)} d`} />
        <Kpi label="Lead time variation" value={`±${perf.lead_time_variation_days.toFixed(1)} d`} />
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">12-mo trend</div>
          <div className="mt-1.5 flex items-center gap-2 text-lg font-semibold" style={{ color: trendColor }}>
            <TrendIcon className="h-4 w-4" /> {perf.trend_12mo}
          </div>
          {perf.fill_rate_pct != null && (
            <div className="text-xs text-muted-foreground">Fill rate {perf.fill_rate_pct.toFixed(0)}%</div>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{perf.commentary}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function NewsPanel({ news }: { news: NonNullable<EntityData["recent_news"]> }) {
  const { settings } = useUserSettings();
  const [filter, setFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const filtered = (filter === "all" ? news : news.filter((n) => n.sentiment === filter)).slice(0, settings.newsCount);
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-medium">
          <Newspaper className="h-4 w-4 text-primary" /> Latest supply-chain news
        </h3>
        <div className="flex gap-1 text-xs">
          {(["all", "negative", "neutral", "positive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-2 py-0.5 ${filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((n, i) => {
          const tone =
            n.sentiment === "negative" ? "oklch(0.62 0.22 25)" :
            n.sentiment === "positive" ? "oklch(0.72 0.17 145)" :
            "oklch(0.68 0.02 250)";
          return (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              <a href={n.url} target="_blank" rel="noreferrer noopener" className="group flex flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-foreground group-hover:text-primary">{n.title}</div>
                  <span className="shrink-0 text-xs" style={{ color: tone }}>{n.sentiment}</span>
                </div>
                <div className="text-xs text-muted-foreground">{n.source} · {n.date}</div>
                <p className="text-sm text-muted-foreground">{n.summary}</p>
                <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
                  Read source <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}