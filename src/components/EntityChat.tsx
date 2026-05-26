import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import { entityChat } from "@/lib/chat.functions";
import { useUserSettings } from "@/lib/user-settings";

type Msg = { role: "user" | "assistant"; content: string };

export function EntityChat({ context, title }: { context: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: `Hi — ask me anything about this ${title} report. e.g. "which Tier-2 supplier is most exposed?" or "what's the cheapest mitigation?".` },
  ]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const fn = useServerFn(entityChat);
  const { settings } = useUserSettings();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send() {
    const t = q.trim();
    if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next);
    setQ("");
    setBusy(true);
    try {
      const { text } = await fn({ data: { context, messages: next, userKey: settings.userKey } });
      setMsgs((m) => [...m, { role: "assistant", content: text || "(no response)" }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition"
        aria-label="Ask AI about this report"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-30 flex h-[28rem] w-[22rem] flex-col rounded-lg border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Ask about this report
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className={`inline-block max-w-[85%] rounded-lg px-2.5 py-1.5 text-left ${m.role === "user" ? "bg-primary/15 text-foreground" : "bg-muted text-foreground"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> thinking…</div>}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-1.5 border-t border-border p-2"
          >
            <input
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              placeholder="Ask anything…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !q.trim()} className="rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}