import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { generateEntity } from "@/lib/entity.functions";
import { EntityReport } from "@/components/EntityReport";
import { useUserCountry } from "@/lib/user-country";
import { useUserSettings } from "@/lib/user-settings";

export const Route = createFileRoute("/_authenticated/country/$name")({
  component: CountryPage,
});

function CountryPage() {
  const { name } = Route.useParams();
  const country = decodeURIComponent(name);
  const fn = useServerFn(generateEntity);
  const { country: userCountry } = useUserCountry();
  const { settings } = useUserSettings();
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["entity", "country", country, userCountry.iso3, settings.userKey.provider],
    queryFn: () => fn({ data: { kind: "country", name: country, userCountry, userKey: settings.userKey } }),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm">Assessing <span className="text-foreground font-medium">{country}</span>…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <div className="font-medium">Could not generate country profile</div>
        <div className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</div>
        <button onClick={() => refetch()} className="mt-4 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Retry</button>
      </div>
    );
  }
  if (!data) return null;
  return <EntityReport entity={data.entity} onRefresh={() => refetch()} isRefreshing={isFetching} lastFetchedAt={dataUpdatedAt} />;
}