-- ============================================================
-- Reshape teams: drop budget_* (Cr numeric), add purse_* (lakh int)
-- and owner_email so signups auto-attach to a team.
-- ============================================================
alter table public.teams drop column budget_total;
alter table public.teams drop column budget_remaining;

alter table public.teams add column purse_total integer not null default 15000;
alter table public.teams add column purse_remaining integer not null default 15000;
alter table public.teams add column owner_email text;
alter table public.teams add constraint teams_purse_remaining_nonneg check (purse_remaining >= 0);

create unique index teams_owner_email_lower_idx on public.teams (lower(owner_email));

-- ============================================================
-- squad_entries: which player is on which league team
-- price_lakhs: 1 Cr = 100 lakhs, so 4 Cr = 400, 1.5 Cr = 150, 0.5 Cr = 50
-- A player can only be 'active' on one team at a time (partial unique).
-- ============================================================
create table public.squad_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  price_lakhs integer not null check (price_lakhs > 0),
  auction_type text not null default 'main'
    check (auction_type in ('main','mini','replacement','trade')),
  status text not null default 'active'
    check (status in ('active','released','traded')),
  acquired_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index squad_entries_one_active_per_player_idx
  on public.squad_entries(player_id) where status = 'active';
create index squad_entries_team_idx on public.squad_entries(team_id);
create index squad_entries_player_idx on public.squad_entries(player_id);

alter table public.squad_entries enable row level security;

create policy "squad_entries_select_authed"
  on public.squad_entries for select to authenticated using (true);

create policy "squad_entries_write_admin"
  on public.squad_entries for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create trigger squad_entries_set_updated_at
  before update on public.squad_entries
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- Auto-maintain teams.purse_remaining as squad changes
-- ============================================================
create or replace function public.tg_recalc_team_purse()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  v_team_id := coalesce(new.team_id, old.team_id);
  update public.teams t
  set purse_remaining = t.purse_total - coalesce((
    select sum(price_lakhs)::integer
    from public.squad_entries
    where team_id = v_team_id and status = 'active'
  ), 0)
  where t.id = v_team_id;
  return coalesce(new, old);
end;
$$;

create trigger squad_entries_recalc_purse
  after insert or update or delete on public.squad_entries
  for each row execute function public.tg_recalc_team_purse();

-- ============================================================
-- Extend handle_new_user: pair the new user with their team if
-- their email matches a teams.owner_email (case-insensitive).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'jasondazza@gmail.com' then 'admin' else 'owner' end
  );

  update public.teams
  set owner_id = new.id
  where lower(owner_email) = lower(new.email) and owner_id is null;

  return new;
end;
$$;
