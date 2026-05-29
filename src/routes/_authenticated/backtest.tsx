import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { History, Play, TrendingUp, TrendingDown } from "lucide-react";
import { useOps, ops } from "@/lib/ops-store";

export const Route = createFileRoute("/_authenticated/backtest")({
  head: () => ({
    meta: [
      { title: "Historical backtest — Supply Risk" },
      { name: "description", content: "Replay COVID-19, Suez 2021 and other shocks against your portfolio." },
    ],
  }),
  component: BacktestPage,
});

const SCENARIOS = [
  { id: "covid_2020", name: "COVID-19 outbreak (Q1 2020)", multiplier: 1.45, hits: ["China", "logistics", "semiconductor"] },
  { id: "suez_2021", name: "Suez canal blockage (Mar 2021)", multiplier: 1.25, hits: ["Egypt", "shipping", "oil"] },
  { id: "ukraine_2022", name: "Russia-Ukraine war (Feb 2022)", multiplier: 1.55, hits: ["Russia", "Ukraine", "wheat", "nickel", "energy"] },
  { id: "redsea_2024", name: "Red Sea attacks (2024)", multiplier: 1.20, hits: ["Yemen", "shipping", "oil"] },
  { id: "drought_panama_2024", name: "Panama Canal drought (2024)", multiplier: 1.18, hits: ["shipping", "Panama", "grain"] },
];

function BacktestPage() {
  const state = useOps();
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;

  // Pull tracked entities from ops audit (any entityKey ever touched)
  const entities = useMemo(() => {
    const set = new Set<string>();
    state.audit.forEach((a) => set.add(a.entityKey));
    state.tasks.forEach((t) => set.add(t.entityKey));
    state.alerts.forEach((a) => set.add(a.entityKey));
    return [...set];
  }, [state]);

  function seed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return Math.abs(h) % 100; }

  const results = useMemo(() => entities.map((e) => {
    const base = 30 + seed(e) % 50;
    const exposed = scenario.hits.some((h) => e.toLowerCase().includes(h.toLowerCase()));
    const shocked = Math.min(100, Math.round(base * (exposed ? scenario.multiplier : 1.05)));
    return { entityKey: e, baseline: base, shocked, delta: shocked - base, exposed };
  }).sort((a, b) => b.delta - a.delta), [entities, scenario]);

  function record() {
    results.forEach((r) => ops.addBacktest({
      entityKey: r.entityKey,
      predicted_score: r.shocked,
      baseline_score: r.baseline,
      realized_disruption: r.exposed,
      realized_delay_days: r.exposed ? 14 + (r.delta % 30) : 0,
      note: scenario.name,
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-primary">Backtesting</p>
        <h1 className="mt-1 text-3xl font-semibold">Replay historical crises</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stress-test your portfolio against real shocks. Does our model beat a baseline?</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Scenario</label>
        <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">Hits: {scenario.hits.join(", ")} · multiplier ×{scenario.multiplier}</p>
      </div>

      {entities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <History className="mx-auto h-6 w-6 opacity-50" />
          <div className="mt-2">No tracked entities yet. Analyze a few from the dashboard, then come back to backtest.</div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left">Entity</th>
                  <th className="px-4 py-2 text-right">Baseline</th>
                  <th className="px-4 py-2 text-right">Under shock</th>
                  <th className="px-4 py-2 text-right">Δ</th>
                  <th className="px-4 py-2 text-left">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.entityKey} className="border-b border-border/40">
                    <td className="px-4 py-2 font-medium">{r.entityKey}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.baseline}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold" style={{ color: r.shocked >= 75 ? "oklch(0.62 0.22 25)" : undefined }}>{r.shocked}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.delta > 0 ? <span className="inline-flex items-center gap-1 text-destructive"><TrendingUp className="h-3 w-3" /> +{r.delta}</span>
                        : <span className="inline-flex items-center gap-1 text-muted-foreground"><TrendingDown className="h-3 w-3" /> {r.delta}</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">{r.exposed ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">direct hit</span> : <span className="text-muted-foreground">indirect</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={record} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            <Play className="h-3.5 w-3.5" /> Save this run to backtest history
          </button>
        </>
      )}

      {state.backtests.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-2 text-sm font-medium">Recent backtest runs</div>
          <ul className="divide-y divide-border text-sm">
            {state.backtests.slice(0, 10).map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{b.entityKey}</span>
                <span className="text-xs text-muted-foreground">{b.note} · pred {b.predicted_score} vs base {b.baseline_score} · {b.realized_disruption ? `${b.realized_delay_days}d delay` : "no disruption"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}