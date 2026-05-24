import { FileSignature, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { EntityData } from "@/lib/entity.functions";

export function ContractsPanel({ contracts }: { contracts: NonNullable<EntityData["contracts"]> }) {
  const now = Date.now();
  const sorted = [...contracts].sort((a, b) => +new Date(a.expiry) - +new Date(b.expiry));
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Contract &amp; lead-time exposure</h3>
        <span className="ml-auto text-xs text-muted-foreground">click a supplier for its profile</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5">Supplier</th>
              <th className="px-2 py-1.5">Expiry</th>
              <th className="px-2 py-1.5">MOQ</th>
              <th className="px-2 py-1.5">Payment</th>
              <th className="px-2 py-1.5">Annual</th>
              <th className="px-2 py-1.5">Backup</th>
              <th className="px-2 py-1.5">Risk</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const daysToExpiry = Math.round((+new Date(c.expiry) - now) / 86400000);
              const expSoon = daysToExpiry <= 90;
              const tone =
                c.risk === "high" ? "oklch(0.62 0.22 25)" :
                c.risk === "medium" ? "oklch(0.72 0.19 55)" : "oklch(0.72 0.17 145)";
              return (
                <tr key={i} className="border-t border-border/40">
                  <td className="px-2 py-2 font-medium">
                    <Link to="/company/$name" params={{ name: encodeURIComponent(c.supplier) }} className="hover:text-primary hover:underline">
                      {c.supplier}
                    </Link>
                  </td>
                  <td className="px-2 py-2 tabular-nums">
                    <span className={expSoon ? "text-destructive" : "text-foreground"}>{c.expiry}</span>
                    {expSoon && <AlertTriangle className="ml-1 inline h-3 w-3 text-destructive" />}
                    <div className="text-[10px] text-muted-foreground">
                      {daysToExpiry < 0 ? "expired" : `${daysToExpiry}d`}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{c.moq ?? "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">{c.payment_terms ?? "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">{c.annual_value ?? "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {c.backup_supplier ? (
                      <Link to="/company/$name" params={{ name: encodeURIComponent(c.backup_supplier) }} className="hover:text-primary hover:underline">
                        {c.backup_supplier}
                      </Link>
                    ) : <span className="text-destructive">none</span>}
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ background: `${tone}1f`, color: tone }}>{c.risk}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}