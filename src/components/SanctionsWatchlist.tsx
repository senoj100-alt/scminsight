import { ShieldX, ShieldAlert, ShieldCheck } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";

export function SanctionsWatchlist({ s }: { s: NonNullable<EntityData["sanctions"]> }) {
  const meta =
    s.status === "sanctioned" ? { icon: ShieldX, color: "oklch(0.62 0.22 25)", label: "Sanctioned" } :
    s.status === "watchlist" ? { icon: ShieldAlert, color: "oklch(0.72 0.19 55)", label: "On watchlist" } :
    { icon: ShieldCheck, color: "oklch(0.72 0.17 145)", label: "Clear" };
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
        <h3 className="font-medium">Sanctions &amp; regulatory watchlist</h3>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs" style={{ background: `${meta.color}1f`, color: meta.color }}>{meta.label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {s.lists.length === 0 && <span className="text-xs text-muted-foreground">No active listings.</span>}
        {s.lists.map((l) => (
          <span key={l} className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs">{l}</span>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{s.commentary}</p>
      <p className="mt-1 text-xs text-muted-foreground">Last checked {s.last_checked}</p>
    </div>
  );
}