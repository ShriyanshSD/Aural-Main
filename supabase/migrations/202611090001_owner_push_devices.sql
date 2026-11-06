create table if not exists public.aurel_owner_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  token text not null,
  token_hash char(64) not null unique,
  platform text not null check (platform = 'android'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aurel_owner_push_devices_user_idx
  on public.aurel_owner_push_devices (user_id, enabled);

alter table public.aurel_owner_push_devices enable row level security;
revoke all on table public.aurel_owner_push_devices from anon, authenticated;
grant all on table public.aurel_owner_push_devices to service_role;
