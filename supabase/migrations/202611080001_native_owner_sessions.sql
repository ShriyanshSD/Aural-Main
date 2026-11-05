create table if not exists public.aurel_native_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token_hash char(64) not null unique,
  refresh_token_hash char(64) not null unique,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  supabase_access_token text not null,
  supabase_refresh_token text not null,
  supabase_expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists aurel_native_admin_sessions_refresh_expiry_idx
  on public.aurel_native_admin_sessions (refresh_expires_at);

alter table public.aurel_native_admin_sessions enable row level security;
revoke all on table public.aurel_native_admin_sessions from anon, authenticated;
grant all on table public.aurel_native_admin_sessions to service_role;
