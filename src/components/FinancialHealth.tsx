import { HeartPulse } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";

export function FinancialHealth({ fh }: { fh: NonNullable<EntityData["financial_health"]> }) {
  const zone = fh.altman_z < 1.8 ? { label: "Distress", color: "oklch(0.62 0.22 25)" }
    : fh.altman_z < 3.0 ? { label: "Grey zone", color: "oklch(0.72 0.19 55)" }
    : { label: "Safe", color: "oklch(0.72 0.17 145)" };
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Financial health</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Altman Z-score</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums" style={{ color: zone.color }}>{fh.altman_z.toFixed(2)}</span>
            <span className="text-xs" style={{ color: zone.color }}>{zone.label}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">&lt;1.8 distressed · 1.8–3.0 grey · &gt;3.0 safe</div>
        </div>
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Distress probability (12mo)</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: fh.distress_probability_pct > 20 ? "oklch(0.62 0.22 25)" : fh.distress_probability_pct > 8 ? "oklch(0.72 0.19 55)" : "oklch(0.72 0.17 145)" }}>
            {fh.distress_probability_pct.toFixed(1)}%
          </div>
        </div>
        {fh.liquidity_score != null && (
          <div className="rounded-md border border-border bg-background/40 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Liquidity score</div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums">{fh.liquidity_score}</div>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{fh.commentary}</p>
    </div>
  );
}