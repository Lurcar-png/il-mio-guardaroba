import { Link, Outlet } from "@tanstack/react-router";
import { Shirt, Layers, Sparkles as _unused, MessageCircle, User, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

void _unused;

const NAV = [
  { to: "/", label: "Guardaroba", icon: Shirt },
  { to: "/crea-outfit", label: "Crea Outfit", icon: Plus },
  { to: "/outfit", label: "Outfit", icon: Layers },
  { to: "/chat", label: "Chat AI", icon: MessageCircle },
] as const;

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { id: u.user.id, email: u.user.email ?? "", display_name: data?.display_name ?? u.user.email?.split("@")[0] ?? "" };
    },
  });
}

export function AppShell() {
  const { data: profile } = useProfile();
  const initial = (profile?.display_name || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-foreground">
            Armadio<span className="text-primary">.</span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full bg-secondary p-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-primary !text-primary-foreground shadow-sm" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/profilo"
            aria-label="Profilo e impostazioni"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-extrabold text-primary-foreground"
          >
            {initial}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-full border border-border bg-card p-1.5 shadow-lg md:hidden">
        {[...NAV, { to: "/profilo", label: "Profilo", icon: User } as const].map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-bold text-muted-foreground"
            activeProps={{ className: "bg-primary !text-primary-foreground" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
