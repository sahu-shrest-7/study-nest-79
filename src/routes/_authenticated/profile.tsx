import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile updated");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Update your display info.</p>
      </div>
      <form onSubmit={save} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl font-semibold">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (username[0]?.toUpperCase() ?? "?")}
          </div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
        <div><Label htmlFor="u">Username</Label><Input id="u" required value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div><Label htmlFor="a">Avatar URL</Label><Input id="a" placeholder="https://…" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} /></div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </form>
    </div>
  );
}
