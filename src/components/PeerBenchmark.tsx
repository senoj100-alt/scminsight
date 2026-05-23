import { TrendingUp } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";

export function PeerBenchmark({ benchmark }: { benchmark: NonNullable<EntityData["peer_benchmark"]> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Peer benchmarking · {benchmark.industry}</h3>
        </div>
        <span className="text-xs text-muted-foreground">company vs. peer median vs. top quartile</span>
      </div>
      <div className="space-y-3">
        {benchmark.metrics.map((m, i) => {
          const vals = [m.company, m.peer_median, m.top_quartile];
          const max = Math.max(...vals.map((v) => Math.abs(v))) || 1;
          const companyVsMedian = m.higher_is_better ? m.company - m.peer_median : m.peer_median - m.company;
          const tone = companyVsMedian >= 0 ? "oklch(0.72 0.17 145)" : "oklch(0.62 0.22 25)";
          return (
            <div key={i} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium">{m.label}</div>
                <div className="text-xs" style={{ color: tone }}>
                  {companyVsMedian >= 0 ? "▲" : "▼"} {Math.abs(companyVsMedian).toFixed(1)} vs peer median
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <Bar label="Company" value={m.company} unit={m.unit} pct={(Math.abs(m.company) / max) * 100} color="oklch(0.78 0.16 75)" />
                <Bar label="Peer median" value={m.peer_median} unit={m.unit} pct={(Math.abs(m.peer_median) / max) * 100} color="oklch(0.68 0.02 250)" />
                <Bar label="Top quartile" value={m.top_quartile} unit={m.unit} pct={(Math.abs(m.top_quartile) / max) * 100} color="oklch(0.72 0.17 145)" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{benchmark.commentary}</p>
    </div>
  );
}

function Bar({ label, value, unit, pct, color }: { label: string; value: number; unit?: string; pct: number; color: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color }}>{value.toFixed(1)}{unit ? ` ${unit}` : ""}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}