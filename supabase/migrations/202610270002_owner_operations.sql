alter table public.aurel_categories
  add column if not exists display_order integer not null default 0,
  add column if not exists is_featured boolean not null default false;

alter table public.aurel_products
  add column if not exists variants jsonb not null default '[]'::jsonb
    check (jsonb_typeof(variants) = 'array');

create table if not exists public.aurel_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(action) between 1 and 100),
  target_type text not null check (length(target_type) between 1 and 80),
  target_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists aurel_admin_audit_log_created_idx
  on public.aurel_admin_audit_log (created_at desc);
create index if not exists aurel_admin_audit_log_target_idx
  on public.aurel_admin_audit_log (target_type, target_id, created_at desc);

create table if not exists public.aurel_order_operations (
  order_id bigint primary key references public.aurel_orders(id) on delete cascade,
  production_status text not null default 'awaiting_details'
    check (production_status in (
      'awaiting_details', 'ready_for_design', 'design_in_progress', 'proof_sent',
      'awaiting_customer_approval', 'approved_for_production', 'in_production',
      'quality_check', 'packed', 'ready_to_dispatch', 'completed', 'on_hold', 'cancelled'
    )),
  customer_approved_at timestamptz,
  customer_approved_by uuid references public.aurel_users(id) on delete set null,
  proof_sent_at timestamptz,
  proof_url text not null default '',
  expected_delivery_date date,
  courier text not null default '',
  tracking_number text not null default '',
  owner_notes text not null default '',
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.aurel_order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.aurel_orders(id) on delete cascade,
  actor_user_id uuid,
  actor_type text not null check (actor_type in ('owner', 'customer', 'system')),
  event_type text not null check (length(event_type) between 1 and 100),
  summary text not null check (length(summary) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.aurel_admin_notifications (
  id bigint generated always as identity primary key,
  notification_type text not null check (length(notification_type) between 1 and 80),
  title text not null check (length(title) between 1 and 160),
  message text not null check (length(message) between 1 and 500),
  target_type text not null check (length(target_type) between 1 and 80),
  target_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.aurel_reviews (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.aurel_orders(id) on delete cascade,
  user_id uuid not null references public.aurel_users(id) on delete cascade,
  product_id varchar(100) not null references public.aurel_products(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title varchar(120) not null default '',
  body text not null check (length(body) between 10 and 3000),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists aurel_order_events_order_created_idx
  on public.aurel_order_events (order_id, created_at desc);
create index if not exists aurel_admin_notifications_created_idx
  on public.aurel_admin_notifications (created_at desc);
create index if not exists aurel_reviews_product_status_idx
  on public.aurel_reviews (product_id, moderation_status, created_at desc);
create index if not exists aurel_reviews_user_idx
  on public.aurel_reviews (user_id, created_at desc);

create table if not exists public.aurel_store_content (
  id text primary key check (id = 'storefront'),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  published jsonb not null default '{}'::jsonb check (jsonb_typeof(published) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

insert into public.aurel_store_content (id, draft, published)
values (
  'storefront',
  '{
    "heroEyebrow": "A memory becomes a gift becomes a keepsake",
    "heroTitle": "Make moments worth keeping.",
    "heroSubtitle": "Thoughtful gifts, made personal.",
    "heroDescription": "From custom magazines and beautiful bouquets to curated hampers and thoughtful keepsakes, AUREL helps you turn your favourite moments into something unforgettable.",
    "heroCtaLabel": "Explore AUREL",
    "secondaryCtaLabel": "Create a Memory",
    "heroImageUrl": "/hero-image.png",
    "announcement": "",
    "aboutText": "At AUREL, we believe the best gifts are thought about, personalized, and given with meaning.",
    "deliveryPolicy": "",
    "returnsPolicy": ""
  }'::jsonb,
  '{
    "heroEyebrow": "A memory becomes a gift becomes a keepsake",
    "heroTitle": "Make moments worth keeping.",
    "heroSubtitle": "Thoughtful gifts, made personal.",
    "heroDescription": "From custom magazines and beautiful bouquets to curated hampers and thoughtful keepsakes, AUREL helps you turn your favourite moments into something unforgettable.",
    "heroCtaLabel": "Explore AUREL",
    "secondaryCtaLabel": "Create a Memory",
    "heroImageUrl": "/hero-image.png",
    "announcement": "",
    "aboutText": "At AUREL, we believe the best gifts are thought about, personalized, and given with meaning.",
    "deliveryPolicy": "",
    "returnsPolicy": ""
  }'::jsonb
)
on conflict (id) do nothing;

create table if not exists public.aurel_collections (
  id text primary key check (id ~ '^[a-z0-9]+([-_][a-z0-9]+)*$'),
  name varchar(120) not null,
  description text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aurel_collection_products (
  collection_id text not null references public.aurel_collections(id) on delete cascade,
  product_id varchar(100) not null references public.aurel_products(id) on delete cascade,
  display_order integer not null default 0,
  primary key (collection_id, product_id)
);

alter table public.aurel_admin_audit_log enable row level security;
alter table public.aurel_order_operations enable row level security;
alter table public.aurel_store_content enable row level security;
alter table public.aurel_collections enable row level security;
alter table public.aurel_collection_products enable row level security;
alter table public.aurel_order_events enable row level security;
alter table public.aurel_admin_notifications enable row level security;
alter table public.aurel_reviews enable row level security;

revoke all on table public.aurel_admin_audit_log, public.aurel_order_operations,
  public.aurel_store_content, public.aurel_collections, public.aurel_collection_products,
  public.aurel_order_events, public.aurel_admin_notifications, public.aurel_reviews
  from anon, authenticated;
grant all on table public.aurel_admin_audit_log, public.aurel_order_operations,
  public.aurel_store_content, public.aurel_collections, public.aurel_collection_products,
  public.aurel_order_events, public.aurel_admin_notifications, public.aurel_reviews
  to service_role;
grant usage, select on sequence public.aurel_admin_audit_log_id_seq,
  public.aurel_order_events_id_seq, public.aurel_admin_notifications_id_seq,
  public.aurel_reviews_id_seq to service_role;

create index if not exists aurel_collections_active_order_idx
  on public.aurel_collections (is_active, display_order, name);
create index if not exists aurel_collection_products_order_idx
  on public.aurel_collection_products (collection_id, display_order);

create or replace function public.aurel_set_collection_products(p_collection_id text, p_product_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_collection_id is null or p_product_ids is null or cardinality(p_product_ids) > 500 then
    raise exception 'Invalid collection product list';
  end if;
  if exists (
    select 1
    from unnest(p_product_ids) as requested(product_id)
    left join public.aurel_products as product on product.id = requested.product_id
    where product.id is null
  ) then
    raise exception 'One or more products do not exist';
  end if;
  delete from public.aurel_collection_products
  where collection_id = p_collection_id;
  insert into public.aurel_collection_products (collection_id, product_id, display_order)
  select p_collection_id, requested.product_id, requested.ordinality - 1
  from unnest(p_product_ids) with ordinality as requested(product_id, ordinality)
  on conflict (collection_id, product_id)
  do update set display_order = excluded.display_order;
end;
$$;

revoke all on function public.aurel_set_collection_products(text, text[]) from public, anon, authenticated;
grant execute on function public.aurel_set_collection_products(text, text[]) to service_role;
