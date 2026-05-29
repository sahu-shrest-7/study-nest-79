import { createFileRoute, Outlet, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, LayoutDashboard, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">StudyRoom</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-accent text-foreground" }}
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link
                to="/rooms"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-accent text-foreground" }}
              >
                <Users className="h-4 w-4" /> Rooms
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">
              @{profile?.username ?? "you"}
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
