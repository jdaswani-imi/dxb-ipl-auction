create table matches (
  id              uuid    primary key default gen_random_uuid(),
  cricsheet_id    text    unique not null,          -- filename stem, e.g. "1529292"
  match_date      date    not null,
  season          text    not null,
  event_name      text,
  match_number    integer,
  venue           text,
  team1           text    not null,
  team2           text    not null,
  toss_winner     text,
  toss_decision   text,
  winner          text,
  win_by_runs     integer,
  win_by_wickets  integer,
  player_of_match text[],
  imported_at     timestamptz default now(),
  created_at      timestamptz default now()
);

create table match_player_performances (
  id                    uuid    primary key default gen_random_uuid(),
  match_id              uuid    not null references matches(id) on delete cascade,
  player_name           text    not null,
  cricsheet_registry_id text,
  ipl_team              text    not null,

  -- batting
  runs_scored           integer not null default 0,
  balls_faced           integer not null default 0,
  fours                 integer not null default 0,
  sixes                 integer not null default 0,
  dismissal             text,   -- null = did not bat | 'not out' | wicket kind

  -- bowling
  balls_bowled          integer not null default 0,
  runs_conceded         integer not null default 0,
  wickets               integer not null default 0,
  dot_balls             integer not null default 0,
  maidens               integer not null default 0,
  lbw_bowled_wickets    integer not null default 0,

  -- fielding
  catches               integer not null default 0,
  stumpings             integer not null default 0,
  direct_runouts        integer not null default 0,
  assisted_runouts      integer not null default 0,

  fantasy_points        numeric(6,1) not null default 0,

  created_at            timestamptz default now(),

  unique (match_id, player_name)
);

create index on match_player_performances (match_id);
create index on match_player_performances (player_name);

alter table matches enable row level security;
alter table match_player_performances enable row level security;

create policy "auth read matches"
  on matches for select to authenticated using (true);

create policy "admin write matches"
  on matches for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "auth read performances"
  on match_player_performances for select to authenticated using (true);

create policy "admin write performances"
  on match_player_performances for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
