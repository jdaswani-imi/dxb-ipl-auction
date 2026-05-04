import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  };
};

function formatCr(lakhs: number) {
  return `${(lakhs / 100).toFixed(2)} Cr`;
}

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
      "id, price_lakhs, auction_type, status, acquired_at, player:players(id, name, role, country, player_img, ipl_team_short, ipl_team_name)",
    )
    .eq("team_id", id)
    .eq("status", "active")
    .order("price_lakhs", { ascending: false });

  const squad = (rawSquad ?? []) as unknown as SquadRow[];
  const spent = team.purse_total - team.purse_remaining;
  const overspent = team.purse_remaining < 0;

  // Group by IPL franchise for visual clarity
  const byFranchise = new Map<string, SquadRow[]>();
  for (const row of squad) {
    const key = row.player.ipl_team_short;
    if (!byFranchise.has(key)) byFranchise.set(key, []);
    byFranchise.get(key)!.push(row);
  }
  const franchises = [...byFranchise.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-8">
      <div className="mb-6">
        <Link href="/teams" className="text-sm text-muted-foreground hover:underline">
          ← All teams
        </Link>
      </div>

      <div className="mb-8 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">{team.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {team.owner_email ?? "no owner email set"}
        </p>
        <dl className="mt-6 grid grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Squad</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {squad.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Purse</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCr(team.purse_total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Spent</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCr(spent)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Remaining</dt>
            <dd
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                overspent ? "text-red-500" : ""
              }`}
            >
              {formatCr(team.purse_remaining)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-6">
        {franchises.map(([short, players]) => (
          <section key={short} className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              {short} ({players.length})
            </h2>
            <ul className="divide-y">
              {players.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{row.player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.player.role ?? "—"}
                      {row.player.country ? ` · ${row.player.country}` : ""}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-medium">{formatCr(row.price_lakhs)}</div>
                    {row.auction_type !== "main" ? (
                      <div className="text-xs text-muted-foreground">
                        {row.auction_type}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
