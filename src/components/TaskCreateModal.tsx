import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ops } from "@/lib/ops-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityKey: string;
  defaultTitle?: string;
  defaultRiskTitle?: string;
  defaultMitigation?: string;
};

const TEAM = ["unassigned", "Procurement Lead", "Risk Analyst", "Logistics Manager", "Sourcing Manager", "CPO"];

function defaultDueISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function TaskCreateModal({ open, onOpenChange, entityKey, defaultTitle = "", defaultRiskTitle, defaultMitigation }: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [owner, setOwner] = useState("unassigned");
  const [ownerOther, setOwnerOther] = useState("");
  const [due, setDue] = useState(defaultDueISO());

  useEffect(() => { if (open) { setTitle(defaultTitle); setOwner("unassigned"); setOwnerOther(""); setDue(defaultDueISO()); } }, [open, defaultTitle]);

  const submit = () => {
    const finalOwner = owner === "__other" ? (ownerOther.trim() || "unassigned") : owner;
    if (!title.trim()) return;
    const dueAt = new Date(due + "T17:00:00").getTime();
    ops.addTask({
      entityKey,
      title: title.trim(),
      owner: finalOwner,
      status: "open",
      mitigation: defaultMitigation,
      riskTitle: defaultRiskTitle,
      dueAt,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create mitigation task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Task title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
          </label>
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Owner</div>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
              {TEAM.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="__other">Other…</option>
            </select>
            {owner === "__other" && (
              <input value={ownerOther} onChange={(e) => setOwnerOther(e.target.value)} placeholder="Name or email" className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
            )}
          </label>
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Due date</div>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
          </label>
          {defaultRiskTitle && <div className="text-[11px] text-muted-foreground">Linked risk: {defaultRiskTitle}</div>}
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-md border border-border px-3 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Create</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}