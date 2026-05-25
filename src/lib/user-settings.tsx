import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AIProvider =
  | "lovable"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "nvidia"
  | "deepseek";
export type UserKey = { provider: AIProvider; key?: string; model?: string };
export type ProviderEntry = { key?: string; model?: string };

export type RiskWeights = Record<string, number>;

export type UserSettings = {
  userKey: UserKey;
  providers: Partial<Record<AIProvider, ProviderEntry>>;
  weights: RiskWeights; // keys: operational, financial, reputational, structural, disaster, geopolitical, fiscal, industry
  newsCount: number;
  scenarioShockPct: number; // -50..+50 supply-shock applied to commodity forecast
};

const KEY = "supplyrisk.settings.v1";

const DEFAULTS: UserSettings = {
  userKey: { provider: "lovable" },
  providers: {},
  weights: {
    operational: 1,
    financial: 1,
    reputational: 1,
    structural: 1,
    disaster: 1,
    geopolitical: 1,
    fiscal: 1,
    industry: 1,
  },
  newsCount: 10,
  scenarioShockPct: 0,
};

type Ctx = {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
  setWeight: (key: string, val: number) => void;
  reset: () => void;
};

const SettingsCtx = createContext<Ctx>({
  settings: DEFAULTS,
  update: () => {},
  setWeight: () => {},
  reset: () => {},
});

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        setSettings({
          ...DEFAULTS,
          ...parsed,
          weights: { ...DEFAULTS.weights, ...(parsed.weights ?? {}) },
          userKey: { ...DEFAULTS.userKey, ...(parsed.userKey ?? {}) },
        });
      }
    } catch {}
  }, []);

  const persist = (next: UserSettings) => {
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  const ctx = useMemo<Ctx>(() => ({
    settings,
    update: (patch) => persist({ ...settings, ...patch }),
    setWeight: (k, v) => persist({ ...settings, weights: { ...settings.weights, [k]: v } }),
    reset: () => persist(DEFAULTS),
  }), [settings]);

  return <SettingsCtx.Provider value={ctx}>{children}</SettingsCtx.Provider>;
}

export const useUserSettings = () => useContext(SettingsCtx);

/** Recompute an overall score from category scores using user weights. */
export function applyWeights(
  categories: { key: string; score: number }[],
  weights: RiskWeights
): number {
  if (!categories.length) return 0;
  let num = 0;
  let den = 0;
  for (const c of categories) {
    const w = weights[c.key] ?? 1;
    num += c.score * w;
    den += w;
  }
  return den ? Math.round(num / den) : 0;
}

export function labelForScore(s: number): "Low" | "Moderate" | "High" | "Extreme" {
  if (s >= 80) return "Extreme";
  if (s >= 60) return "High";
  if (s >= 35) return "Moderate";
  return "Low";
}