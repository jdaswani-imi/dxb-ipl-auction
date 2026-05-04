-- Pin search_path on the updated_at trigger function
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is SECURITY DEFINER and only meant to run from the
-- on_auth_user_created trigger. Revoke RPC access so anon/authenticated
-- callers can't invoke /rest/v1/rpc/handle_new_user directly to forge rows.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
