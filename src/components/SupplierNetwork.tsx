import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  onNodeCompany,
}: {
  company: string;
  network: NonNullable<EntityData["supplier_network"]>;
  onNodeCountry?: (country: string) => void;
  onNodeCompany?: (company: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [showGhosts, setShowGhosts] = useState(true);
  const [showPulse, setShowPulse] = useState(true);

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
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-muted-foreground">
            <input type="checkbox" className="accent-primary" checked={showGhosts} onChange={(e) => setShowGhosts(e.target.checked)} /> alt suppliers
          </label>
          <label className="flex items-center gap-1 text-muted-foreground">
            <input type="checkbox" className="accent-primary" checked={showPulse} onChange={(e) => setShowPulse(e.target.checked)} /> disruption pulse
          </label>
          <button className="rounded-md border border-border p-1 hover:border-primary" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} title="Zoom out"><ZoomOut className="h-3 w-3" /></button>
          <button className="rounded-md border border-border p-1 hover:border-primary" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} title="Zoom in"><ZoomIn className="h-3 w-3" /></button>
          <button className="rounded-md border border-border p-1 hover:border-primary" onClick={() => setZoom(1)} title="Reset"><RotateCcw className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          height={layout.height * zoom}
          style={{ minWidth: 720 }}
        >
          <defs>
            <radialGradient id="pulse-grad">
              <stop offset="0%" stopColor="oklch(0.62 0.22 25 / 0.55)" />
              <stop offset="100%" stopColor="oklch(0.62 0.22 25 / 0)" />
            </radialGradient>
          </defs>
          <style>{`
            @keyframes net-pulse { 0% { r: 8; opacity: 0.8 } 100% { r: 28; opacity: 0 } }
            .pulse { animation: net-pulse 1.8s ease-out infinite; transform-origin: center; }
          `}</style>
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
            const altmanLabel = n.altman_z != null ? ` · Z ${n.altman_z.toFixed(1)}` : "";
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onNodeCompany?.(n.name)}
                onDoubleClick={() => n.country && onNodeCountry?.(n.country)}
              >
                {showPulse && n.risk >= 70 && (
                  <circle className="pulse" r={r} fill="none" stroke="oklch(0.62 0.22 25)" strokeWidth={1.5} />
                )}
                <circle r={r} fill={riskColor(n.risk)} stroke="oklch(0.96 0.01 250 / 0.6)" strokeWidth={1} />
                <text
                  x={p.tier === 1 ? -12 : 12}
                  y={3}
                  textAnchor={p.tier === 1 ? "end" : "start"}
                  fontSize="10"
                  fill="oklch(0.92 0.01 250)"
                >
                  {n.name}
                  {n.country ? ` · ${n.country}` : ""}{altmanLabel}
                </text>
                {showGhosts && n.alt_supplier && (
                  <g transform={`translate(0, ${p.tier === 1 ? -18 : 18})`}>
                    <circle r={5} fill="none" stroke="oklch(0.78 0.16 75 / 0.7)" strokeDasharray="2 2" />
                    <text
                      x={p.tier === 1 ? -10 : 10}
                      y={3}
                      textAnchor={p.tier === 1 ? "end" : "start"}
                      fontSize="9"
                      fill="oklch(0.78 0.16 75 / 0.85)"
                    >
                      alt: {n.alt_supplier}
                    </text>
                  </g>
                )}
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Color = supplier risk · pulse = high risk · dashed circle = ghost alternative supplier · Z = Altman Z-score</span>
        <span>Click supplier for profile · double-click for country</span>
      </div>
    </div>
  );
}