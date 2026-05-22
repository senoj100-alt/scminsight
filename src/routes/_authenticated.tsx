import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ShieldAlert, History, LayoutDashboard, LogOut, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_OPTIONS, useUserCountry } from "@/lib/user-country";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { country, setCountry } = useUserCountry();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const NavLink = ({ to, icon: Icon, children }: { to: string; icon: typeof History; children: React.ReactNode }) => (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        location.pathname === to
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 text-primary" />
            SupplyRisk
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" icon={LayoutDashboard}>Analyze</NavLink>
            <NavLink to="/history" icon={History}>History</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Ship to
            </div>
            <Select
              value={country.iso3}
              onValueChange={(v) => {
                const c = COUNTRY_OPTIONS.find((o) => o.iso3 === v);
                if (c) setCountry(c);
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((o) => (
                  <SelectItem key={o.iso3} value={o.iso3} className="text-xs">{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden text-xs text-muted-foreground lg:block">
              {user.email}
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}