import type { Velocity } from "@/lib/score-history";

export function VelocityBadge({ v, compact }: { v: Velocity | null; compact?: boolean }) {
  if (!v) return compact ? null : <span className="text-xs text-muted-foreground">Insufficient history</span>;
  const sign = v.delta > 0 ? "+" : "";
  return (
    <span
      className={compact ? "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium" : "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"}
      style={{ color: v.color, background: v.color.replace(")", " / 0.12)") }}
      title={`30-day change: ${sign}${v.delta}`}
    >
      <span>{v.arrow}</span>
      <span>{v.label}</span>
      {!compact && <span className="tabular-nums opacity-80">({sign}{v.delta})</span>}
    </span>
  );
}

export function DeltaSinceVisit({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const up = delta > 0;
  const color = up ? "oklch(0.62 0.22 25)" : "oklch(0.72 0.17 145)";
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ color, background: color.replace(")", " / 0.12)") }}>
      {up ? "↑" : "↓"} {up ? "+" : ""}{delta} since last visit
    </span>
  );
}