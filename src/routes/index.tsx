import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Globe2, TrendingUp, ShieldAlert, Activity, Building2, Factory, Boxes, Ship, Network, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 text-primary" />
            SupplyRisk
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button asChild><Link to="/dashboard">Open dashboard</Link></Button>
            ) : (
              <Button asChild><Link to="/login">Sign in</Link></Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm uppercase tracking-widest text-primary">Supply-chain risk intelligence</p>
          <h1 className="text-5xl font-semibold leading-tight md:text-6xl">
            See the risk in every shipment, supplier and shipping lane.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            AI-generated risk profiles for any <strong className="text-foreground">commodity, company, country or industry</strong>.
            Sourcing maps, supplier networks, lane-by-lane logistics, price forecasts, news feeds
            and concrete recommendations — tailored to where <em>you</em> ship to.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild>
              <Link to={user ? "/dashboard" : "/login"}>
                {user ? "Open dashboard" : "Sign in with Google"}
              </Link>
            </Button>
          </div>
        </div>

        <section className="mt-20">
          <h2 className="text-sm uppercase tracking-widest text-primary">Search any entity</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              { i: Boxes, t: "Commodities", d: "Price trend, 6-mo forecast, hedge signal, sourcing risk map." },
              { i: Building2, t: "Companies", d: "Operational, financial, reputational & structural risk. Click any supplier to drill in." },
              { i: Globe2, t: "Countries", d: "Disaster, geopolitical & fiscal risk for any region." },
              { i: Factory, t: "Industries", d: "CR4 supplier concentration, tech obsolescence and monopoly dependency." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-lg border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-medium">{t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-sm uppercase tracking-widest text-primary">What you get inside every report</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
              { i: Ship, t: "Lane-level logistics", d: "Air / sea / road lead times, costs, port-by-port routing on a world map — tailored to your destination country." },
              { i: ShieldAlert, t: "Mode-specific risks", d: "Port congestion, war reroutes, fuel & insurance trends, plus alternative ports." },
              { i: Network, t: "Supplier networks", d: "Tier 1→3 visualisation. Click any supplier to open its full company risk profile." },
              { i: TrendingUp, t: "Price forecasts", d: "12-month history + 6-month forecast with hedge / buy-now / buy-later signals." },
              { i: Activity, t: "Performance & KPIs", d: "On-time delivery, lead-time variation, ESG, credit, fines, concentration metrics." },
              { i: Newspaper, t: "Latest news", d: "Five most recent supply-chain-relevant stories with cited sources." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-lg border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-medium">{t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
