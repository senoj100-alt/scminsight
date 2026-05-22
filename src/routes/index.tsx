import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Globe2, TrendingUp, ShieldAlert, Activity } from "lucide-react";
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
          <p className="mb-3 text-sm uppercase tracking-widest text-primary">Commodity intelligence</p>
          <h1 className="text-5xl font-semibold leading-tight md:text-6xl">
            See the risk in every shipment.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            AI-driven supply-chain risk scoring, sourcing maps, price forecasts and
            hedge recommendations for any commodity — from lithium to wheat.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild>
              <Link to={user ? "/dashboard" : "/login"}>
                {user ? "Analyze a commodity" : "Sign in with Google"}
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-20 grid gap-6 md:grid-cols-4">
          {[
            { i: Globe2, t: "Sourcing map", d: "World map color-coded by country risk" },
            { i: TrendingUp, t: "Price forecast", d: "6-month outlook with hedge signal" },
            { i: ShieldAlert, t: "Risk scores", d: "Short + long-term with cited sources" },
            { i: Activity, t: "Concentration", d: "Country & company HHI metrics" },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-medium">{t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
