create table if not exists public.aurel_magazine_customizations (
  id uuid primary key,
  user_id uuid references public.aurel_users(id) on delete set null,
  cart_item_id text,
  order_row_id bigint references public.aurel_orders(id) on delete set null,
  order_item_index integer,
  recipient_name text not null default '',
  print_finish text not null default 'matte' check (print_finish in ('matte', 'gloss')),
  occasion text not null default '',
  page_count smallint not null default 4 check (page_count in (4, 8)),
  dedication_message text not null default '',
  additional_preferences text not null default '',
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_item_index is null or order_item_index >= 0)
);

create unique index if not exists aurel_magazine_customizations_order_item_idx
  on public.aurel_magazine_customizations (order_row_id, order_item_index)
  where order_row_id is not null;
create index if not exists aurel_magazine_customizations_user_activity_idx
  on public.aurel_magazine_customizations (user_id, last_activity_at desc);

create table if not exists public.aurel_magazine_uploads (
  id uuid primary key default gen_random_uuid(),
  customization_id uuid not null references public.aurel_magazine_customizations(id) on delete cascade,
  user_id uuid references public.aurel_users(id) on delete set null,
  file_type text not null check (file_type in ('photo', 'message')),
  original_filename text not null check (length(original_filename) between 1 and 255),
  storage_path text not null unique,
  content_type text not null check (
    (file_type = 'photo' and content_type in ('image/jpeg', 'image/png', 'image/webp'))
    or (file_type = 'message' and content_type = 'text/plain')
  ),
  file_size integer not null check (
    (file_type = 'photo' and file_size between 1 and 8388608)
    or (file_type = 'message' and file_size between 1 and 524288)
  ),
  status text not null default 'pending' check (status in ('pending', 'complete', 'superseded')),
  created_at timestamptz not null default now(),
  uploaded_at timestamptz
);

create index if not exists aurel_magazine_uploads_customization_idx
  on public.aurel_magazine_uploads (customization_id, file_type, status, created_at);
create index if not exists aurel_magazine_uploads_user_idx
  on public.aurel_magazine_uploads (user_id, created_at desc);
create unique index if not exists aurel_magazine_uploads_current_message_idx
  on public.aurel_magazine_uploads (customization_id)
  where file_type = 'message' and status = 'complete';

alter table public.aurel_magazine_customizations enable row level security;
alter table public.aurel_magazine_uploads enable row level security;

revoke all on table public.aurel_magazine_customizations, public.aurel_magazine_uploads from anon, authenticated;
grant all on table public.aurel_magazine_customizations, public.aurel_magazine_uploads to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aurel-magazine-uploads',
  'aurel-magazine-uploads',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'text/plain']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
