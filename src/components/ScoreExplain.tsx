import { useMemo } from "react";
import { Scale, Info } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";
import { useUserSettings } from "@/lib/user-settings";

// Waterfall-style explainability: shows how category scores + weights + signals roll up.
export function ScoreExplain({ entity }: { entity: EntityData }) {
  const { settings } = useUserSettings();
  const weights = settings.weights || {};
  const rows = useMemo(() => {
    const cats = entity.categories.map((c) => ({
      key: c.key,
      name: c.name,
      score: c.score,
      weight: typeof weights[c.key] === "number" ? weights[c.key] : 1,
    }));
    const totalW = cats.reduce((a, b) => a + b.weight, 0) || 1;
    const weighted = cats.reduce((a, b) => a + (b.score * b.weight) / totalW, 0);
    return { cats, totalW, weighted: Math.round(weighted) };
  }, [entity, weights]);

  // Signal modifiers (transparency)
  const signals: { label: string; delta: number; reason: string }[] = [];
  if (entity.financial_health) {
    const z = entity.financial_health.altman_z;
    if (z < 1.8) signals.push({ label: "Financial distress", delta: +8, reason: `Altman Z = ${z.toFixed(2)} (distress zone)` });
    else if (z > 3) signals.push({ label: "Financial strength", delta: -4, reason: `Altman Z = ${z.toFixed(2)} (safe zone)` });
  }
  if (entity.sanctions && entity.sanctions.status !== "clear") {
    signals.push({ label: "Sanctions exposure", delta: entity.sanctions.status === "sanctioned" ? +25 : +12, reason: `Status: ${entity.sanctions.status} (${entity.sanctions.lists.join(", ") || "—"})` });
  }
  if (entity.recent_news) {
    const neg = entity.recent_news.filter((n) => n.sentiment === "negative").length;
    const pos = entity.recent_news.filter((n) => n.sentiment === "positive").length;
    const net = neg - pos;
    if (Math.abs(net) >= 2) signals.push({ label: "News sentiment", delta: net * 1.5, reason: `${neg} negative vs ${pos} positive in last 90d` });
  }
  if (entity.historical_performance) {
    const p = entity.historical_performance;
    if (p.on_time_delivery_pct < 85) signals.push({ label: "Delivery reliability", delta: +5, reason: `OTD ${p.on_time_delivery_pct.toFixed(1)}% < 85%` });
    if (p.trend_12mo === "deteriorating") signals.push({ label: "Trend", delta: +3, reason: "Deteriorating 12-mo trend" });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(rows.weighted + signals.reduce((a, b) => a + b.delta, 0))));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Score explainability</h3>
        <span className="text-xs text-muted-foreground">how {entity.overall_score} was built</span>
      </div>
      <div className="space-y-2">
        {rows.cats.map((c) => {
          const contrib = ((c.score * c.weight) / rows.totalW).toFixed(1);
          const pct = (c.score / 100) * 100;
          return (
            <div key={c.key}>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{c.name} · weight {((c.weight / rows.totalW) * 100).toFixed(0)}%</span>
                <span className="tabular-nums">{c.score} → +{contrib}</span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary/60" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {signals.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Signal adjustments</div>
          <ul className="space-y-1.5 text-sm">
            {signals.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground"><Info className="mr-1 inline h-3 w-3" />{s.label} <span className="text-xs">— {s.reason}</span></span>
                <span className="tabular-nums font-medium" style={{ color: s.delta > 0 ? "oklch(0.62 0.22 25)" : "oklch(0.72 0.17 145)" }}>
                  {s.delta > 0 ? "+" : ""}{s.delta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm font-medium">Final reconciled score</span>
        <span className="text-2xl font-semibold tabular-nums">{finalScore}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Reproducible breakdown — adjust category weights in Settings to rerun the waterfall. Use this to defend the score in review meetings.
      </p>
    </div>
  );
}