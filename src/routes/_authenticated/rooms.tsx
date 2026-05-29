import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Lock, Search, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rooms")({
  component: RoomsPage,
});

type Room = {
  id: string; name: string; subject: string; description: string | null;
  is_private: boolean; invite_code: string | null; owner_id: string;
};

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  async function reload() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_private", false)
      .order("created_at", { ascending: false });
    setRooms((data as Room[]) ?? []);
  }

  useEffect(() => { reload(); }, []);

  async function joinByCode() {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.from("rooms").select("id").eq("invite_code", code).maybeSingle();
    if (error || !data) return toast.error("Invalid invite code");
    await supabase.from("room_members").upsert({ room_id: data.id, user_id: user!.id }, { onConflict: "room_id,user_id" });
    toast.success("Joined room");
    navigate({ to: "/rooms/$roomId", params: { roomId: data.id } });
  }

  const filtered = rooms.filter((r) =>
    [r.name, r.subject, r.description ?? ""].some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Study rooms</h1>
          <p className="text-sm text-muted-foreground">Browse public rooms or join a private one with a code.</p>
        </div>
        <CreateRoomDialog onCreated={reload} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search rooms…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="w-40 font-mono"
          />
          <Button variant="secondary" onClick={joinByCode}>
            <KeyRound className="mr-2 h-4 w-4" /> Join
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No rooms found. Create the first one!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to="/rooms/$roomId"
              params={{ roomId: r.id }}
              className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/60 hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs uppercase tracking-wide text-primary">{r.subject}</div>
                </div>
                {r.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              {r.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRoomDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        owner_id: user.id,
        name, subject, description: description || null,
        is_private: isPrivate,
        invite_code: isPrivate ? randomCode() : null,
      })
      .select()
      .single();
    if (error || !data) { setBusy(false); return toast.error(error?.message ?? "Failed"); }
    await supabase.from("room_members").insert({ room_id: data.id, user_id: user.id });
    setBusy(false);
    setOpen(false);
    onCreated();
    toast.success("Room created");
    navigate({ to: "/rooms/$roomId", params: { roomId: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />New room</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a study room</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div><Label htmlFor="name">Name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="subject">Subject</Label><Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Math, CS, Biology…" /></div>
          <div><Label htmlFor="desc">Description</Label><Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Private room</div>
              <div className="text-xs text-muted-foreground">Join by invite code only</div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
