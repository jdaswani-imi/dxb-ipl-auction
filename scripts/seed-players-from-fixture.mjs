// One-shot seed: upserts players from supabase/fixtures/ipl_2026_squads.json
// using the Supabase service role. Run with `node scripts/seed-players-from-fixture.mjs`.
// Useful for re-seeding local state without burning a CricAPI call.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const fixture = JSON.parse(
  readFileSync("supabase/fixtures/ipl_2026_squads.json", "utf8"),
);

const now = new Date().toISOString();
const rows = fixture.data.flatMap((team) =>
  team.players.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role || null,
    batting_style: p.battingStyle || null,
    bowling_style: p.bowlingStyle || null,
    country: p.country || null,
    player_img: p.playerImg || null,
    ipl_team_name: team.teamName,
    ipl_team_short: team.shortname,
    ipl_team_img: team.img || null,
    synced_at: now,
  })),
);

console.log(`Upserting ${rows.length} players across ${fixture.data.length} teams…`);

const res = await fetch(`${SUPABASE_URL}/rest/v1/players?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log("Done.");
