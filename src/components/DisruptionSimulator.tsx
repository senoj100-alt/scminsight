import { useMemo, useState } from "react";
import { AlertTriangle, Zap, RotateCcw } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";

/**
 * Pick a supplier in the Tier 2/3 graph and visualize downstream exposure
 * to the focal company's Tier 1 suppliers via the edge graph.
 */
export function DisruptionSimulator({
  network,
  durationDays,
}: {
  network: NonNullable<EntityData["supplier_network"]>;
  durationDays?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState(durationDays ?? 60);

  const tier1 = useMemo(() => network.nodes.filter((n) => n.tier === 1), [network]);
  const others = useMemo(() => network.nodes.filter((n) => n.tier !== 1), [network]);

  // BFS downstream: from selected node, follow edges (from -> to) and find Tier1 reached
  const impact = useMemo(() => {
    if (!selected) return null;
    const adj: Record<string, string[]> = {};
    for (const e of network.edges) (adj[e.from] ||= []).push(e.to);
    const seen = new Set<string>([selected]);
    const queue = [selected];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of adj[cur] ?? []) {
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    const reachedTier1 = tier1.filter((n) => seen.has(n.id));
    const exposurePct = tier1.length ? (reachedTier1.length / tier1.length) * 100 : 0;
    return { reachedTier1, exposurePct };
  }, [selected, network, tier1]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Disruption simulator</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5">
            Offline duration
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 60)}
              className="w-16 rounded-md border border-border bg-background px-2 py-0.5 text-xs"
            />
            <span>days</span>
          </label>
          {selected && (
            <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Pick a Tier 2/3 supplier — we trace the edges and quantify how many of {network.nodes.length > 0 ? "your" : "the"} Tier 1 partners are downstream-exposed if it goes offline.
      </p>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Tier 2 / 3 suppliers</div>
          <div className="flex max-h-44 flex-wrap gap-1.5 overflow-auto pr-1">
            {others.length === 0 && <div className="text-xs text-muted-foreground/60">No Tier 2/3 nodes in graph</div>}
            {others.map((n) => {
              const active = selected === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setSelected(n.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  T{n.tier} · {n.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tier 1 exposure</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums" style={{ color: impact && impact.exposurePct >= 50 ? "oklch(0.62 0.22 25)" : impact && impact.exposurePct >= 25 ? "oklch(0.72 0.19 55)" : "oklch(0.72 0.17 145)" }}>
              {impact ? `${impact.exposurePct.toFixed(0)}%` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">{impact ? `${impact.reachedTier1.length}/${tier1.length} Tier 1` : "select a node"}</span>
          </div>
          {impact && impact.reachedTier1.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">Affected Tier 1:</div>
              <div className="flex flex-wrap gap-1">
                {impact.reachedTier1.map((n) => (
                  <span key={n.id} className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs">{n.name}</span>
                ))}
              </div>
            </div>
          )}
          {impact && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              Modeled supply gap: ~{Math.round((impact.exposurePct / 100) * days)} days of partial throughput loss assuming the disruption lasts {days} days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}