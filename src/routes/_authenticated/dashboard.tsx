import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Building2, Globe2, Factory, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Kind = "commodity" | "company" | "country" | "industry";

const TABS: { key: Kind; label: string; icon: typeof TrendingUp; placeholder: string; suggestions: string[] }[] = [
  {
    key: "commodity", label: "Commodity", icon: Boxes,
    placeholder: "e.g. Lithium, Crude Oil, Coffee…",
    suggestions: ["Lithium", "Copper", "Cobalt", "Nickel", "Crude Oil", "Natural Gas", "Wheat", "Coffee", "Cocoa", "Palladium", "Rare Earths", "Semiconductors"],
  },
  {
    key: "company", label: "Company", icon: Building2,
    placeholder: "e.g. TSMC, Glencore, Maersk…",
    suggestions: ["TSMC", "Glencore", "BHP", "Maersk", "Foxconn", "BASF", "Samsung Electronics", "Cargill"],
  },
  {
    key: "country", label: "Country / region", icon: Globe2,
    placeholder: "e.g. DR Congo, Taiwan, Chile…",
    suggestions: ["DR Congo", "Taiwan", "Chile", "Indonesia", "Russia", "Saudi Arabia", "Vietnam", "Mexico"],
  },
  {
    key: "industry", label: "Industry", icon: Factory,
    placeholder: "e.g. EV batteries, Semiconductors…",
    suggestions: ["EV batteries", "Semiconductors", "Pharmaceuticals", "Apparel", "Aerospace", "Solar PV", "Steel", "Shipping"],
  },
];

function Dashboard() {
  const [tab, setTab] = useState<Kind>("commodity");
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const active = TABS.find((t) => t.key === tab)!;

  const go = (name: string) => {
    const t = name.trim();
    if (!t) return;
    const encoded = encodeURIComponent(t);
    switch (tab) {
      case "commodity": return navigate({ to: "/commodity/$name", params: { name: encoded } });
      case "company": return navigate({ to: "/company/$name", params: { name: encoded } });
      case "country": return navigate({ to: "/country/$name", params: { name: encoded } });
      case "industry": return navigate({ to: "/industry/$name", params: { name: encoded } });
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-primary">Analyze</p>
        <h1 className="mt-2 text-3xl font-semibold">Search any supply-chain entity</h1>
        <p className="mt-2 text-muted-foreground">
          Pick a category, then type any commodity, company, country, or industry. We generate live-style risk scores, a 2×2 response matrix, and (for companies) a Tier 1–3 supplier network.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setQ(""); }}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
              tab === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex max-w-2xl gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={active.placeholder}
          className="h-12 text-base"
        />
        <Button type="submit" size="lg">
          <TrendingUp className="mr-2 h-4 w-4" /> Analyze
        </Button>
      </form>

      <div className="mt-8">
        <div className="mb-3 text-sm text-muted-foreground">Or pick one</div>
        <div className="flex flex-wrap gap-2">
          {active.suggestions.map((s) => (
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