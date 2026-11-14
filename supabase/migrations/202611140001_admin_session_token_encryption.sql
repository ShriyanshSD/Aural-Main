begin;

delete from public.aurel_admin_sessions;
delete from public.aurel_native_admin_sessions;

alter table public.aurel_admin_sessions
  drop column access_token,
  drop column refresh_token,
  add column access_token_encrypted text not null,
  add column refresh_token_encrypted text not null;

alter table public.aurel_native_admin_sessions
  drop column supabase_access_token,
  drop column supabase_refresh_token,
  add column supabase_access_token_encrypted text not null,
  add column supabase_refresh_token_encrypted text not null;

commit;
