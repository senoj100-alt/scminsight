import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listHistory, deleteAnalysis } from "@/lib/history.functions";
import { Trash2, ArrowRight, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const list = useServerFn(listHistory);
  const del = useServerFn(deleteAnalysis);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => list(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-primary">Saved</p>
        <h1 className="mt-1 text-3xl font-semibold">Your analysis history</h1>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-medium">No analyses yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Run your first analysis from the <Link to="/dashboard" className="text-primary hover:underline">dashboard</Link>.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Generated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const kind = r.kind ?? "commodity";
                const to =
                  kind === "company" ? "/company/$name" :
                  kind === "country" ? "/country/$name" :
                  kind === "industry" ? "/industry/$name" :
                  "/commodity/$name";
                return (
                <tr key={r.id} className="border-t border-border bg-card">
                  <td className="px-4 py-3 font-medium">{r.commodity}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">{kind}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs" style={{
                      background: "oklch(0.3 0.03 250)",
                      color: r.risk_score >= 75 ? "oklch(0.62 0.22 25)"
                        : r.risk_score >= 55 ? "oklch(0.72 0.19 55)"
                        : r.risk_score >= 35 ? "oklch(0.82 0.16 90)" : "oklch(0.72 0.17 145)"
                    }}>
                      {r.risk_label} · {r.risk_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={to as "/commodity/$name"}
                        params={{ name: encodeURIComponent(r.commodity) }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => delMut.mutate(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}