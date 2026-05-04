import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TeamRow = {
  id: string;
  name: string;
  owner_email: string | null;
  owner_id: string | null;
  purse_total: number;
  purse_remaining: number;
  squad_entries: { count: number }[];
};

function formatCr(lakhs: number) {
  return `${(lakhs / 100).toFixed(2)} Cr`;
}

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

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-8">
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">League teams</h1>
        <Link href="/account" className="text-sm text-muted-foreground underline">
          Account
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3 text-right">Squad</th>
              <th className="px-4 py-3 text-right">Spent</th>
              <th className="px-4 py-3 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const spent = t.purse_total - t.purse_remaining;
              const overspent = t.purse_remaining < 0;
              const playerCount = t.squad_entries[0]?.count ?? 0;
              return (
                <tr key={t.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/teams/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.owner_email ?? "—"}
                    {t.owner_id ? null : (
                      <span className="ml-2 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        unclaimed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{playerCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCr(spent)}</td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      overspent ? "text-red-500" : ""
                    }`}
                  >
                    {formatCr(t.purse_remaining)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
