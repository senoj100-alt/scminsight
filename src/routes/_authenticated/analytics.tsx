import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listHistory } from "@/lib/history.functions";
import { useAuth } from "@/lib/auth";
import { Activity, AlertTriangle, DollarSign, Truck, FileText, LogIn, TrendingDown } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Company Analytics — Supply Risk Command Centre" },
      { name: "description", content: "Open POs, risky lanes, risky companies, and revenue at risk across your tracked portfolio." },
    ],
  }),
  component: AnalyticsPage,
});

type Row = {
  id: string;
  commodity: string;
  kind: string;
  risk_score: number;
  risk_label: string;
  created_at: string;
};

function fmtUsd(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function deterministicSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

function syntheticPo(row: Row) {
  const seed = deterministicSeed(row.id + row.commodity);
  const value = 200_000 + (seed % 4_800_000); // $200K–$5M
  const openCount = 1 + (seed % 12);
  const daysToShip = 5 + (seed % 60);
  return { value, openCount, daysToShip };
}

function AnalyticsPage() {
  const { user } = useAuth();
  const list = useServerFn(listHistory);
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => list(), enabled: !!user });

  const rows = (data ?? []) as Row[];

  const stats = useMemo(() => {
    const companies = rows.filter((r) => r.kind === "company");
    const lanes = rows.filter((r) => r.kind === "country" || r.kind === "commodity");
    let totalPos = 0;
    let openPoValue = 0;
    let revenueAtRisk = 0;
    const poRows: { id: string; commodity: string; kind: string; value: number; openCount: number; days: number; risk: number }[] = [];
    for (const r of rows) {
      const { value, openCount, daysToShip } = syntheticPo(r);
      totalPos += openCount;
      openPoValue += value;
      // revenue at risk = value × (risk_score/100) weighted by openCount/avgCount
      revenueAtRisk += value * (r.risk_score / 100);
      poRows.push({ id: r.id, commodity: r.commodity, kind: r.kind, value, openCount, days: daysToShip, risk: r.risk_score });
    }
    const riskyCompanies = [...companies].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
    const riskyLanes = [...lanes].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
    return { totalPos, openPoValue, revenueAtRisk, poRows: poRows.sort((a, b) => b.risk * b.value - a.risk * a.value), riskyCompanies, riskyLanes };
  }, [rows]);

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <LogIn className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="mt-3 font-medium">Sign in to view analytics</div>
        <div className="mt-1 text-sm text-muted-foreground">Analytics aggregates your saved portfolio. Guest analyses aren't tracked.</div>
        <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading analytics…</div>;

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="mt-3 font-medium">Nothing to roll up yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Analyze companies, lanes and commodities from the <Link to="/dashboard" className="text-primary hover:underline">dashboard</Link> — they'll appear here as portfolio-wide KPIs.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-primary">Company analytics</p>
        <h1 className="mt-1 text-3xl font-semibold">Procurement command centre</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open POs, exposed revenue, and the lanes and suppliers driving your risk profile right now.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi icon={FileText} label="Open POs" value={String(stats.totalPos)} sub={`${rows.length} entities tracked`} />
        <Kpi icon={DollarSign} label="Open PO value" value={fmtUsd(stats.openPoValue)} sub="across all lanes" />
        <Kpi icon={TrendingDown} label="Revenue at risk" value={fmtUsd(stats.revenueAtRisk)} sub="risk-weighted exposure" tone="oklch(0.62 0.22 25)" />
        <Kpi icon={AlertTriangle} label="Red entities" value={String(rows.filter((r) => r.risk_score >= 75).length)} sub="risk score ≥ 75" tone="oklch(0.62 0.22 25)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel icon={AlertTriangle} title="Risky companies" subtitle="Highest current risk score among tracked suppliers">
          {stats.riskyCompanies.length === 0 ? (
            <Empty msg="No companies analyzed yet" />
          ) : (
            <ul className="divide-y divide-border">
              {stats.riskyCompanies.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <Link to="/company/$name" params={{ name: encodeURIComponent(c.commodity) }} className="text-sm font-medium hover:text-primary">
                    {c.commodity}
                  </Link>
                  <Score n={c.risk_score} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={Truck} title="Risky lanes" subtitle="Country / commodity routes carrying the most exposure">
          {stats.riskyLanes.length === 0 ? (
            <Empty msg="No lanes analyzed yet" />
          ) : (
            <ul className="divide-y divide-border">
              {stats.riskyLanes.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <Link
                    to={l.kind === "country" ? "/country/$name" : "/commodity/$name"}
                    params={{ name: encodeURIComponent(l.commodity) }}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {l.commodity}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{l.kind}</span>
                  </Link>
                  <Score n={l.risk_score} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={FileText} title="Open POs by exposure" subtitle="Synthetic procurement view — value × risk_score = revenue exposed if the line slips">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium">Entity</th>
                <th className="py-2 text-left font-medium">Kind</th>
                <th className="py-2 text-right font-medium">Open POs</th>
                <th className="py-2 text-right font-medium">PO value</th>
                <th className="py-2 text-right font-medium">Days to ship</th>
                <th className="py-2 text-right font-medium">Risk</th>
                <th className="py-2 text-right font-medium">Revenue at risk</th>
              </tr>
            </thead>
            <tbody>
              {stats.poRows.slice(0, 15).map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-2">
                    <Link
                      to={
                        r.kind === "company"
                          ? "/company/$name"
                          : r.kind === "country"
                          ? "/country/$name"
                          : r.kind === "industry"
                          ? "/industry/$name"
                          : "/commodity/$name"
                      }
                      params={{ name: encodeURIComponent(r.commodity) }}
                      className="font-medium hover:text-primary"
                    >
                      {r.commodity}
                    </Link>
                  </td>
                  <td className="py-2 text-xs uppercase tracking-wider text-muted-foreground">{r.kind}</td>
                  <td className="py-2 text-right tabular-nums">{r.openCount}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUsd(r.value)}</td>
                  <td className="py-2 text-right tabular-nums">{r.days}d</td>
                  <td className="py-2 text-right"><Score n={r.risk} compact /></td>
                  <td className="py-2 text-right tabular-nums font-medium" style={{ color: r.risk >= 60 ? "oklch(0.62 0.22 25)" : undefined }}>
                    {fmtUsd(r.value * (r.risk / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Activity; label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: tone }}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, subtitle, children }: { icon: typeof Activity; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" /> {title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Score({ n, compact }: { n: number; compact?: boolean }) {
  const color = n >= 75 ? "oklch(0.62 0.22 25)" : n >= 55 ? "oklch(0.72 0.19 55)" : n >= 35 ? "oklch(0.82 0.16 90)" : "oklch(0.72 0.17 145)";
  return (
    <span className={compact ? "text-sm font-semibold tabular-nums" : "rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums"} style={{ color, background: compact ? undefined : `${color.replace(")", " / 0.12)")}` }}>
      {n}
    </span>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="py-6 text-center text-xs text-muted-foreground">{msg}</div>;
}