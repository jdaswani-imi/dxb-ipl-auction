-- ============================================================
-- profiles: 1:1 with auth.users, holds role + display name
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'owner' check (role in ('admin','owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authed"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- teams: league franchises
-- ============================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text unique,
  owner_id uuid references public.profiles(id) on delete set null,
  budget_total numeric(8,2) not null default 150.00,
  budget_remaining numeric(8,2) not null default 150.00,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "teams_select_authed"
  on public.teams for select
  to authenticated
  using (true);

create policy "teams_write_admin"
  on public.teams for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- auto-create profile on auth.users insert
-- jasondazza@gmail.com gets admin role automatically
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
