import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, AlertTriangle, TrendingDown, DollarSign, LayoutGrid, ClipboardList, Share2, Check, LogIn } from "lucide-react";
import { listHistory } from "@/lib/history.functions";
import { useAuth } from "@/lib/auth";
import { useScoreHistory, latestFor, seriesFor } from "@/lib/score-history";
import { useOps } from "@/lib/ops-store";

export const Route = createFileRoute("/_authenticated/digest")({
  head: () => ({
    meta: [
      { title: "Weekly Digest — Supply Risk" },
      { name: "description", content: "Executive weekly briefing on portfolio risk movement, overdue tasks, and exposure." },
    ],
  }),
  component: DigestPage,
});

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

type Row = { id: string; commodity: string; kind: string; risk_score: number; risk_label: string; created_at: string };

function DigestPage() {
  const { user } = useAuth();
  const list = useServerFn(listHistory);
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => list(), enabled: !!user });
  const history = useScoreHistory();
  const opsState = useOps();
  const [copied, setCopied] = useState(false);
  const generatedAt = useMemo(() => new Date(), []);

  const rawRows: Row[] = (data ?? []) as Row[];
  const rows: Row[] = rawRows.map((r) => {
    const live = latestFor(history, `${r.kind}:${r.commodity}`);
    return live ? { ...r, risk_score: live.score } : r;
  });

  // Section 1: worsened in last 7 days
  const worsened = useMemo(() => {
    const out: { key: string; name: string; kind: string; change: number; current: number; reason: string }[] = [];
    for (const r of rows) {
      const key = `${r.kind}:${r.commodity}`;
      const series = seriesFor(history, key, 7);
      if (series.length < 2) continue;
      const change = series[series.length - 1].score - series[0].score;
      if (change <= 0) continue;
      const overview = series[series.length - 1].overview;
      const reason = overview ? overview.split(/(?<=[.?!])\s+/)[0].slice(0, 140) : "Score moved up over the last 7 days.";
      out.push({ key, name: r.commodity, kind: r.kind, change, current: r.risk_score, reason });
    }
    return out.sort((a, b) => b.change - a.change).slice(0, 3);
  }, [rows, history]);

  // Section 2: overdue tasks
  const overdueTasks = opsState.tasks.filter((t) => t.status !== "done" && t.dueAt < Date.now());

  // Section 3: snapshot
  const totalEntities = rows.length;
  const revenueAtRisk = rows.reduce((acc, r) => {
    const seed = deterministicSeed(r.id + r.commodity);
    const value = 200_000 + (seed % 4_800_000);
    return acc + value * (r.risk_score / 100);
  }, 0);
  const redEntities = rows.filter((r) => r.risk_score >= 75).length;

  const weekLabel = `Week of ${generatedAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;

  const plainText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`SUPPLY RISK — ${weekLabel}`);
    lines.push(`Generated ${generatedAt.toLocaleString()}`);
    lines.push("");
    lines.push("RISKS THAT WORSENED THIS WEEK");
    if (!worsened.length) lines.push("  • Nothing notable this week.");
    else for (const w of worsened) lines.push(`  • ${w.name} (${w.kind}) — +${w.change} → ${w.current}. ${w.reason}`);
    lines.push("");
    lines.push("OPEN MITIGATION TASKS OVERDUE");
    if (!overdueTasks.length) lines.push("  • No overdue tasks — task due dates coming soon.");
    else for (const t of overdueTasks.slice(0, 10)) lines.push(`  • ${t.title} — ${t.owner} (due ${new Date(t.dueAt).toLocaleDateString()})`);
    lines.push("");
    lines.push("PORTFOLIO SNAPSHOT");
    lines.push(`  • Tracked entities: ${totalEntities}`);
    lines.push(`  • Revenue at risk: ${fmtUsd(revenueAtRisk)}`);
    lines.push(`  • Red entities: ${redEntities}`);
    return lines.join("\n");
  }, [worsened, overdueTasks, totalEntities, revenueAtRisk, redEntities, weekLabel, generatedAt]);

  const share = async () => {
    try { await navigator.clipboard.writeText(plainText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <LogIn className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="mt-3 font-medium">Sign in to view your digest</div>
        <div className="mt-1 text-sm text-muted-foreground">The digest summarizes your saved portfolio. Guest analyses aren't tracked.</div>
        <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading digest…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Executive digest</p>
          <h1 className="mt-1 text-3xl font-semibold">{weekLabel}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Last generated {generatedAt.toLocaleString()}</p>
        </div>
        <button onClick={share} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Share2 className="h-4 w-4" /> Share digest</>}
        </button>
      </div>

      {/* Snapshot */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card icon={LayoutGrid} label="Tracked entities" value={String(totalEntities)} />
        <Card icon={DollarSign} label="Revenue at risk" value={fmtUsd(revenueAtRisk)} tone="oklch(0.62 0.22 25)" />
        <Card icon={AlertTriangle} label="Red entities" value={String(redEntities)} tone="oklch(0.62 0.22 25)" />
      </div>

      {/* Worsened */}
      <Section icon={TrendingDown} title="Risks that worsened this week" subtitle="Top 3 entities whose scores rose over the last 7 days">
        {worsened.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upward movement detected. Refresh more entities to populate this week's brief.</p>
        ) : (
          <ul className="divide-y divide-border">
            {worsened.map((w) => (
              <li key={w.key} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={w.kind === "company" ? "/company/$name" : w.kind === "country" ? "/country/$name" : w.kind === "industry" ? "/industry/$name" : "/commodity/$name"}
                    params={{ name: encodeURIComponent(w.name) }}
                    className="font-medium hover:text-primary"
                  >
                    {w.name} <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{w.kind}</span>
                  </Link>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: "oklch(0.62 0.22 25)", background: "oklch(0.62 0.22 25 / 0.12)" }}>↑ +{w.change} → {w.current}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{w.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Overdue tasks */}
      <Section icon={ClipboardList} title="Open mitigation tasks overdue" subtitle={`${overdueTasks.length} past their due date`}>
        {overdueTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue tasks — nice work.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overdueTasks.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.owner} · {t.entityKey} · due {new Date(t.dueAt).toLocaleDateString()}</div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: "oklch(0.62 0.22 25)", background: "oklch(0.62 0.22 25 / 0.12)" }}>overdue</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Card({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: typeof FileText; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" /> {title}
        {subtitle && <span className="ml-auto text-xs font-normal text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}