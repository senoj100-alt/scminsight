import { Leaf } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";

function tone(s: number) {
  if (s >= 75) return "oklch(0.62 0.22 25)";
  if (s >= 55) return "oklch(0.72 0.19 55)";
  if (s >= 35) return "oklch(0.82 0.16 90)";
  return "oklch(0.72 0.17 145)";
}

export function EsgBreakdown({ esg }: { esg: NonNullable<EntityData["esg_breakdown"]> }) {
  const rows: { label: string; value: number }[] = [
    { label: "Emissions", value: esg.emissions },
    { label: "Labor practices", value: esg.labor },
    { label: "Governance", value: esg.governance },
    { label: "Water risk", value: esg.water },
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Leaf className="h-4 w-4 text-primary" />
        <h3 className="font-medium">ESG deep-dive</h3>
        <span className="ml-auto text-xs text-muted-foreground">higher = worse</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((r) => {
          const c = tone(r.value);
          return (
            <div key={r.label} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="tabular-nums font-semibold" style={{ color: c }}>{r.value}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full" style={{ width: `${r.value}%`, background: c }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{esg.commentary}</p>
      {esg.evidence && esg.evidence.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {esg.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}