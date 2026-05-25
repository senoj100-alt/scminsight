import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUserSettings, type AIProvider } from "@/lib/user-settings";
import { KeyRound, Sliders, Newspaper, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const WEIGHT_KEYS: { key: string; label: string; help: string }[] = [
  { key: "operational", label: "Operational", help: "Capacity, defect rate, workforce" },
  { key: "financial", label: "Financial", help: "Credit, leverage, revenue trend" },
  { key: "reputational", label: "Reputational", help: "ESG, sentiment, fines" },
  { key: "structural", label: "Structural", help: "Single-source, M&A, geo concentration" },
  { key: "disaster", label: "Disaster", help: "Natural disaster, climate, pandemic" },
  { key: "geopolitical", label: "Geopolitical", help: "Tariffs, sanctions, conflict" },
  { key: "fiscal", label: "Fiscal", help: "Currency, inflation, capital controls" },
  { key: "industry", label: "Industry", help: "Supplier concentration, tech obsolescence" },
];

type ProviderSpec = {
  id: AIProvider;
  label: string;
  envName: string;
  help: string;
  defaultModel: string;
  modelOptions?: string[];
  link?: string;
};

const PROVIDERS: ProviderSpec[] = [
  { id: "lovable", label: "Lovable AI (default)", envName: "LOVABLE_API_KEY", help: "Default Gemini gateway. No key needed.", defaultModel: "google/gemini-3-flash-preview" },
  { id: "openai", label: "OpenAI (ChatGPT)", envName: "OPENAI_API_KEY", help: "Get a key at platform.openai.com/api-keys", defaultModel: "gpt-4o-mini", modelOptions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-mini", "o3-mini"] },
  { id: "anthropic", label: "Anthropic (Claude)", envName: "ANTHROPIC_API_KEY", help: "Get a key at console.anthropic.com/settings/keys", defaultModel: "claude-3-5-sonnet-latest", modelOptions: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"] },
  { id: "gemini", label: "Gemini (Google AI Studio)", envName: "GEMINI_API_KEY", help: "Get a key at aistudio.google.com/apikey", defaultModel: "gemini-2.5-flash", modelOptions: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  { id: "openrouter", label: "OpenRouter", envName: "OPENROUTER_API_KEY", help: "Multi-provider routing. Get a key at openrouter.ai/keys", defaultModel: "anthropic/claude-3.5-sonnet", modelOptions: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "meta-llama/llama-3.1-405b-instruct", "google/gemini-2.5-pro", "deepseek/deepseek-chat"] },
  { id: "nvidia", label: "NVIDIA NIM", envName: "NVIDIA_NIM_API_KEY", help: "Get a key at build.nvidia.com (Hosted NIMs)", defaultModel: "meta/llama-3.1-70b-instruct", modelOptions: ["meta/llama-3.1-70b-instruct", "meta/llama-3.1-405b-instruct", "mistralai/mixtral-8x22b-instruct-v0.1", "nvidia/llama-3.1-nemotron-70b-instruct"] },
  { id: "deepseek", label: "DeepSeek", envName: "DEEPSEEK_API_KEY", help: "Get a key at platform.deepseek.com/api_keys", defaultModel: "deepseek-chat", modelOptions: ["deepseek-chat", "deepseek-reasoner"] },
];

function SettingsPage() {
  const { settings, update, setWeight, reset } = useUserSettings();
  const { userKey, providers, weights, newsCount } = settings;

  const setProviderField = (id: AIProvider, patch: { key?: string; model?: string }) => {
    const next = { ...providers, [id]: { ...(providers[id] ?? {}), ...patch } };
    update({ providers: next });
  };

  const activate = (id: AIProvider) => {
    const entry = providers[id];
    update({ userKey: { provider: id, key: entry?.key, model: entry?.model } });
    toast.success(`${PROVIDERS.find((p) => p.id === id)?.label} is now the default routing model`);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-primary">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold">Personalize your intelligence</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring your own AI key for more accurate, current insights — or tune how every report scores risk.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Providers</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Provider keys and model routing. Keys are stored only in your browser (localStorage) and sent over HTTPS directly to each provider per request.
          The <strong className="text-foreground">default routing model</strong> is used by every analysis call; you can switch it at any time.
        </p>

        <div className="mb-5 rounded-md border border-border bg-background/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Default model</div>
          <div className="mt-1 text-sm text-muted-foreground">Fallback provider/model route for all model calls.</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Select value={userKey.provider} onValueChange={(v) => activate(v as AIProvider)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => {
                  const ok = p.id === "lovable" || !!providers[p.id]?.key;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} {ok ? "✓" : "(key missing)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              placeholder="Model override (optional)"
              value={userKey.model ?? ""}
              onChange={(e) => update({ userKey: { ...userKey, model: e.target.value } })}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-3">
          {PROVIDERS.filter((p) => p.id !== "lovable").map((p) => {
            const entry = providers[p.id] ?? {};
            const configured = !!entry.key;
            const isActive = userKey.provider === p.id;
            return (
              <div key={p.id} className="rounded-md border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {p.label}
                      {configured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <XCircle className="h-3 w-3" /> Missing key
                        </span>
                      )}
                      {isActive && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Active</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.help}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{p.envName}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={isActive ? "secondary" : "outline"} disabled={!configured || isActive} onClick={() => activate(p.id)}>
                      {isActive ? "Active" : "Set as default"}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
                  <div>
                    <Label className="text-xs">{p.envName}</Label>
                    <Input
                      type="password"
                      placeholder="Paste key…"
                      value={entry.key ?? ""}
                      onChange={(e) => setProviderField(p.id, { key: e.target.value })}
                      className="mt-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    {p.modelOptions ? (
                      <Select
                        value={entry.model ?? p.defaultModel}
                        onValueChange={(v) => {
                          setProviderField(p.id, { model: v });
                          if (isActive) update({ userKey: { ...userKey, model: v } });
                        }}
                      >
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {p.modelOptions.map((m) => (
                            <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={p.defaultModel}
                        value={entry.model ?? ""}
                        onChange={(e) => setProviderField(p.id, { model: e.target.value })}
                        className="mt-1.5 font-mono text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Custom risk weights</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Recompute overall risk scores using YOUR weighting. Higher weight = the category matters more for your business.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {WEIGHT_KEYS.map((w) => (
            <div key={w.key} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{w.label}</div>
                  <div className="text-xs text-muted-foreground">{w.help}</div>
                </div>
                <div className="tabular-nums text-sm">{(weights[w.key] ?? 1).toFixed(1)}×</div>
              </div>
              <Slider
                className="mt-3"
                min={0}
                max={3}
                step={0.1}
                value={[weights[w.key] ?? 1]}
                onValueChange={(v) => setWeight(w.key, v[0])}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h2 className="font-medium">News feed</h2>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm">Stories per company</Label>
          <Input
            type="number"
            min={3}
            max={20}
            value={newsCount}
            onChange={(e) => update({ newsCount: Math.max(3, Math.min(20, parseInt(e.target.value) || 10)) })}
            className="w-24"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => { reset(); toast.success("Reset to defaults"); }}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset all settings
        </Button>
      </div>
    </div>
  );
}