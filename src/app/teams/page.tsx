import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CircleDollarSign,
  ShieldCheck,
  Trophy,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TeamRow = {
  id: string;
  name: string;
  owner_email: string | null;
  owner_id: string | null;
  purse_total: number;
  purse_remaining: number;
  squad_entries: { count: number }[];
};

const formatCr = (lakhs: number) => `${(lakhs / 100).toFixed(2)} Cr`;

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/teams");

  const { data: teams } = await supabase
    .from("teams")
    .select(
      "id, name, owner_email, owner_id, purse_total, purse_remaining, squad_entries(count)",
    )
    .order("name");
  const rows = (teams ?? []) as TeamRow[];

  const totals = rows.reduce(
    (acc, t) => {
      const playerCount = t.squad_entries[0]?.count ?? 0;
      return {
        teams: acc.teams + 1,
        players: acc.players + playerCount,
        spent: acc.spent + (t.purse_total - t.purse_remaining),
        unclaimed: acc.unclaimed + (t.owner_id ? 0 : 1),
      };
    },
    { teams: 0, players: 0, spent: 0, unclaimed: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            League teams
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Squad sizes and purse usage across all ten franchises.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Trophy}
          label="Teams"
          value={totals.teams}
        />
        <KpiCard
          icon={Users}
          label="Squad picks"
          value={totals.players}
        />
        <KpiCard
          icon={CircleDollarSign}
          label="In play"
          value={formatCr(totals.spent)}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Owners paired"
          value={`${totals.teams - totals.unclaimed}/${totals.teams}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standings</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Squad</TableHead>
                <TableHead>Purse used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const players = t.squad_entries[0]?.count ?? 0;
                const spent = t.purse_total - t.purse_remaining;
                const overspent = t.purse_remaining < 0;
                const pct = Math.min(
                  100,
                  Math.max(0, (spent / t.purse_total) * 100),
                );
                const initial =
                  (t.owner_email ?? t.name).slice(0, 1).toUpperCase();
                return (
                  <TableRow key={t.id} className="group">
                    <TableCell className="font-medium">
                      <Link href={`/teams/${t.id}`} className="hover:underline">
                        {t.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[10px]">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-xs text-muted-foreground">
                          {t.owner_email ?? "—"}
                        </span>
                        {!t.owner_id ? (
                          <Badge variant="outline" className="text-[10px]">
                            unclaimed
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {players}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              overspent ? "bg-destructive" : "bg-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatCr(spent)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {overspent ? (
                        <Badge variant="destructive" className="font-mono text-xs">
                          {formatCr(t.purse_remaining)}
                        </Badge>
                      ) : (
                        <span className="font-mono text-xs tabular-nums">
                          {formatCr(t.purse_remaining)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/teams/${t.id}`}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Open ${t.name}`}
                      >
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-heading text-xl font-semibold tabular-nums">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
