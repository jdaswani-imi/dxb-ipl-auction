-- IPL player roster (sourced from CricAPI series_squad)
-- id matches the cricapi player UUID so re-syncs are idempotent.
create table public.players (
  id uuid primary key,
  name text not null,
  role text,
  batting_style text,
  bowling_style text,
  country text,
  player_img text,
  ipl_team_name text not null,
  ipl_team_short text not null,
  ipl_team_img text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "players_select_authed"
  on public.players for select
  to authenticated
  using (true);

create policy "players_write_admin"
  on public.players for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.tg_set_updated_at();

create index players_ipl_team_short_idx on public.players(ipl_team_short);
create index players_country_idx on public.players(country);
create index players_role_idx on public.players(role);
