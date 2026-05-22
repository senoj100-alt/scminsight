import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Globe2, Gauge, Building2, Sparkles, Network, Route as RouteIcon } from "lucide-react";
import { RiskMatrix } from "./RiskMatrix";
import { SupplierNetwork } from "./SupplierNetwork";
import type { EntityData } from "@/lib/entity.functions";

function riskColor(score: number) {
  if (score >= 75) return "oklch(0.62 0.22 25)";
  if (score >= 55) return "oklch(0.72 0.19 55)";
  if (score >= 35) return "oklch(0.82 0.16 90)";
  return "oklch(0.72 0.17 145)";
}

export function EntityReport({ entity }: { entity: EntityData }) {
  const navigate = useNavigate();
  const e = entity;
  const color = riskColor(e.overall_score);

  const goCountry = (country: string) =>
    navigate({ to: "/country/$name", params: { name: encodeURIComponent(country) } });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">{e.kind} report</p>
          <h1 className="mt-1 text-4xl font-semibold">{e.name}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{e.overview}</p>
          <p className="mt-1 text-xs text-muted-foreground">As of {e.as_of}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall risk</div>
          <div className="mt-1 flex items-baseline justify-end gap-2">
            <span className="text-3xl font-semibold tabular-nums" style={{ color }}>{e.overall_score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <div className="mt-0.5 text-xs font-medium" style={{ color }}>{e.overall_label}</div>
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
        <SupplierNetwork
          company={e.name}
          network={e.supplier_network}
          onNodeCountry={(country) => goCountry(country)}
        />
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
    </div>
  );
}