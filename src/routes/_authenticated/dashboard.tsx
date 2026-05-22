import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const SUGGESTIONS = [
  "Lithium", "Copper", "Cobalt", "Nickel", "Crude Oil", "Natural Gas",
  "Wheat", "Coffee", "Cocoa", "Palladium", "Rare Earths", "Semiconductors",
];

function Dashboard() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const go = (name: string) => {
    const t = name.trim();
    if (!t) return;
    navigate({ to: "/commodity/$name", params: { name: encodeURIComponent(t) } });
  };

  return (
    <div>
      <div className="mb-10">
        <p className="text-sm uppercase tracking-widest text-primary">Analyze</p>
        <h1 className="mt-2 text-3xl font-semibold">Pick a commodity to assess</h1>
        <p className="mt-2 text-muted-foreground">
          Type any commodity. We'll generate a sourcing map, risk scores, price forecast, and hedge recommendation.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); go(q); }}
        className="flex max-w-2xl gap-2"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Lithium, Crude Oil, Coffee, Semiconductors…"
          className="h-12 text-base"
        />
        <Button type="submit" size="lg">
          <TrendingUp className="mr-2 h-4 w-4" /> Analyze
        </Button>
      </form>

      <div className="mt-10">
        <div className="mb-3 text-sm text-muted-foreground">Or pick one</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => go(s)}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}