import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUserSettings, type AIProvider } from "@/lib/user-settings";
import { KeyRound, Sliders, Newspaper, RotateCcw } from "lucide-react";
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

function SettingsPage() {
  const { settings, update, setWeight, reset } = useUserSettings();
  const { userKey, weights, newsCount } = settings;

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
          <h2 className="font-medium">AI provider</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Default uses Lovable AI (Gemini). Add your own OpenAI or Anthropic key for fresher reasoning and live news.
          Keys are stored only in your browser (localStorage) and sent over HTTPS to your chosen provider for each request.
        </p>

        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div>
            <Label className="text-xs">Provider</Label>
            <Select
              value={userKey.provider}
              onValueChange={(v) => update({ userKey: { ...userKey, provider: v as AIProvider } })}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI (default)</SelectItem>
                <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {userKey.provider !== "lovable" && (
            <>
              <div className="sm:col-span-2">
                <Label className="text-xs">API key</Label>
                <Input
                  type="password"
                  placeholder={userKey.provider === "openai" ? "sk-…" : "sk-ant-…"}
                  value={userKey.key ?? ""}
                  onChange={(e) => update({ userKey: { ...userKey, key: e.target.value } })}
                  className="mt-1.5 font-mono text-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {userKey.provider === "openai"
                    ? "Get one at platform.openai.com/api-keys"
                    : "Get one at console.anthropic.com/settings/keys"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Model (optional override)</Label>
                <Input
                  placeholder={userKey.provider === "openai" ? "gpt-4o-mini (default)" : "claude-3-5-sonnet-latest (default)"}
                  value={userKey.model ?? ""}
                  onChange={(e) => update({ userKey: { ...userKey, model: e.target.value } })}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
            </>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("AI provider saved")}>Save</Button>
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