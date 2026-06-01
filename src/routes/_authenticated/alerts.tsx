import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Trash2, Slack, Mail, AlertTriangle, Plus, Activity } from "lucide-react";
import { useState } from "react";
import { useOps, ops } from "@/lib/ops-store";
import { useScoreHistory, systemScoreAlerts } from "@/lib/score-history";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Supply Risk" },
      { name: "description", content: "Threshold alerts across your portfolio with email and Slack delivery." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const state = useOps();
  const history = useScoreHistory();
  const sysAlerts = systemScoreAlerts(history, 5);
  const [entity, setEntity] = useState("");
  const [threshold, setThreshold] = useState(75);
  const [channel, setChannel] = useState<"in_app" | "email" | "slack">("in_app");
  const [dest, setDest] = useState("");

  async function fire(id: string) {
    const a = state.alerts.find((x) => x.id === id);
    if (!a) return;
    ops.markAlertFired(id, a.threshold);
    if (a.channel !== "in_app") {
      try {
        await fetch("/api/public/alert-deliver", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channel: a.channel,
            destination: a.channel === "email" ? a.email : a.webhook,
            subject: `[SupplyRisk] ${a.entityKey} crossed ${a.threshold}`,
            text: `Alert: ${a.kind}${a.target ? " · " + a.target : ""} on ${a.entityKey} crossed threshold ${a.threshold}.`,
          }),
        });
      } catch {}
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-primary">Alerting engine</p>
        <h1 className="mt-1 text-3xl font-semibold">Threshold alerts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fire in-app, Slack or email alerts when risk crosses your thresholds. Entity-scoped alerts also live on each report page.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-primary" /> System score-change alerts
          <span className="ml-auto text-xs text-muted-foreground">auto-fires when an entity moves ≥5 pts between refreshes</span>
        </div>
        {sysAlerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No score-change events yet. Re-analyze entities — once two snapshots differ by 5+ points an alert appears here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sysAlerts.slice(0, 10).map((a) => {
              const up = a.delta > 0;
              const color = up ? "oklch(0.62 0.22 25)" : "oklch(0.72 0.17 145)";
              return (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium">{a.name}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{a.kind}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{a.from} → {a.to}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color, background: color.replace(")", " / 0.12)") }}>
                      {up ? "↑ +" : "↓ "}{a.delta}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{new Date(a.ts).toLocaleString()}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Plus className="h-4 w-4 text-primary" /> New global alert</div>
        <div className="grid gap-2 sm:grid-cols-5">
          <input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="entity key e.g. company:TSMC" className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
          <input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
          <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
            <option value="in_app">In-app</option>
            <option value="email">Email</option>
            <option value="slack">Slack webhook</option>
          </select>
          <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder={channel === "slack" ? "https://hooks.slack.com/…" : channel === "email" ? "you@co.com" : "—"} disabled={channel === "in_app"} className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm disabled:opacity-50 sm:col-span-1" />
          <button
            onClick={() => {
              if (!entity.trim()) return;
              ops.addAlert({
                entityKey: entity.trim(),
                kind: "overall",
                threshold,
                channel,
                email: channel === "email" ? dest : undefined,
                webhook: channel === "slack" ? dest : undefined,
              });
              setEntity(""); setDest("");
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >Create</button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Tip: entity keys look like <code>company:TSMC</code>, <code>country:Vietnam</code>, <code>commodity:nickel</code>.</p>
      </div>

      {state.alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto h-6 w-6 opacity-50" />
          <div className="mt-2">No alerts yet — add one above or from any report page.</div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Entity</th>
                <th className="px-4 py-2 text-left">Trigger</th>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">Destination</th>
                <th className="px-4 py-2 text-left">Last fired</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {state.alerts.map((a) => (
                <tr key={a.id} className="border-b border-border/40">
                  <td className="px-4 py-2 font-medium">{a.entityKey}</td>
                  <td className="px-4 py-2">{a.kind}{a.target ? "·" + a.target : ""} ≥ <span className="font-semibold">{a.threshold}</span></td>
                  <td className="px-4 py-2">
                    {a.channel === "slack" ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Slack className="h-3 w-3" /> Slack</span>
                      : a.channel === "email" ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> Email</span>
                      : <span className="inline-flex items-center gap-1 text-muted-foreground"><AlertTriangle className="h-3 w-3" /> In-app</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{a.email || a.webhook || "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{a.lastFiredAt ? new Date(a.lastFiredAt).toLocaleString() : "never"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => fire(a.id)} className="mr-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">Test fire</button>
                    <button onClick={() => ops.deleteAlert(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Need entity context? Open the <Link to="/portfolio" className="text-primary hover:underline">Portfolio</Link> to see all tracked entities.
      </p>
    </div>
  );
}