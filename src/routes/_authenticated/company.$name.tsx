import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { generateEntity } from "@/lib/entity.functions";
import { EntityReport } from "@/components/EntityReport";

export const Route = createFileRoute("/_authenticated/company/$name")({
  component: CompanyPage,
});

function CompanyPage() {
  const { name } = Route.useParams();
  const company = decodeURIComponent(name);
  const fn = useServerFn(generateEntity);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["entity", "company", company],
    queryFn: () => fn({ data: { kind: "company", name: company } }),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm">Profiling <span className="text-foreground font-medium">{company}</span>…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <div className="font-medium">Could not generate company profile</div>
        <div className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</div>
        <button onClick={() => refetch()} className="mt-4 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Retry</button>
      </div>
    );
  }
  if (!data) return null;
  return <EntityReport entity={data.entity} />;
}