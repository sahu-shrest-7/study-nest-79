import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Copy, Lock, LogOut, Pause, Play, Send, Square, Timer as TimerIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  component: RoomPage,
});

type Room = {
  id: string; name: string; subject: string; description: string | null;
  is_private: boolean; invite_code: string | null; owner_id: string;
};
type Message = { id: string; user_id: string; content: string; created_at: string };
type Profile = { id: string; username: string };

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function RoomPage() {
  const { roomId } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [presence, setPresence] = useState<Record<string, { username: string; studying: boolean }>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Timer
  const [mode, setMode] = useState<"free" | "pomodoro">("free");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [phaseLeft, setPhaseLeft] = useState(25 * 60);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: r } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (!active) return;
      if (!r) { toast.error("Room not found"); navigate({ to: "/rooms" }); return; }
      setRoom(r as Room);

      const { data: mem } = await supabase
        .from("room_members").select("user_id").eq("room_id", roomId).eq("user_id", user!.id).maybeSingle();
      if (!mem) {
        if ((r as Room).is_private && (r as Room).owner_id !== user!.id) {
          toast.error("Private room. Use invite code to join.");
          navigate({ to: "/rooms" });
          return;
        }
        await supabase.from("room_members").insert({ room_id: roomId, user_id: user!.id });
      }
      setIsMember(true);

      const { data: msgs } = await supabase
        .from("messages").select("*").eq("room_id", roomId)
        .order("created_at", { ascending: false }).limit(50);
      const ordered = ((msgs as Message[]) ?? []).slice().reverse();
      setMessages(ordered);
      await loadProfiles(ordered.map((m) => m.user_id));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [roomId, user, navigate]);

  async function loadProfiles(ids: string[]) {
    const unique = Array.from(new Set(ids)).filter((id) => !profiles[id]);
    if (unique.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, username").in("id", unique);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        (data as Profile[]).forEach((p) => { next[p.id] = p; });
        return next;
      });
    }
  }

  // Realtime messages
  useEffect(() => {
    if (!isMember) return;
    const channel = supabase
      .channel(`room-msg-${roomId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          await loadProfiles([m.user_id]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isMember, roomId]);

  // Auto-scroll
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Presence
  useEffect(() => {
    if (!isMember || !user || !profile) return;
    const channel = supabase.channel(`room-presence-${roomId}`, {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ username: string; studying: boolean }>();
        const map: Record<string, { username: string; studying: boolean }> = {};
        for (const [key, metas] of Object.entries(state)) {
          const m = metas[0] as { username: string; studying: boolean };
          if (m) map[key] = m;
        }
        setPresence(map);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ username: profile.username, studying: running });
        }
      });
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, user?.id, profile?.username, roomId]);

  // Update presence when running changes
  useEffect(() => {
    if (!isMember || !user || !profile) return;
    const ch = supabase.getChannels().find((c) => c.topic === `realtime:room-presence-${roomId}`);
    if (ch) ch.track({ username: profile.username, studying: running });
  }, [running, isMember, user, profile, roomId]);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      if (mode === "pomodoro") {
        setPhaseLeft((p) => {
          if (p <= 1) {
            const nextPhase = phase === "focus" ? "break" : "focus";
            setPhase(nextPhase);
            toast.success(nextPhase === "focus" ? "Back to focus!" : "Break time!");
            return nextPhase === "focus" ? 25 * 60 : 5 * 60;
          }
          return p - 1;
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, phase]);

  async function stopTimer() {
    setRunning(false);
    if (elapsed > 0 && user) {
      await supabase.from("study_sessions").insert({
        user_id: user.id, room_id: roomId, duration_seconds: elapsed, mode,
      });
      toast.success(`Saved ${Math.round(elapsed / 60)} min session`);
    }
    setElapsed(0);
    setPhase("focus");
    setPhaseLeft(25 * 60);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !user) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({ room_id: roomId, user_id: user.id, content });
    if (error) toast.error(error.message);
  }

  async function leaveRoom() {
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", user!.id);
    navigate({ to: "/rooms" });
  }

  function copyInvite() {
    if (!room?.invite_code) return;
    navigator.clipboard.writeText(room.invite_code);
    toast.success("Invite code copied");
  }

  if (loading || !room) {
    return <div className="text-muted-foreground">Loading room…</div>;
  }

  const presenceList = Object.entries(presence);
  const isOwner = room.owner_id === user?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/rooms" className="rounded-md p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{room.name}</h1>
              {room.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="text-xs uppercase tracking-wide text-primary">{room.subject}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && room.invite_code && (
            <Button variant="secondary" size="sm" onClick={copyInvite}>
              <Copy className="mr-2 h-4 w-4" /> <span className="font-mono">{room.invite_code}</span>
            </Button>
          )}
          {!isOwner && (
            <Button variant="ghost" size="sm" onClick={leaveRoom}>
              <LogOut className="mr-2 h-4 w-4" /> Leave
            </Button>
          )}
        </div>
      </div>

      {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Timer */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TimerIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Study timer</span>
              </div>
              <div className="flex gap-1 rounded-md border border-border p-0.5">
                <button
                  onClick={() => !running && setMode("free")}
                  className={`rounded px-3 py-1 text-xs ${mode === "free" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >Free</button>
                <button
                  onClick={() => !running && setMode("pomodoro")}
                  className={`rounded px-3 py-1 text-xs ${mode === "pomodoro" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >Pomodoro</button>
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="font-mono text-6xl font-bold tracking-tight tabular-nums">{fmt(elapsed)}</div>
              {mode === "pomodoro" && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {phase === "focus" ? "Focus" : "Break"} • {fmt(phaseLeft)} left
                </div>
              )}
              <div className="mt-6 flex justify-center gap-2">
                {!running ? (
                  <Button onClick={() => setRunning(true)}><Play className="mr-2 h-4 w-4" />Start</Button>
                ) : (
                  <Button variant="secondary" onClick={() => setRunning(false)}><Pause className="mr-2 h-4 w-4" />Pause</Button>
                )}
                <Button variant="outline" onClick={stopTimer} disabled={elapsed === 0 && !running}>
                  <Square className="mr-2 h-4 w-4" />Stop & save
                </Button>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="flex h-[500px] flex-col rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">Chat</div>
            <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground">No messages yet. Say hi!</div>
              ) : messages.map((m) => {
                const name = profiles[m.user_id]?.username ?? "user";
                const mine = m.user_id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div className="mb-1 flex gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{name}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" />
              <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>

        {/* Sidebar: members */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium">In room ({presenceList.length})</div>
          {presenceList.length === 0 ? (
            <div className="text-xs text-muted-foreground">No one here yet.</div>
          ) : (
            <ul className="space-y-2">
              {presenceList.map(([uid, info]) => (
                <li key={uid} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${info.studying ? "bg-[color:var(--color-success)]" : "bg-muted-foreground"}`} />
                  <span>{info.username}</span>
                  {info.studying && <span className="text-xs text-muted-foreground">studying</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
