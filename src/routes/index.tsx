import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BookOpen, Timer, Users, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">StudyRoom</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Log in</Link>
            <Link to="/signup" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Study together, <span className="text-primary">stay focused.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Join virtual study rooms, run pomodoro sessions with peers, chat in real time, and track your progress.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link to="/signup" className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
              Get started free
            </Link>
            <Link to="/login" className="rounded-md border border-border px-6 py-3 font-medium hover:bg-accent">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Users, t: "Study rooms", d: "Public or private rooms with invite codes." },
            { Icon: Timer, t: "Pomodoro timer", d: "25/5 cycles with auto-switch." },
            { Icon: MessageSquare, t: "Live chat", d: "Real-time messaging inside rooms." },
            { Icon: BookOpen, t: "Track progress", d: "Weekly & all-time study stats." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
