import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Database,
  ShieldCheck,
  User as UserIcon,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SyncPlayersButton } from "./sync-players-button";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, created_at")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  // Find the team this user owns (if any)
  const { data: ownedTeam } = await supabase
    .from("teams")
    .select("id, name, purse_total, purse_remaining")
    .eq("owner_id", user.id)
    .maybeSingle();

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
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and (if applicable) admin tools.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="size-4 text-muted-foreground" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-mono text-xs sm:text-sm">{user.email}</dd>

              <dt className="text-muted-foreground">User ID</dt>
              <dd className="truncate font-mono text-xs">{user.id}</dd>

              <dt className="text-muted-foreground">Display name</dt>
              <dd>{profile?.display_name ?? "—"}</dd>

              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <Badge variant={isAdmin ? "default" : "secondary"}>
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="mr-1 size-3" />
                      admin
                    </>
                  ) : (
                    "owner"
                  )}
                </Badge>
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Your team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ownedTeam ? (
              <div>
                <Link
                  href={`/teams/${ownedTeam.id}`}
                  className="text-base font-medium hover:underline"
                >
                  {ownedTeam.name}
                </Link>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">Purse</div>
                    <div className="mt-0.5 font-mono text-sm">
                      {(ownedTeam.purse_total / 100).toFixed(2)} Cr
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">Remaining</div>
                    <div
                      className={`mt-0.5 font-mono text-sm ${
                        ownedTeam.purse_remaining < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {(ownedTeam.purse_remaining / 100).toFixed(2)} Cr
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No team paired with this email yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin ? (
        <>
          <Separator className="my-10" />
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="font-heading text-lg font-semibold tracking-tight">Admin</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                Player roster sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Players in DB" value={String(playerCount ?? 0)} />
                <Stat
                  label="Last sync"
                  value={
                    latestPlayer?.synced_at
                      ? new Date(latestPlayer.synced_at).toLocaleString()
                      : "never"
                  }
                />
                <Stat label="Source" value="CricAPI · IPL 2026" />
              </div>
              <div className="mt-5">
                <SyncPlayersButton />
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm">{value}</div>
    </div>
  );
}
