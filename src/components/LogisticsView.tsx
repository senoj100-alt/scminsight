import { useState } from "react";
import { ComposableMap, Geographies, Geography, Line, Marker } from "react-simple-maps";
import { Plane, Ship, Truck, AlertTriangle, MapPin, ArrowRight, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntityData } from "@/lib/entity.functions";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Mode = NonNullable<EntityData["logistics"]>["modes"][number];

const MODE_META: Record<Mode["mode"], { label: string; color: string; icon: typeof Plane }> = {
  air: { label: "Air freight", color: "oklch(0.7 0.15 200)", icon: Plane },
  sea: { label: "Sea freight", color: "oklch(0.78 0.16 75)", icon: Ship },
  road: { label: "Road / inland", color: "oklch(0.72 0.17 145)", icon: Truck },
};

export function LogisticsView({ logistics }: { logistics: NonNullable<EntityData["logistics"]> }) {
  const feasibleModes = logistics.modes.filter((m) => m.feasible);
  const initial = logistics.modes.find((m) => m.mode === logistics.recommended_mode) ?? feasibleModes[0] ?? logistics.modes[0];
  const [activeMode, setActiveMode] = useState<Mode["mode"]>(initial.mode);
  const current = logistics.modes.find((m) => m.mode === activeMode) ?? initial;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Logistics · {logistics.origin.name} <ArrowRight className="inline h-3.5 w-3.5 text-muted-foreground" /> {logistics.destination.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{logistics.summary}</p>
        </div>
        <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          Recommended: {MODE_META[logistics.recommended_mode].label}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {logistics.modes.map((m) => {
          const meta = MODE_META[m.mode];
          const isActive = m.mode === activeMode;
          return (
            <button
              key={m.mode}
              onClick={() => setActiveMode(m.mode)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                isActive ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                !m.feasible && "opacity-60"
              )}
            >
              <meta.icon className="h-4 w-4" />
              {meta.label}
              {!m.feasible && <span className="text-[10px] uppercase tracking-wider">N/A</span>}
            </button>
          );
        })}
      </div>

      <LogisticsMap mode={current} />

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Stat icon={Clock} label="Lead time" value={`${current.lead_time_days.typical} days`} sub={`${current.lead_time_days.min}–${current.lead_time_days.max} day range`} />
        <Stat icon={DollarSign} label="Avg. cost" value={current.avg_cost} />
        <Stat icon={CheckCircle2} label="Recommended mode" value={MODE_META[logistics.recommended_mode].label} sub={current.mode === logistics.recommended_mode ? "currently viewing" : "compare modes →"} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: MODE_META[current.mode].color }}>
            <AlertTriangle className="h-4 w-4" /> Risk factors
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {current.risks.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-muted-foreground/50">•</span><span>{r}</span></li>
            ))}
          </ul>
          {current.alternative && (
            <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs text-primary">
              <span className="font-medium">Alternative:</span> {current.alternative}
            </div>
          )}
        </div>
        <div className="rounded-md border border-border bg-background/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" /> Route waypoints
          </div>
          <ol className="space-y-1.5 text-sm">
            {current.route.map((wp, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{i + 1}</span>
                <span className="text-foreground">{wp.name}</span>
                <span className="text-xs text-muted-foreground">· {wp.type}</span>
              </li>
            ))}
          </ol>
          {current.notes && <p className="mt-3 text-xs text-muted-foreground">{current.notes}</p>}
        </div>
      </div>
    </div>
  );
}

function LogisticsMap({ mode }: { mode: Mode }) {
  const color = MODE_META[mode.mode].color;
  const pts = mode.route;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background/40">
      <ComposableMap projectionConfig={{ scale: 145 }} width={900} height={420} style={{ width: "100%", height: "auto" }}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: "oklch(0.26 0.025 250)", stroke: "oklch(0.35 0.03 250)", strokeWidth: 0.4, outline: "none" },
                  hover: { fill: "oklch(0.26 0.025 250)", outline: "none" },
                  pressed: { fill: "oklch(0.26 0.025 250)", outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
        {pts.slice(0, -1).map((p, i) => (
          <Line
            key={i}
            from={[p.lng, p.lat]}
            to={[pts[i + 1].lng, pts[i + 1].lat]}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={mode.mode === "air" ? "5 4" : mode.mode === "road" ? "1 3" : "0"}
          />
        ))}
        {pts.map((p, i) => {
          const isEnd = i === 0 || i === pts.length - 1;
          return (
            <Marker key={i} coordinates={[p.lng, p.lat]}>
              <circle r={isEnd ? 5 : 3} fill={color} stroke="oklch(0.96 0.01 250)" strokeWidth={isEnd ? 1.5 : 1} />
              {isEnd && (
                <text x={8} y={4} fontSize={10} fill="oklch(0.92 0.01 250)">{p.name}</text>
              )}
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Clock; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}