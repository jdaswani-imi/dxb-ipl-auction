import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  Globe2,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SquadRow = {
  id: string;
  price_lakhs: number;
  auction_type: string;
  status: string;
  acquired_at: string;
  player: {
    id: string;
    name: string;
    role: string | null;
    country: string | null;
    player_img: string | null;
    ipl_team_short: string;
    ipl_team_name: string;
    ipl_team_img: string | null;
  };
};

const formatCr = (lakhs: number) => `${(lakhs / 100).toFixed(2)} Cr`;

const ROLE_COLOR: Record<string, string> = {
  Batsman: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Bowler: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "WK-Batsman": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "Batting Allrounder": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "Bowling Allrounder": "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/teams/${id}`);

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, owner_email, purse_total, purse_remaining")
    .eq("id", id)
    .maybeSingle();
  if (!team) notFound();

  const { data: rawSquad } = await supabase
    .from("squad_entries")
    .select(
      "id, price_lakhs, auction_type, status, acquired_at, player:players(id, name, role, country, player_img, ipl_team_short, ipl_team_name, ipl_team_img)",
    )
    .eq("team_id", id)
    .eq("status", "active")
    .order("price_lakhs", { ascending: false });
  const squad = (rawSquad ?? []) as unknown as SquadRow[];

  const spent = team.purse_total - team.purse_remaining;
  const overspent = team.purse_remaining < 0;
  const pct = Math.min(100, Math.max(0, (spent / team.purse_total) * 100));

  const byFranchise = new Map<string, { name: string; img: string | null; rows: SquadRow[] }>();
  for (const row of squad) {
    const k = row.player.ipl_team_short;
    if (!byFranchise.has(k)) {
      byFranchise.set(k, {
        name: row.player.ipl_team_name,
        img: row.player.ipl_team_img,
        rows: [],
      });
    }
    byFranchise.get(k)!.rows.push(row);
  }
  const franchises = [...byFranchise.entries()].sort(
    (a, b) => b[1].rows.length - a[1].rows.length,
  );
  const initial = (team.owner_email ?? team.name).slice(0, 1).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/teams"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All teams
      </Link>

      <Card className="mb-8 overflow-hidden">
        <div className="relative h-1 bg-gradient-to-r from-primary via-accent to-primary/60" />
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="font-heading text-base">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-heading text-2xl tracking-tight">
                {team.name}
              </CardTitle>
              <div className="mt-1 text-xs text-muted-foreground">
                {team.owner_email ?? "no owner email set"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat icon={Users} label="Squad" value={String(squad.length)} />
            <Stat
              icon={CircleDollarSign}
              label="Purse"
              value={formatCr(team.purse_total)}
            />
            <Stat
              icon={overspent ? TrendingDown : TrendingUp}
              label="Spent"
              value={formatCr(spent)}
            />
            <Stat
              icon={Shield}
              label="Remaining"
              value={formatCr(team.purse_remaining)}
              tone={overspent ? "destructive" : "default"}
            />
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                overspent ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {franchises.map(([short, group]) => (
          <Card key={short} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {group.img ? (
                    /* IPL franchise logo */
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={group.img}
                      alt={group.name}
                      className="size-7 rounded-md ring-1 ring-border"
                    />
                  ) : null}
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {group.name}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">{short}</div>
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {group.rows.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <ul className="divide-y divide-border">
                {group.rows.map((row) => {
                  const roleClass =
                    (row.player.role && ROLE_COLOR[row.player.role]) ??
                    "bg-muted text-muted-foreground";
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                    >
                      <Avatar className="size-9">
                        {row.player.player_img ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={row.player.player_img}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {row.player.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {row.player.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {row.player.role ? (
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${roleClass}`}
                            >
                              {row.player.role}
                            </span>
                          ) : null}
                          {row.player.country ? (
                            <span className="inline-flex items-center gap-1">
                              <Globe2 className="size-3" />
                              {row.player.country}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm tabular-nums">
                          {formatCr(row.price_lakhs)}
                        </div>
                        {row.auction_type !== "main" ? (
                          <div className="text-[10px] uppercase text-muted-foreground">
                            {row.auction_type}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div
        className={`font-heading text-lg font-semibold tabular-nums ${
          tone === "destructive" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
