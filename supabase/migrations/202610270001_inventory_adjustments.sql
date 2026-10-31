alter table public.aurel_products
  add column if not exists low_stock_threshold integer not null default 5
  check (low_stock_threshold >= 0);

create table if not exists public.aurel_inventory_movements (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  product_id varchar(100) references public.aurel_products(id) on delete set null,
  product_name text not null,
  actor_user_id uuid,
  quantity_change integer not null check (quantity_change <> 0),
  previous_quantity integer not null check (previous_quantity >= 0),
  new_quantity integer not null check (new_quantity >= 0),
  reason text not null check (length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

create index if not exists aurel_inventory_movements_product_created_idx
  on public.aurel_inventory_movements (product_id, created_at desc);

alter table public.aurel_inventory_movements enable row level security;
revoke all on table public.aurel_inventory_movements from anon, authenticated;
grant all on table public.aurel_inventory_movements to service_role;
grant usage, select on sequence public.aurel_inventory_movements_id_seq to service_role;

create or replace function public.aurel_adjust_inventory(
  p_product_id text,
  p_actor_id uuid,
  p_quantity_change integer,
  p_reason text,
  p_request_id uuid
)
returns table (
  movement_id bigint,
  product_id text,
  previous_quantity integer,
  new_quantity integer,
  quantity_change integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_row public.aurel_products%rowtype;
  movement_row public.aurel_inventory_movements%rowtype;
begin
  if p_product_id is null or p_actor_id is null or p_request_id is null
    or p_quantity_change is null or p_quantity_change = 0
    or abs(p_quantity_change::bigint) > 1000000
    or p_reason is null or length(btrim(p_reason)) < 3 or length(p_reason) > 500 then
    raise exception 'Inventory adjustment details are invalid.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text, 0)
  );

  select * into movement_row
  from public.aurel_inventory_movements
  where request_id = p_request_id;
  if found then
    if movement_row.product_id is distinct from p_product_id
      or movement_row.actor_user_id is distinct from p_actor_id
      or movement_row.quantity_change <> p_quantity_change
      or movement_row.reason <> btrim(p_reason) then
      raise exception 'This inventory request ID was already used for a different adjustment.';
    end if;
    return query select movement_row.id, movement_row.product_id,
      movement_row.previous_quantity, movement_row.new_quantity, movement_row.quantity_change;
    return;
  end if;

  select * into product_row
  from public.aurel_products
  where id = p_product_id
  for update;
  if not found then
    raise exception 'Product not found.';
  end if;
  if product_row.stock_quantity is null then
    raise exception 'Enable stock tracking for this product before adjusting inventory.';
  end if;
  if product_row.stock_quantity + p_quantity_change < 0 then
    raise exception 'The adjustment cannot reduce stock below zero.';
  end if;

  update public.aurel_products
  set stock_quantity = product_row.stock_quantity + p_quantity_change,
      updated_at = now()
  where id = p_product_id;

  insert into public.aurel_inventory_movements (
    request_id, product_id, product_name, actor_user_id, quantity_change,
    previous_quantity, new_quantity, reason
  ) values (
    p_request_id, product_row.id, product_row.name, p_actor_id, p_quantity_change,
    product_row.stock_quantity, product_row.stock_quantity + p_quantity_change, btrim(p_reason)
  )
  returning * into movement_row;

  return query select movement_row.id, movement_row.product_id,
    movement_row.previous_quantity, movement_row.new_quantity, movement_row.quantity_change;
end;
$$;

revoke all on function public.aurel_adjust_inventory(text, uuid, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.aurel_adjust_inventory(text, uuid, integer, text, uuid)
  to service_role;
