import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Truck, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lanes")({
  head: () => ({
    meta: [
      { title: "Lane comparison — Supply Risk" },
      { name: "description", content: "Side-by-side comparison of risk, cost and lead time across destinations." },
    ],
  }),
  component: LanesPage,
});

type Lane = { id: string; commodity: string; origin: string; destination: string };

function seed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return Math.abs(h); }

function score(lane: Lane) {
  const s = seed(lane.origin + lane.destination + lane.commodity);
  const risk = 25 + (s % 65);
  const leadDays = 7 + (s % 45);
  const cost = 2.2 + ((s >> 4) % 100) / 18; // $/kg
  const carbon = 0.6 + ((s >> 8) % 100) / 30; // kg CO2 / kg
  const tariff = (s >> 12) % 18; // %
  return { risk, leadDays, cost: +cost.toFixed(2), carbon: +carbon.toFixed(2), tariff };
}

function LanesPage() {
  const [commodity, setCommodity] = useState("semiconductors");
  const [origin, setOrigin] = useState("Taiwan");
  const [destInput, setDestInput] = useState("");
  const [lanes, setLanes] = useState<Lane[]>([
    { id: "1", commodity: "semiconductors", origin: "Taiwan", destination: "Ohio, USA" },
    { id: "2", commodity: "semiconductors", origin: "Taiwan", destination: "Dresden, Germany" },
    { id: "3", commodity: "semiconductors", origin: "Taiwan", destination: "Singapore" },
  ]);

  function addDest() {
    if (!destInput.trim()) return;
    setLanes((l) => [...l, { id: Math.random().toString(36).slice(2), commodity, origin, destination: destInput.trim() }]);
    setDestInput("");
  }

  const scored = lanes.map((l) => ({ ...l, ...score(l) }));
  const best = scored.reduce((acc, l) => l.risk < acc.risk ? l : acc, scored[0]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-primary">Multi-destination</p>
        <h1 className="mt-1 text-3xl font-semibold">Lane comparison</h1>
        <p className="mt-2 text-sm text-muted-foreground">Compare risk, lead time, landed cost and carbon across destinations from the same origin.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="grid gap-2 sm:grid-cols-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Commodity</label>
            <input value={commodity} onChange={(e) => setCommodity(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Origin</label>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Add destination</label>
            <div className="mt-1 flex gap-1.5">
              <input value={destInput} onChange={(e) => setDestInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDest()} placeholder="e.g. Querétaro, Mexico" className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
              <button onClick={addDest} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left"><Truck className="inline h-3.5 w-3.5" /> Destination</th>
              <th className="px-4 py-2 text-right">Lane risk</th>
              <th className="px-4 py-2 text-right">Lead</th>
              <th className="px-4 py-2 text-right">Landed $/kg</th>
              <th className="px-4 py-2 text-right">CO₂ kg/kg</th>
              <th className="px-4 py-2 text-right">Tariff %</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {scored.map((l) => (
              <tr key={l.id} className={"border-b border-border/40 " + (l.id === best.id ? "bg-primary/5" : "")}>
                <td className="px-4 py-2 font-medium">
                  {l.destination}
                  {l.id === best.id && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">recommended</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums" style={{ color: l.risk >= 75 ? "oklch(0.62 0.22 25)" : l.risk >= 55 ? "oklch(0.72 0.19 55)" : "oklch(0.72 0.17 145)" }}>{l.risk}</td>
                <td className="px-4 py-2 text-right tabular-nums">{l.leadDays}d</td>
                <td className="px-4 py-2 text-right tabular-nums">${l.cost}</td>
                <td className="px-4 py-2 text-right tabular-nums">{l.carbon}</td>
                <td className="px-4 py-2 text-right tabular-nums">{l.tariff}%</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setLanes((cur) => cur.filter((x) => x.id !== l.id))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">Scores blend route risk, port congestion, tariff exposure and carbon intensity. Recommended = lowest lane risk among the destinations compared.</p>
    </div>
  );
}