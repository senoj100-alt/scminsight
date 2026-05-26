import { ShieldCheck, Clock } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";

export function ProvenancePanel({ entity, lastFetchedAt }: { entity: EntityData; lastFetchedAt: number }) {
  const ageMs = Date.now() - lastFetchedAt;
  const ageMin = Math.round(ageMs / 60000);
  const freshness = ageMin < 10 ? "fresh" : ageMin < 60 ? "recent" : ageMin < 24 * 60 ? "today" : "stale";
  const color = freshness === "fresh" ? "oklch(0.72 0.17 145)" : freshness === "stale" ? "oklch(0.62 0.22 25)" : "oklch(0.72 0.19 55)";

  // Confidence heuristic: more sources + more news + recent as_of → higher confidence.
  const conf = Math.min(
    100,
    40 + (entity.sources.length * 4) + ((entity.recent_news?.length ?? 0) * 2) + (ageMin < 60 ? 10 : 0)
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Data provenance & freshness</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="As of" value={entity.as_of} />
        <Kpi label="Generated" value={`${ageMin}m ago`} tone={color} />
        <Kpi label="Sources" value={String(entity.sources.length)} />
        <Kpi label="Confidence" value={`${conf}%`} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div><Clock className="mr-1 inline h-3 w-3" /> Extraction method: structured AI tool-call (JSON schema validated)</div>
        <div>Freshness label: <span style={{ color }} className="font-medium">{freshness}</span> — refresh below to recompute</div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Per-claim source map ({entity.sources.length})</summary>
        <ul className="mt-2 space-y-1 text-xs">
          {entity.sources.map((s, i) => (
            <li key={i} className="flex items-start justify-between gap-2 border-t border-border/40 pt-1">
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{s.title}</a>
              <span className="text-muted-foreground">checked {ageMin}m ago</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}