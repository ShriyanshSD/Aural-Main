alter table public.aurel_orders
  alter column user_id drop not null;

do $$
declare
  orders_user_id_attnum smallint;
  existing_fk record;
begin
  select attnum into orders_user_id_attnum
  from pg_catalog.pg_attribute
  where attrelid = 'public.aurel_orders'::regclass
    and attname = 'user_id'
    and not attisdropped;

  for existing_fk in
    select conname
    from pg_catalog.pg_constraint
    where conrelid = 'public.aurel_orders'::regclass
      and confrelid = 'public.aurel_users'::regclass
      and contype = 'f'
      and orders_user_id_attnum = any(conkey)
  loop
    execute format('alter table public.aurel_orders drop constraint %I', existing_fk.conname);
  end loop;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.aurel_orders'::regclass
      and conname = 'aurel_orders_user_id_fkey'
  ) then
    alter table public.aurel_orders
      add constraint aurel_orders_user_id_fkey
      foreign key (user_id) references public.aurel_users(id) on delete set null;
  end if;
end;
$$;

create or replace function public.aurel_scrub_deleted_customer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'A customer id is required.';
  end if;

  update public.aurel_orders as o
  set user_id = null,
      order_data = jsonb_strip_nulls(jsonb_build_object(
        'orderId', case
          when o.order_data ->> 'orderId' ~ '^AUREL[A-Z0-9]{5,16}$'
          then to_jsonb(o.order_data ->> 'orderId')
        end,
        'paymentMethod', case
          when o.order_data ->> 'paymentMethod' like 'Razorpay UPI (%' then to_jsonb('Razorpay UPI'::text)
          when o.order_data ->> 'paymentMethod' = 'Razorpay Secure Card' then to_jsonb('Razorpay Secure Card'::text)
          when o.order_data ->> 'paymentMethod' like 'Razorpay Netbanking (%' then to_jsonb('Razorpay Netbanking'::text)
        end,
        'items', case
          when jsonb_typeof(o.order_data -> 'items') = 'array' then (
            select coalesce(
              jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                'price', case when jsonb_typeof(item.value -> 'price') = 'number' then item.value -> 'price' end,
                'quantity', case when jsonb_typeof(item.value -> 'quantity') = 'number' then item.value -> 'quantity' end,
                'finish', case when item.value ->> 'finish' in ('matte', 'gloss') then item.value -> 'finish' end
              ))),
              '[]'::jsonb
            )
            from jsonb_array_elements(o.order_data -> 'items') as item(value)
          )
          else '[]'::jsonb
        end,
        'subtotal', case when jsonb_typeof(o.order_data -> 'subtotal') = 'number' then o.order_data -> 'subtotal' end,
        'shipping', case when jsonb_typeof(o.order_data -> 'shipping') = 'number' then o.order_data -> 'shipping' end,
        'total', case when jsonb_typeof(o.order_data -> 'total') = 'number' then o.order_data -> 'total' end,
        'status', case when o.order_data ->> 'status' in ('paid', 'pending') then o.order_data -> 'status' end
      ))
  where o.user_id = p_user_id;

  delete from public.aurel_chat_messages where user_id = p_user_id;
  delete from public.aurel_sessions where user_id = p_user_id;
  delete from public.aurel_users where id = p_user_id;

  if exists (select 1 from public.aurel_orders where user_id = p_user_id)
    or exists (select 1 from public.aurel_chat_messages where user_id = p_user_id)
    or exists (select 1 from public.aurel_sessions where user_id = p_user_id)
    or exists (select 1 from public.aurel_users where id = p_user_id) then
    raise exception 'Customer data cleanup did not complete.';
  end if;
end;
$$;

create or replace function public.aurel_cleanup_auth_deleted_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.aurel_scrub_deleted_customer(old.id);
  return old;
end;
$$;

drop trigger if exists aurel_cleanup_auth_deleted_customer on auth.users;
create trigger aurel_cleanup_auth_deleted_customer
  before delete on auth.users
  for each row
  execute function public.aurel_cleanup_auth_deleted_customer();

create or replace function public.aurel_admin_cleanup_orphaned_customer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'A customer id is required.';
  end if;
  if exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'The Auth account still exists; delete it through the Supabase Auth Admin API.';
  end if;

  perform public.aurel_scrub_deleted_customer(p_user_id);
end;
$$;

revoke all on function public.aurel_scrub_deleted_customer(uuid) from public, anon, authenticated;
revoke all on function public.aurel_cleanup_auth_deleted_customer() from public, anon, authenticated;
revoke all on function public.aurel_admin_cleanup_orphaned_customer(uuid) from public, anon, authenticated;
grant execute on function public.aurel_admin_cleanup_orphaned_customer(uuid) to service_role;

create or replace function public.aurel_admin_delete_customer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Direct profile deletion is disabled; delete the Auth account through the Supabase Auth Admin API.';
end;
$$;

revoke all on function public.aurel_admin_delete_customer(uuid) from public, anon, authenticated;
grant execute on function public.aurel_admin_delete_customer(uuid) to service_role;
