import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listHistory } from "@/lib/history.functions";
import { LayoutGrid, AlertTriangle, ShieldCheck, ShieldAlert, Activity, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useScoreHistory, latestFor, velocityFor, deltaSinceLastVisit, scoreHistory } from "@/lib/score-history";
import { VelocityBadge, DeltaSinceVisit } from "@/components/VelocityBadge";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

function rag(score: number) {
  if (score >= 75) return { label: "Red", color: "oklch(0.62 0.22 25)", bg: "oklch(0.62 0.22 25 / 0.12)" };
  if (score >= 55) return { label: "Amber", color: "oklch(0.72 0.19 55)", bg: "oklch(0.72 0.19 55 / 0.12)" };
  if (score >= 35) return { label: "Yellow", color: "oklch(0.82 0.16 90)", bg: "oklch(0.82 0.16 90 / 0.12)" };
  return { label: "Green", color: "oklch(0.72 0.17 145)", bg: "oklch(0.72 0.17 145 / 0.12)" };
}

function routeFor(kind: string) {
  if (kind === "company") return "/company/$name" as const;
  if (kind === "country") return "/country/$name" as const;
  if (kind === "industry") return "/industry/$name" as const;
  return "/commodity/$name" as const;
}

type Row = { id: string; commodity: string; kind: string; risk_score: number; risk_label: string; created_at: string };

function PortfolioPage() {
  const { user } = useAuth();
  const list = useServerFn(listHistory);
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => list(), enabled: !!user });
  const history = useScoreHistory();

  // Merge stored history latest scores into the rows for live monitoring
  const rows: Row[] = ((data ?? []) as Row[]).map((r) => {
    const key = `${r.kind}:${r.commodity}`;
    const live = latestFor(history, key);
    return live ? { ...r, risk_score: live.score } : r;
  });

  // Mark visited AFTER reading deltas so user sees them at least once.
  useEffect(() => {
    return () => {
      scoreHistory.markPortfolioVisited();
    };
  }, []);

  const groups = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const k = r.kind ?? "commodity";
    (acc[k] ||= []).push(r);
    return acc;
  }, {});

  const totalCount = rows.length;
  const redCount = rows.filter((r) => r.risk_score >= 75).length;
  const amberCount = rows.filter((r) => r.risk_score >= 55 && r.risk_score < 75).length;
  const greenCount = rows.filter((r) => r.risk_score < 35).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-primary">Command centre</p>
        <h1 className="mt-1 text-3xl font-semibold">Portfolio risk heatmap</h1>
        <p className="mt-2 text-sm text-muted-foreground">Every entity you've analyzed, scored live from your monitoring history.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat icon={LayoutGrid} label="Tracked entities" value={totalCount} />
        <Stat icon={AlertTriangle} label="Red (≥75)" value={redCount} tone="oklch(0.62 0.22 25)" />
        <Stat icon={ShieldAlert} label="Amber (55–74)" value={amberCount} tone="oklch(0.72 0.19 55)" />
        <Stat icon={ShieldCheck} label="Green (<35)" value={greenCount} tone="oklch(0.72 0.17 145)" />
      </div>

      {!user ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <LogIn className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-medium">Sign in to build a portfolio</div>
          <div className="mt-1 text-sm text-muted-foreground">Guest analyses are not tracked across sessions.</div>
          <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Sign in with Google</Link>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !totalCount ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-medium">Your portfolio is empty</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Analyze any commodity, company, country or industry from the <Link to="/dashboard" className="text-primary hover:underline">dashboard</Link> and it will appear here.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([kind, list]) => (
            <div key={kind}>
              <h2 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{kind} ({list.length})</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => {
                  const c = rag(r.risk_score);
                  const key = `${r.kind}:${r.commodity}`;
                  const vel = velocityFor(history, key, 30);
                  const delta = deltaSinceLastVisit(history, key);
                  return (
                    <Link
                      key={r.id}
                      to={routeFor(kind)}
                      params={{ name: encodeURIComponent(r.commodity) }}
                      className="block rounded-md border p-3 transition-colors hover:border-primary"
                      style={{ borderColor: `${c.color}55`, background: c.bg }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{r.commodity}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums" style={{ color: c.color }}>{r.risk_score}</div>
                          <div className="text-[10px] uppercase tracking-wider" style={{ color: c.color }}>{c.label}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <VelocityBadge v={vel} compact />
                        {delta && <DeltaSinceVisit delta={delta.delta} />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof LayoutGrid; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}
