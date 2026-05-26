import { useSyncExternalStore } from "react";

// Client-only localStorage-backed operations store: tasks, alerts, audit, reviews, backtests.
// Works for both guest and logged-in users. Persists across reloads in the browser.

export type TaskStatus = "open" | "in_progress" | "blocked" | "done";
export type Task = {
  id: string;
  entityKey: string; // e.g. "company:TSMC"
  title: string;
  owner: string;
  status: TaskStatus;
  sla_hours: number;
  createdAt: number; // ms
  dueAt: number;
  mitigation?: string;
  riskTitle?: string;
};

export type AuditEntry = {
  id: string;
  entityKey: string;
  ts: number;
  actor: string;
  action: string;
  detail?: string;
};

export type Alert = {
  id: string;
  entityKey: string;
  kind: "overall" | "category" | "supplier";
  target?: string; // category key or supplier id
  threshold: number;
  channel: "in_app" | "email" | "slack";
  email?: string;
  webhook?: string;
  createdAt: number;
  lastFiredScore?: number;
  lastFiredAt?: number;
};

export type ReviewVerdict = "accepted" | "rejected" | "edited";
export type RiskReview = {
  id: string;
  entityKey: string;
  riskTitle: string;
  verdict: ReviewVerdict;
  note?: string;
  ts: number;
  reviewer: string;
};

export type BacktestRun = {
  id: string;
  entityKey: string;
  ts: number;
  predicted_score: number;
  realized_disruption: boolean;
  realized_delay_days?: number;
  baseline_score: number;
  note?: string;
};

type OpsState = {
  tasks: Task[];
  audit: AuditEntry[];
  alerts: Alert[];
  reviews: RiskReview[];
  backtests: BacktestRun[];
};

const KEY = "supplyrisk.ops.v1";
const EMPTY: OpsState = { tasks: [], audit: [], alerts: [], reviews: [], backtests: [] };

function read(): OpsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();
let cache: OpsState | null = null;

function getSnapshot(): OpsState {
  if (cache) return cache;
  cache = read();
  return cache;
}
function getServerSnapshot(): OpsState {
  return EMPTY;
}
function emit() {
  cache = read();
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", emit);
  }
  return () => {
    listeners.delete(l);
  };
}

function write(next: OpsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useOps() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ===== Mutators =====
export const ops = {
  addTask(t: Omit<Task, "id" | "createdAt" | "dueAt"> & { sla_hours: number }) {
    const s = read();
    const createdAt = Date.now();
    const task: Task = { ...t, id: uid(), createdAt, dueAt: createdAt + t.sla_hours * 3600_000 };
    write({ ...s, tasks: [task, ...s.tasks] });
    ops.audit(t.entityKey, "task.created", `${t.title} → ${t.owner} (${t.sla_hours}h SLA)`);
    return task;
  },
  updateTask(id: string, patch: Partial<Task>) {
    const s = read();
    const tasks = s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    write({ ...s, tasks });
    const t = tasks.find((x) => x.id === id);
    if (t && patch.status) ops.audit(t.entityKey, "task.status", `${t.title} → ${patch.status}`);
  },
  deleteTask(id: string) {
    const s = read();
    const t = s.tasks.find((x) => x.id === id);
    write({ ...s, tasks: s.tasks.filter((x) => x.id !== id) });
    if (t) ops.audit(t.entityKey, "task.deleted", t.title);
  },
  audit(entityKey: string, action: string, detail?: string, actor = "you") {
    const s = read();
    const entry: AuditEntry = { id: uid(), entityKey, ts: Date.now(), actor, action, detail };
    write({ ...s, audit: [entry, ...s.audit].slice(0, 500) });
  },
  addAlert(a: Omit<Alert, "id" | "createdAt">) {
    const s = read();
    const alert: Alert = { ...a, id: uid(), createdAt: Date.now() };
    write({ ...s, alerts: [alert, ...s.alerts] });
    ops.audit(a.entityKey, "alert.created", `${a.kind}${a.target ? "·" + a.target : ""} ≥ ${a.threshold}`);
    return alert;
  },
  deleteAlert(id: string) {
    const s = read();
    const a = s.alerts.find((x) => x.id === id);
    write({ ...s, alerts: s.alerts.filter((x) => x.id !== id) });
    if (a) ops.audit(a.entityKey, "alert.deleted", `${a.kind}${a.target ? "·" + a.target : ""}`);
  },
  markAlertFired(id: string, score: number) {
    const s = read();
    write({
      ...s,
      alerts: s.alerts.map((a) =>
        a.id === id ? { ...a, lastFiredScore: score, lastFiredAt: Date.now() } : a
      ),
    });
  },
  addReview(r: Omit<RiskReview, "id" | "ts">) {
    const s = read();
    const rev: RiskReview = { ...r, id: uid(), ts: Date.now() };
    write({ ...s, reviews: [rev, ...s.reviews] });
    ops.audit(r.entityKey, "risk.review", `${r.verdict}: ${r.riskTitle}`);
    return rev;
  },
  addBacktest(b: Omit<BacktestRun, "id" | "ts">) {
    const s = read();
    const run: BacktestRun = { ...b, id: uid(), ts: Date.now() };
    write({ ...s, backtests: [run, ...s.backtests] });
    return run;
  },
};

export function tasksFor(state: OpsState, entityKey: string) {
  return state.tasks.filter((t) => t.entityKey === entityKey);
}
export function auditFor(state: OpsState, entityKey: string) {
  return state.audit.filter((a) => a.entityKey === entityKey);
}
export function alertsFor(state: OpsState, entityKey: string) {
  return state.alerts.filter((a) => a.entityKey === entityKey);
}
export function reviewsFor(state: OpsState, entityKey: string) {
  return state.reviews.filter((r) => r.entityKey === entityKey);
}

export function fmtHrs(ms: number) {
  const h = Math.round(ms / 3600_000);
  if (Math.abs(h) >= 48) return `${Math.round(h / 24)}d`;
  return `${h}h`;
}