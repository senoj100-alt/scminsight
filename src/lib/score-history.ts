import { useSyncExternalStore } from "react";

export type ScoreEntry = {
  entityKey: string;
  name: string;
  kind: string;
  score: number;
  ts: number;
  overview?: string;
};

type State = {
  entries: ScoreEntry[];
  lastVisit: Record<string, number>;
  portfolioVisitedAt: number;
};

const KEY = "supplyrisk.scorehist.v1";
const EMPTY: State = { entries: [], lastVisit: {}, portfolioVisitedAt: 0 };

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();
let cache: State | null = null;
function snap(): State { if (!cache) cache = read(); return cache; }
function snapSSR(): State { return EMPTY; }
function emit() { cache = read(); listeners.forEach((l) => l()); }
function subscribe(l: () => void) {
  listeners.add(l);
  if (typeof window !== "undefined") window.addEventListener("storage", emit);
  return () => { listeners.delete(l); };
}
function write(next: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

export function useScoreHistory() {
  return useSyncExternalStore(subscribe, snap, snapSSR);
}

export const scoreHistory = {
  record(e: Omit<ScoreEntry, "ts">) {
    const s = read();
    // Dedupe: skip if same entityKey + same score within last 10 min
    const last = [...s.entries].reverse().find((x) => x.entityKey === e.entityKey);
    if (last && last.score === e.score && Date.now() - last.ts < 10 * 60 * 1000) return;
    const entry: ScoreEntry = { ...e, ts: Date.now() };
    write({ ...s, entries: [...s.entries, entry].slice(-2000) });
  },
  markVisited(entityKey: string) {
    const s = read();
    write({ ...s, lastVisit: { ...s.lastVisit, [entityKey]: Date.now() } });
  },
  markPortfolioVisited() {
    const s = read();
    write({ ...s, portfolioVisitedAt: Date.now() });
  },
};

export function seriesFor(state: State, entityKey: string, days = 90): ScoreEntry[] {
  const cutoff = Date.now() - days * 86400_000;
  return state.entries.filter((e) => e.entityKey === entityKey && e.ts >= cutoff).sort((a, b) => a.ts - b.ts);
}

export function latestFor(state: State, entityKey: string): ScoreEntry | undefined {
  let best: ScoreEntry | undefined;
  for (const e of state.entries) if (e.entityKey === entityKey && (!best || e.ts > best.ts)) best = e;
  return best;
}

export type Velocity = { label: "Deteriorating" | "Improving" | "Stable"; delta: number; color: string; arrow: "↑" | "↓" | "→" };

export function velocityFor(state: State, entityKey: string, days = 30): Velocity | null {
  const series = seriesFor(state, entityKey, days);
  if (series.length < 2) return null;
  const delta = series[series.length - 1].score - series[0].score;
  if (delta > 5) return { label: "Deteriorating", delta, color: "oklch(0.62 0.22 25)", arrow: "↑" };
  if (delta < -5) return { label: "Improving", delta, color: "oklch(0.72 0.17 145)", arrow: "↓" };
  return { label: "Stable", delta, color: "oklch(0.68 0.02 250)", arrow: "→" };
}

export function deltaSinceLastVisit(state: State, entityKey: string): { delta: number; latest: number } | null {
  const series = state.entries.filter((e) => e.entityKey === entityKey).sort((a, b) => a.ts - b.ts);
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  const visitedAt = state.portfolioVisitedAt || state.lastVisit[entityKey] || 0;
  if (!visitedAt) return null;
  // find score at or before visitedAt
  let baseline: number | null = null;
  for (const e of series) {
    if (e.ts <= visitedAt) baseline = e.score;
    else break;
  }
  if (baseline == null) return null;
  const delta = latest.score - baseline;
  return { delta, latest: latest.score };
}

// Synthetic system alerts: any time-adjacent pair on the same entity moved 5+ points.
export type SystemScoreAlert = {
  id: string;
  entityKey: string;
  name: string;
  kind: string;
  from: number;
  to: number;
  delta: number;
  ts: number;
};

export function systemScoreAlerts(state: State, minDelta = 5): SystemScoreAlert[] {
  const byEntity = new Map<string, ScoreEntry[]>();
  for (const e of state.entries) {
    const arr = byEntity.get(e.entityKey) ?? [];
    arr.push(e);
    byEntity.set(e.entityKey, arr);
  }
  const out: SystemScoreAlert[] = [];
  for (const [, list] of byEntity) {
    list.sort((a, b) => a.ts - b.ts);
    for (let i = 1; i < list.length; i++) {
      const d = list[i].score - list[i - 1].score;
      if (Math.abs(d) >= minDelta) {
        out.push({
          id: `sys-${list[i].entityKey}-${list[i].ts}`,
          entityKey: list[i].entityKey,
          name: list[i].name,
          kind: list[i].kind,
          from: list[i - 1].score,
          to: list[i].score,
          delta: d,
          ts: list[i].ts,
        });
      }
    }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 50);
}