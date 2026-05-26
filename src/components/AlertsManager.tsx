import { useState, useEffect } from "react";
import { Bell, BellRing, Trash2 } from "lucide-react";
import { ops, useOps, alertsFor } from "@/lib/ops-store";
import type { EntityData } from "@/lib/entity.functions";

export function AlertsManager({ entity, entityKey }: { entity: EntityData; entityKey: string }) {
  const state = useOps();
  const alerts = alertsFor(state, entityKey);
  const [kind, setKind] = useState<"overall" | "category" | "supplier">("overall");
  const [target, setTarget] = useState<string>("");
  const [threshold, setThreshold] = useState(75);
  const [channel, setChannel] = useState<"in_app" | "email" | "slack">("in_app");
  const [email, setEmail] = useState("");

  // Evaluate alerts whenever entity score changes
  useEffect(() => {
    for (const a of alerts) {
      let score: number | null = null;
      if (a.kind === "overall") score = entity.overall_score;
      else if (a.kind === "category") score = entity.categories.find((c) => c.key === a.target)?.score ?? null;
      else if (a.kind === "supplier") score = entity.supplier_network?.nodes.find((n) => n.id === a.target || n.name === a.target)?.risk ?? null;
      if (score != null && score >= a.threshold) {
        const fired = a.lastFiredScore != null && Math.abs(a.lastFiredScore - score) < 1;
        if (!fired) {
          ops.markAlertFired(a.id, score);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`Risk alert: ${entity.name}`, { body: `${a.kind}${a.target ? "·" + a.target : ""} = ${score} (≥ ${a.threshold})` });
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.overall_score, alerts.length]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Alerts</h3>
        <span className="ml-auto text-xs text-muted-foreground">{alerts.length} active</span>
        <button
          onClick={() => { if (typeof window !== "undefined" && "Notification" in window) Notification.requestPermission(); }}
          className="rounded-md border border-border px-2 py-0.5 text-[11px] hover:border-primary hover:text-primary"
        >
          Enable browser notifications
        </button>
      </div>
      <div className="mb-3 grid grid-cols-[120px_1fr_90px_120px_auto] gap-1.5">
        <select value={kind} onChange={(e) => { setKind(e.target.value as never); setTarget(""); }} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
          <option value="overall">Overall</option>
          <option value="category">Category</option>
          {entity.supplier_network && <option value="supplier">Supplier</option>}
        </select>
        {kind === "overall" ? (
          <div className="rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground">Watches the overall score</div>
        ) : kind === "category" ? (
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">Select category</option>
            {entity.categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        ) : (
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">Select supplier</option>
            {entity.supplier_network?.nodes.map((n) => <option key={n.id} value={n.id}>{n.name} (T{n.tier})</option>)}
          </select>
        )}
        <input type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value) || 75)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums" />
        <select value={channel} onChange={(e) => setChannel(e.target.value as never)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
          <option value="in_app">In-app</option>
          <option value="email">Email (log)</option>
          <option value="slack">Slack (log)</option>
        </select>
        <button
          onClick={() => {
            if (kind !== "overall" && !target) return;
            ops.addAlert({ entityKey, kind, target: kind === "overall" ? undefined : target, threshold, channel, email });
          }}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          Add
        </button>
      </div>
      {channel === "email" && <input className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No alerts yet. Add a threshold above — you'll get a browser notification when it trips on next refresh.</p>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-2">
                <BellRing className="h-3.5 w-3.5 text-primary" />
                <span>{a.kind}{a.target ? ` · ${a.target}` : ""} ≥ <span className="tabular-nums font-medium">{a.threshold}</span></span>
                <span className="text-[11px] text-muted-foreground">via {a.channel}</span>
                {a.lastFiredAt && <span className="text-[11px] text-rose-500">fired @ {a.lastFiredScore} on {new Date(a.lastFiredAt).toLocaleDateString()}</span>}
              </div>
              <button onClick={() => ops.deleteAlert(a.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}