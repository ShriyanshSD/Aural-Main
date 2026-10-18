create table if not exists public.aurel_users (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  username varchar(24) not null unique,
  email varchar(254) not null unique,
  pending_email varchar(254),
  phone varchar(20) not null,
  address varchar(240) not null,
  gender varchar(32) not null,
  password_salt char(32) not null,
  password_hash char(128) not null,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint aurel_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

alter table public.aurel_users
  add column if not exists email_verified boolean not null default false;

alter table public.aurel_users
  add column if not exists pending_email varchar(254);

create unique index if not exists aurel_users_pending_email_unique
  on public.aurel_users (lower(pending_email))
  where pending_email is not null;

alter table public.aurel_users
  alter column email_verified set default false;

alter table public.aurel_users
  add column if not exists date_of_birth date,
  add column if not exists city varchar(100),
  add column if not exists state varchar(100),
  add column if not exists postal_code varchar(12);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'aurel_users_auth_user_fk'
      and conrelid = 'public.aurel_users'::regclass
  ) then
    alter table public.aurel_users
      add constraint aurel_users_auth_user_fk
      foreign key (id) references auth.users(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

create table if not exists public.aurel_sessions (
  token_hash char(64) primary key,
  user_id uuid not null references public.aurel_users(id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists aurel_sessions_expiry_idx on public.aurel_sessions (expires_at);

create table if not exists public.aurel_chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.aurel_users(id) on delete cascade,
  role varchar(16) not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists aurel_chat_messages_user_order_idx
  on public.aurel_chat_messages (user_id, id);

create table if not exists public.aurel_orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.aurel_users(id) on delete cascade,
  order_id varchar(32) not null,
  order_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, order_id)
);

create index if not exists aurel_orders_user_created_idx
  on public.aurel_orders (user_id, created_at desc);

alter table public.aurel_users enable row level security;
alter table public.aurel_sessions enable row level security;
alter table public.aurel_chat_messages enable row level security;
alter table public.aurel_orders enable row level security;

revoke all on table public.aurel_users, public.aurel_sessions from anon, authenticated;
grant all on table public.aurel_users, public.aurel_sessions to service_role;
revoke all on table public.aurel_chat_messages from anon, authenticated;
grant all on table public.aurel_chat_messages to service_role;
revoke all on table public.aurel_orders from anon, authenticated;
grant all on table public.aurel_orders to service_role;
