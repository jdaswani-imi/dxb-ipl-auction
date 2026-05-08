-- ── squad_entries: add valid_from_date for time-aware ownership ───────────────
-- Existing entries default to start of 2026 season (before any game).
-- Midseason auction entries get valid_from_date = date of first post-auction game.
-- The date-aware query "who owned player P on match date D" is:
--   SELECT team_id FROM squad_entries WHERE player_id = P AND valid_from_date <= D
--   ORDER BY valid_from_date DESC LIMIT 1
alter table public.squad_entries
  add column valid_from_date date not null default '2026-01-01';

-- ── players: add cricsheet_id to bridge scorecard names → DB players ──────────
-- Populated by scripts/map-player-names.mjs (8-char hex from Cricsheet registry)
alter table public.players
  add column cricsheet_id text unique;

-- ── views ─────────────────────────────────────────────────────────────────────

-- Per-player per-match fantasy points, attributed to the correct fantasy team
-- using the date-aware ownership lookup.
-- Players with no cricsheet_id mapping are excluded until mapped.
create or replace view public.v_team_match_points as
select
  t.id            as team_id,
  t.name          as team_name,
  t.short_name    as team_short_name,
  m.id            as match_id,
  m.cricsheet_id  as match_cricsheet_id,
  m.match_date,
  m.match_number,
  m.team1,
  m.team2,
  m.winner,
  mpp.player_name,
  mpp.ipl_team,
  mpp.runs_scored,
  mpp.balls_faced,
  mpp.fours,
  mpp.sixes,
  mpp.dismissal,
  mpp.balls_bowled,
  mpp.wickets,
  mpp.dot_balls,
  mpp.maidens,
  mpp.catches,
  mpp.stumpings,
  mpp.direct_runouts,
  mpp.assisted_runouts,
  mpp.fantasy_points
from public.match_player_performances mpp
join public.matches m on m.id = mpp.match_id
join public.players pl on pl.cricsheet_id = mpp.cricsheet_registry_id
join lateral (
  select se.team_id
  from public.squad_entries se
  where se.player_id = pl.id
    and se.valid_from_date <= m.match_date
  order by se.valid_from_date desc
  limit 1
) as owner on true
join public.teams t on t.id = owner.team_id;

-- Season leaderboard: total fantasy points per fantasy team
create or replace view public.v_team_season_totals as
select
  team_id,
  team_name,
  team_short_name,
  count(distinct match_id)        as matches_contributed,
  sum(fantasy_points)::numeric(8,1) as total_points,
  round(avg(fantasy_points), 1)   as avg_points_per_player_per_match
from public.v_team_match_points
group by team_id, team_name, team_short_name
order by total_points desc;

-- Per-player season totals (useful for scouting / league stats page)
create or replace view public.v_player_season_totals as
select
  mpp.player_name,
  mpp.ipl_team,
  t.name                                    as fantasy_team,
  count(distinct m.id)                      as matches_played,
  sum(mpp.runs_scored)                      as total_runs,
  sum(mpp.fours)                            as total_fours,
  sum(mpp.sixes)                            as total_sixes,
  sum(mpp.wickets)                          as total_wickets,
  sum(mpp.catches + mpp.stumpings
      + mpp.direct_runouts + mpp.assisted_runouts) as total_fielding,
  sum(mpp.fantasy_points)::numeric(8,1)     as total_fantasy_points,
  round(avg(mpp.fantasy_points), 1)         as avg_fantasy_points
from public.match_player_performances mpp
join public.matches m on m.id = mpp.match_id
join public.players pl on pl.cricsheet_id = mpp.cricsheet_registry_id
join lateral (
  select se.team_id
  from public.squad_entries se
  where se.player_id = pl.id
    and se.valid_from_date <= m.match_date
  order by se.valid_from_date desc
  limit 1
) as owner on true
join public.teams t on t.id = owner.team_id
group by mpp.player_name, mpp.ipl_team, t.name
order by total_fantasy_points desc;
