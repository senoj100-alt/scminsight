import type { EntityData } from "@/lib/entity.functions";

type Quadrant = "high" | "disruptive" | "manageable" | "limited";

const QUADRANT_META: Record<Quadrant, { title: string; sub: string; color: string; bg: string }> = {
  high: {
    title: "High risk",
    sub: "Active monitoring · 24h SLA · assign owner",
    color: "oklch(0.62 0.22 25)",
    bg: "oklch(0.62 0.22 25 / 0.08)",
  },
  disruptive: {
    title: "Disruptive risk",
    sub: "Hedge · simulate · pre-built reaction plans",
    color: "oklch(0.72 0.19 55)",
    bg: "oklch(0.72 0.19 55 / 0.08)",
  },
  manageable: {
    title: "Manageable risk",
    sub: "Daily auto-tracking · email digest",
    color: "oklch(0.82 0.16 90)",
    bg: "oklch(0.82 0.16 90 / 0.08)",
  },
  limited: {
    title: "Limited risk",
    sub: "Monthly review · deprioritised queue",
    color: "oklch(0.7 0.15 200)",
    bg: "oklch(0.7 0.15 200 / 0.08)",
  },
};

function quadrantOf(r: EntityData["risks"][number]): Quadrant {
  if (r.impact === "critical" && r.detectability === "easy") return "high";
  if (r.impact === "critical" && r.detectability === "hard") return "disruptive";
  if (r.impact === "non-critical" && r.detectability === "easy") return "manageable";
  return "limited";
}

export function RiskMatrix({ risks }: { risks: EntityData["risks"] }) {
  const groups: Record<Quadrant, EntityData["risks"]> = {
    high: [], disruptive: [], manageable: [], limited: [],
  };
  for (const r of risks) groups[quadrantOf(r)].push(r);

  // grid layout: rows = impact (critical top), cols = detectability (easy left)
  const order: Quadrant[] = ["high", "disruptive", "manageable", "limited"];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">Risk matrix · response protocol</h3>
        <div className="text-xs text-muted-foreground">
          Rows: impact · Cols: detectability
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
        <div />
        <div className="pb-2 text-center text-xs uppercase tracking-wider text-muted-foreground">Easy to detect</div>
        <div className="pb-2 text-center text-xs uppercase tracking-wider text-muted-foreground">Hard to detect</div>

        <div className="flex items-center pr-2 text-xs uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] [transform:rotate(180deg)] justify-center">
          Critical impact
        </div>
        <Cell q="high" risks={groups.high} />
        <Cell q="disruptive" risks={groups.disruptive} />

        <div className="flex items-center pr-2 text-xs uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] [transform:rotate(180deg)] justify-center">
          Non-critical impact
        </div>
        <Cell q="manageable" risks={groups.manageable} />
        <Cell q="limited" risks={groups.limited} />
      </div>
      {/* legend ordered top-left, top-right, bottom-left, bottom-right */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
        {order.map((q) => (
          <div key={q} className="flex items-start gap-2">
            <span className="mt-0.5 inline-block h-2 w-2 rounded-full" style={{ background: QUADRANT_META[q].color }} />
            <div>
              <div className="text-foreground">{QUADRANT_META[q].title}</div>
              <div>{QUADRANT_META[q].sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ q, risks }: { q: Quadrant; risks: EntityData["risks"] }) {
  const m = QUADRANT_META[q];
  return (
    <div
      className="min-h-32 rounded-md border p-3"
      style={{ borderColor: `${m.color}55`, background: m.bg }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: m.color }}>{m.title}</span>
        <span className="text-xs text-muted-foreground">{risks.length}</span>
      </div>
      <ul className="space-y-1.5">
        {risks.length === 0 && <li className="text-xs text-muted-foreground/60">No items</li>}
        {risks.map((r, i) => (
          <li key={i} className="text-xs">
            <div className="text-foreground">{r.title}</div>
            <div className="text-muted-foreground">{r.action}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}