import { useState } from "react";
import { Wrench, ArrowRight } from "lucide-react";
import type { EntityData } from "@/lib/entity.functions";
import { TaskCreateModal } from "./TaskCreateModal";

type Action = {
  title: string;
  cost: string;
  lead_time_impact: string;
  risk_reduction: number;
  feasibility: "low" | "medium" | "high";
  residual_risk: number;
  riskTitle: string;
};

function buildActions(e: EntityData): Action[] {
  const out: Action[] = [];
  for (const r of e.risks.slice(0, 8)) {
    // generic synthesis: every risk gets a structured mitigation option
    const reduce = r.impact === "critical" ? 18 : 9;
    const feas: Action["feasibility"] = r.detectability === "easy" ? "high" : "medium";
    out.push({
      title: r.action,
      cost: r.impact === "critical" ? "$$ (high)" : "$ (low)",
      lead_time_impact: r.detectability === "easy" ? "+0–5 days" : "+5–15 days",
      risk_reduction: reduce,
      feasibility: feas,
      residual_risk: Math.max(0, e.overall_score - reduce),
      riskTitle: r.title,
    });
  }
  if (e.kind === "company" && e.supplier_network) {
    const top = [...e.supplier_network.nodes].sort((a, b) => b.risk - a.risk)[0];
    if (top && top.alt_supplier) {
      out.unshift({
        title: `Shift 30% volume from ${top.name} to ${top.alt_supplier}`,
        cost: "$$$ (qualification + tooling)",
        lead_time_impact: "+10–20 days during transition",
        risk_reduction: 22,
        feasibility: "medium",
        residual_risk: Math.max(0, e.overall_score - 22),
        riskTitle: `${top.name} concentration`,
      });
    }
  }
  return out;
}

export function MitigationEngine({ entity, entityKey }: { entity: EntityData; entityKey: string }) {
  const actions = buildActions(entity);
  const [modal, setModal] = useState<null | { title: string; riskTitle: string; mitigation: string }>(null);
  if (!actions.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Mitigation engine</h3>
        <span className="text-xs text-muted-foreground">concrete actions with tradeoffs</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium">Action</th>
              <th className="py-2 text-left font-medium">Cost</th>
              <th className="py-2 text-left font-medium">Lead-time</th>
              <th className="py-2 text-right font-medium">Risk ↓</th>
              <th className="py-2 text-right font-medium">Residual</th>
              <th className="py-2 text-center font-medium">Feasibility</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {actions.map((a, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-2 pr-3">{a.title}</td>
                <td className="py-2 pr-3 text-muted-foreground">{a.cost}</td>
                <td className="py-2 pr-3 text-muted-foreground">{a.lead_time_impact}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-emerald-500">−{a.risk_reduction}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{a.residual_risk}</td>
                <td className="py-2 pr-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${a.feasibility === "high" ? "bg-emerald-500/15 text-emerald-500" : a.feasibility === "medium" ? "bg-amber-500/15 text-amber-500" : "bg-rose-500/15 text-rose-500"}`}>
                    {a.feasibility}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setModal({ title: a.title, riskTitle: a.riskTitle, mitigation: a.title })}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                  >
                    Create task <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TaskCreateModal
        open={!!modal}
        onOpenChange={(o) => { if (!o) setModal(null); }}
        entityKey={entityKey}
        defaultTitle={modal?.title ?? ""}
        defaultRiskTitle={modal?.riskTitle}
        defaultMitigation={modal?.mitigation}
      />
    </div>
  );
}