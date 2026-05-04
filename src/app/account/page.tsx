import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SyncPlayersButton } from "./sync-players-button";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, created_at")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const { count: playerCount } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true });

  const { data: latestPlayer } = await supabase
    .from("players")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs">{user.id}</dd>
            <dt className="text-muted-foreground">Display name</dt>
            <dd>{profile?.display_name ?? "—"}</dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd>
              <span className="rounded-full border px-2 py-0.5 text-xs">
                {profile?.role ?? "(no profile row)"}
              </span>
            </dd>
          </dl>
          <form action="/auth/signout" method="post" className="mt-6">
            <button
              type="submit"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>

        {isAdmin ? (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Admin</h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Players in DB</dt>
              <dd>{playerCount ?? 0}</dd>
              <dt className="text-muted-foreground">Last sync</dt>
              <dd>
                {latestPlayer?.synced_at
                  ? new Date(latestPlayer.synced_at).toLocaleString()
                  : "never"}
              </dd>
            </dl>
            <div className="mt-4">
              <SyncPlayersButton />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
