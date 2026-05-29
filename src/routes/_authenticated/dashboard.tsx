import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Clock, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Session = { id: string; duration_seconds: number; created_at: string; room_id: string | null; mode: string };
type RoomJoin = { room_id: string; rooms: { id: string; name: string; subject: string } | null };

function formatMinutes(seconds: number) {
  return Math.round(seconds / 60);
}

function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<RoomJoin[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setSessions((data as Session[]) ?? []));

    supabase
      .from("room_members")
      .select("room_id, rooms(id, name, subject)")
      .eq("user_id", user.id)
      .then(({ data }) => setRooms((data as unknown as RoomJoin[]) ?? []));
  }, [user]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekSeconds = sessions
    .filter((s) => new Date(s.created_at).getTime() >= weekAgo)
    .reduce((a, s) => a + s.duration_seconds, 0);
  const totalSeconds = sessions.reduce((a, s) => a + s.duration_seconds, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your study progress at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Clock className="h-5 w-5" />} label="This week" value={`${formatMinutes(weekSeconds)} min`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="All time" value={`${formatMinutes(totalSeconds)} min`} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Rooms joined" value={`${rooms.length}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="My rooms">
          {rooms.length === 0 ? (
            <Empty text="You haven't joined any rooms yet." />
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) =>
                r.rooms ? (
                  <li key={r.room_id}>
                    <Link
                      to="/rooms/$roomId"
                      params={{ roomId: r.rooms.id }}
                      className="block rounded-md border border-border bg-card p-3 hover:bg-accent"
                    >
                      <div className="font-medium">{r.rooms.name}</div>
                      <div className="text-xs text-muted-foreground">{r.rooms.subject}</div>
                    </Link>
                  </li>
                ) : null
              )}
            </ul>
          )}
        </Section>

        <Section title="Recent sessions">
          {sessions.length === 0 ? (
            <Empty text="No sessions logged yet. Join a room and start a timer." />
          ) : (
            <ul className="space-y-2">
              {sessions.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
                  <div>
                    <div className="font-medium">{formatMinutes(s.duration_seconds)} min</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{s.mode}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
