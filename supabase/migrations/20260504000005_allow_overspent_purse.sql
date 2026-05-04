-- Some teams ended up over budget after replacement-player assignments. Drop
-- the non-negative check so the data reflects reality; overspend can be
-- surfaced in the UI instead of blocked at the database layer.
alter table public.teams drop constraint teams_purse_remaining_nonneg;
