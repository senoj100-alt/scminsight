import { useMemo } from "react";
import type { EntityData } from "@/lib/entity.functions";

function riskColor(score: number) {
  if (score >= 75) return "oklch(0.62 0.22 25)";
  if (score >= 55) return "oklch(0.72 0.19 55)";
  if (score >= 35) return "oklch(0.82 0.16 90)";
  return "oklch(0.72 0.17 145)";
}

// Simple tier-columnar layout: tier 3 (raw) left → tier 1 (direct) right → focal company
export function SupplierNetwork({
  company,
  network,
  onNodeCountry,
}: {
  company: string;
  network: NonNullable<EntityData["supplier_network"]>;
  onNodeCountry?: (country: string) => void;
}) {
  const layout = useMemo(() => {
    const byTier: Record<number, typeof network.nodes> = { 1: [], 2: [], 3: [] };
    for (const n of network.nodes) byTier[n.tier]?.push(n);

    const width = 900;
    const height = Math.max(360, 80 + Math.max(byTier[1].length, byTier[2].length, byTier[3].length) * 46);
    const cols = [
      { tier: 3, x: 100, label: "Tier 3 · raw / sub-component" },
      { tier: 2, x: 360, label: "Tier 2" },
      { tier: 1, x: 620, label: "Tier 1 · direct supplier" },
    ];
    const focal = { id: "__focal__", name: company, x: 850, y: height / 2 };

    const positions: Record<string, { x: number; y: number; tier: number }> = {};
    for (const c of cols) {
      const nodes = byTier[c.tier];
      const gap = (height - 40) / Math.max(1, nodes.length);
      nodes.forEach((n, i) => {
        positions[n.id] = { x: c.x, y: 20 + gap * (i + 0.5), tier: c.tier };
      });
    }
    return { width, height, cols, focal, positions, byTier };
  }, [network, company]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Supplier network · Tier 1 → 3</h3>
        <div className="text-xs text-muted-foreground">
          Double-click a node to inspect its country
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          height={layout.height}
          style={{ minWidth: 720 }}
        >
          {/* column headers */}
          {layout.cols.map((c) => (
            <text
              key={c.tier}
              x={c.x}
              y={14}
              textAnchor="middle"
              fontSize="11"
              fill="oklch(0.68 0.02 250)"
            >
              {c.label}
            </text>
          ))}
          <text x={layout.focal.x} y={14} textAnchor="middle" fontSize="11" fill="oklch(0.78 0.16 75)">
            {company}
          </text>

          {/* edges */}
          {network.edges.map((e, i) => {
            const a = layout.positions[e.from];
            const b = e.to === "__focal__" || !layout.positions[e.to]
              ? layout.focal
              : layout.positions[e.to];
            if (!a) return null;
            const c1x = (a.x + b.x) / 2;
            return (
              <path
                key={i}
                d={`M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c1x} ${b.y}, ${b.x} ${b.y}`}
                stroke="oklch(0.4 0.03 250)"
                strokeWidth={1}
                fill="none"
                opacity={0.7}
              />
            );
          })}
          {/* implicit tier1 → focal edges if missing */}
          {layout.byTier[1].map((n) => (
            <path
              key={`f-${n.id}`}
              d={`M ${layout.positions[n.id].x} ${layout.positions[n.id].y} C ${(layout.positions[n.id].x + layout.focal.x) / 2} ${layout.positions[n.id].y}, ${(layout.positions[n.id].x + layout.focal.x) / 2} ${layout.focal.y}, ${layout.focal.x} ${layout.focal.y}`}
              stroke="oklch(0.78 0.16 75 / 0.5)"
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="none"
            />
          ))}

          {/* nodes */}
          {network.nodes.map((n) => {
            const p = layout.positions[n.id];
            if (!p) return null;
            const r = 8;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                style={{ cursor: n.country ? "pointer" : "default" }}
                onDoubleClick={() => n.country && onNodeCountry?.(n.country)}
              >
                <circle r={r} fill={riskColor(n.risk)} stroke="oklch(0.96 0.01 250 / 0.6)" strokeWidth={1} />
                <text
                  x={p.tier === 1 ? -12 : 12}
                  y={3}
                  textAnchor={p.tier === 1 ? "end" : "start"}
                  fontSize="10"
                  fill="oklch(0.92 0.01 250)"
                >
                  {n.name}
                  {n.country ? ` · ${n.country}` : ""}
                </text>
              </g>
            );
          })}

          {/* focal node */}
          <g transform={`translate(${layout.focal.x},${layout.focal.y})`}>
            <circle r={14} fill="oklch(0.78 0.16 75)" />
            <circle r={20} fill="none" stroke="oklch(0.78 0.16 75 / 0.4)" strokeWidth={1} />
          </g>
        </svg>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Color = supplier risk score · circle size fixed for legibility
      </div>
    </div>
  );
}