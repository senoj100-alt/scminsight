import { useState } from "react";
import { ClipboardList, Trash2, History as HistoryIcon, Check, X as XIcon, Pencil, RefreshCw, Plus } from "lucide-react";
import { ops, useOps, tasksFor, auditFor, reviewsFor, fmtHrs, type TaskStatus } from "@/lib/ops-store";
import type { EntityData } from "@/lib/entity.functions";
import { TaskCreateModal } from "./TaskCreateModal";

const STATUSES: TaskStatus[] = ["open", "in_progress", "blocked", "done"];
const CYCLE: Record<TaskStatus, TaskStatus> = { open: "in_progress", in_progress: "done", blocked: "in_progress", done: "open" };

export function OpsPanel({ entity, entityKey, onRescore }: { entity: EntityData; entityKey: string; onRescore?: () => void }) {
  const state = useOps();
  const tasks = tasksFor(state, entityKey);
  const audit = auditFor(state, entityKey).slice(0, 25);
  const reviews = reviewsFor(state, entityKey);
  const [modalOpen, setModalOpen] = useState(false);
  const [rescorePromptId, setRescorePromptId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Mitigation tasks</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {tasks.filter((t) => t.status !== "done").length} open · {tasks.filter((t) => t.status !== "done" && t.dueAt < Date.now()).length} overdue
          </span>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks yet. Use the mitigation engine below or click "New" above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => {
              const remaining = t.dueAt - Date.now();
              const overdue = remaining < 0 && t.status !== "done";
              return (
                <li key={t.id} className="py-2 text-sm">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t.owner} · due {new Date(t.dueAt).toLocaleDateString()} · {t.status === "done" ? <span className="text-emerald-500">done</span> : overdue ? <span className="text-rose-500">overdue {fmtHrs(-remaining)}</span> : `in ${fmtHrs(remaining)}`}
                        {t.riskTitle && <> · for "{t.riskTitle}"</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = CYCLE[t.status];
                          ops.updateTask(t.id, { status: next });
                          if (next === "done") setRescorePromptId(t.id);
                        }}
                        className="rounded-md border border-border px-2 py-1 text-[11px] capitalize hover:border-primary hover:text-primary"
                        title="Click to advance status"
                      >
                        {t.status.replace("_", " ")} →
                      </button>
                      <select
                        value={t.status}
                        onChange={(e) => {
                          const next = e.target.value as TaskStatus;
                          ops.updateTask(t.id, { status: next });
                          if (next === "done") setRescorePromptId(t.id);
                        }}
                        className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => ops.deleteTask(t.id)} className="text-muted-foreground hover:text-rose-500" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {rescorePromptId === t.id && t.status === "done" && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
                      <span>Re-score this entity to measure risk reduction?</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setRescorePromptId(null); onRescore?.(); }} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground">
                          <RefreshCw className="h-3 w-3" /> Re-score now
                        </button>
                        <button onClick={() => setRescorePromptId(null)} className="rounded-md border border-border px-2 py-1">Later</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} entityKey={entityKey} />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Risk review (human-in-the-loop)</h3>
          <span className="ml-auto text-xs text-muted-foreground">{reviews.length} decisions</span>
        </div>
        <ul className="divide-y divide-border">
          {entity.risks.slice(0, 6).map((r, i) => {
            const last = reviews.find((x) => x.riskTitle === r.title);
            return (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-2 py-2 text-sm">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.category} · {r.impact} · {r.detectability}</div>
                  {last && <div className="mt-0.5 text-[11px]" style={{ color: last.verdict === "accepted" ? "oklch(0.72 0.17 145)" : last.verdict === "rejected" ? "oklch(0.62 0.22 25)" : "oklch(0.72 0.19 55)" }}>
                    last review: {last.verdict} · {new Date(last.ts).toLocaleDateString()}
                  </div>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => ops.addReview({ entityKey, riskTitle: r.title, verdict: "accepted", reviewer: "you" })} className="rounded-md border border-border p-1 text-emerald-500 hover:border-emerald-500" title="Accept">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => ops.addReview({ entityKey, riskTitle: r.title, verdict: "rejected", reviewer: "you" })} className="rounded-md border border-border p-1 text-rose-500 hover:border-rose-500" title="Reject">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const note = typeof window !== "undefined" ? window.prompt(`Edit note for "${r.title}"`) : null;
                      if (note) ops.addReview({ entityKey, riskTitle: r.title, verdict: "edited", note, reviewer: "you" });
                    }}
                    className="rounded-md border border-border p-1 text-amber-500 hover:border-amber-500"
                    title="Edit / annotate"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Audit trail</h3>
        </div>
        {audit.length === 0 ? <p className="text-xs text-muted-foreground">No activity yet.</p> : (
          <ul className="space-y-1 text-xs">
            {audit.map((a) => (
              <li key={a.id} className="grid grid-cols-[140px_120px_1fr] gap-2">
                <span className="tabular-nums text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground">{a.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
