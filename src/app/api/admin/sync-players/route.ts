import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SERIES_ID = "87c62aac-bc3c-4738-ab93-19da0690488f"; // Indian Premier League 2026

type CricapiPlayer = {
  id: string;
  name: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  playerImg?: string;
};

type CricapiSquad = {
  teamName: string;
  shortname: string;
  img?: string;
  players: CricapiPlayer[];
};

type CricapiResponse = {
  data?: CricapiSquad[];
  status?: string;
  info?: { hitsToday?: number; hitsLimit?: number };
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const apikey = process.env.CRICAPI_KEY;
  if (!apikey) {
    return NextResponse.json(
      { error: "CRICAPI_KEY not configured" },
      { status: 500 },
    );
  }

  const url = `https://api.cricapi.com/v1/series_squad?apikey=${apikey}&id=${SERIES_ID}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "cricapi_fetch_failed", status: res.status },
      { status: 502 },
    );
  }
  const json = (await res.json()) as CricapiResponse;
  if (!json.data?.length) {
    return NextResponse.json(
      { error: "cricapi_empty_response", status: json.status },
      { status: 502 },
    );
  }

  const now = new Date().toISOString();
  const rows = json.data.flatMap((team) =>
    team.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role ?? null,
      batting_style: p.battingStyle ?? null,
      bowling_style: p.bowlingStyle ?? null,
      country: p.country ?? null,
      player_img: p.playerImg ?? null,
      ipl_team_name: team.teamName,
      ipl_team_short: team.shortname,
      ipl_team_img: team.img ?? null,
      synced_at: now,
    })),
  );

  const admin = createAdminClient();
  const { error } = await admin
    .from("players")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    teams: json.data.length,
    players: rows.length,
    cricapi_hits: json.info,
  });
}
