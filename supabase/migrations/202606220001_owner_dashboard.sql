alter table public.aurel_users
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'disabled'));

alter table public.aurel_orders
  add column if not exists fulfillment_status text not null default 'unfulfilled'
  check (fulfillment_status in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'));

create table if not exists public.aurel_admin_sessions (
  token_hash char(64) primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists aurel_admin_sessions_expiry_idx
  on public.aurel_admin_sessions (expires_at);

create table if not exists public.aurel_categories (
  slug varchar(64) primary key check (slug ~ '^[a-z0-9]+([-_][a-z0-9]+)*$'),
  name varchar(100) not null,
  description text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aurel_products (
  id varchar(100) primary key,
  name varchar(160) not null,
  category varchar(64) not null references public.aurel_categories(slug) on update cascade on delete restrict,
  sub_category varchar(100),
  price numeric(12, 2) not null check (price >= 0),
  rating numeric(3, 2) not null default 0 check (rating >= 0 and rating <= 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  image_url text not null default '',
  image_urls text[] not null default '{}',
  fallback_color varchar(20) not null default '#F6E8E0',
  description text not null default '',
  tagline text not null default '',
  available_finishes text[] not null default '{}',
  is_customizable boolean not null default false,
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  is_active boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aurel_products_storefront_idx
  on public.aurel_products (is_published, is_active, category, created_at desc);
create index if not exists aurel_products_stock_idx
  on public.aurel_products (stock_quantity)
  where stock_quantity is not null;

create table if not exists public.aurel_store_settings (
  id text primary key check (id = 'storefront'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.aurel_admin_sessions enable row level security;
alter table public.aurel_categories enable row level security;
alter table public.aurel_products enable row level security;
alter table public.aurel_store_settings enable row level security;

revoke all on table public.aurel_admin_sessions, public.aurel_categories,
  public.aurel_products, public.aurel_store_settings from anon, authenticated;
grant all on table public.aurel_admin_sessions, public.aurel_categories,
  public.aurel_products, public.aurel_store_settings to service_role;
revoke update on table public.aurel_orders from anon, authenticated;
grant all on table public.aurel_orders to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aurel-product-images',
  'aurel-product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Aurel product images are publicly readable'
  ) then
    create policy "Aurel product images are publicly readable"
      on storage.objects for select to public
      using (bucket_id = 'aurel-product-images');
  end if;
end;
$$;
