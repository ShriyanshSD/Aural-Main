alter table public.aurel_orders
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists order_status text not null default 'pending_payment'
    check (order_status in ('pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  add column if not exists payment_method text not null default 'upi'
    check (payment_method in ('upi')),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by uuid references auth.users(id) on delete set null,
  add column if not exists idempotency_key text;

update public.aurel_orders
set order_status = fulfillment_status
where fulfillment_status in ('processing', 'shipped', 'delivered', 'cancelled')
  and order_status = 'pending_payment';

create unique index if not exists aurel_orders_order_id_unique
  on public.aurel_orders (order_id);

create unique index if not exists aurel_orders_idempotency_unique
  on public.aurel_orders (user_id, idempotency_key)
  where idempotency_key is not null;

create sequence if not exists public.aurel_order_number_seq;

do $$
declare
  last_number bigint;
begin
  select max((regexp_match(order_id, '^AUR-[0-9]{4}-([0-9]+)$'))[1]::bigint)
  into last_number
  from public.aurel_orders;

  if last_number is not null then
    perform setval('public.aurel_order_number_seq', last_number, true);
  end if;
end;
$$;

create or replace function public.aurel_next_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'AUR-' || to_char(clock_timestamp() at time zone 'UTC', 'YYYY')
    || '-' || lpad(nextval('public.aurel_order_number_seq')::text, 5, '0');
$$;

revoke all on function public.aurel_next_order_number() from public, anon, authenticated;
grant execute on function public.aurel_next_order_number() to service_role;

create or replace function public.aurel_confirm_order_payment(p_order_id bigint, p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.aurel_orders%rowtype;
  verified_at timestamptz := now();
begin
  select * into order_row
  from public.aurel_orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  if order_row.payment_status = 'paid' and order_row.order_status = 'confirmed' then
    return jsonb_build_object('success', true, 'alreadyConfirmed', true);
  end if;

  if order_row.payment_status <> 'pending'
    or order_row.order_status <> 'pending_payment'
    or order_row.fulfillment_status = 'cancelled' then
    return jsonb_build_object('success', false, 'reason', 'invalid_state');
  end if;

  update public.aurel_orders
  set payment_status = 'paid',
      order_status = 'confirmed',
      paid_at = verified_at,
      paid_by = p_owner_id,
      updated_at = verified_at
  where id = p_order_id;

  insert into public.aurel_order_events (
    order_id, actor_type, actor_user_id, event_type, summary, metadata
  ) values (
    p_order_id, 'owner', p_owner_id, 'payment_confirmed',
    'Owner verified receipt of the UPI payment and confirmed the order.',
    jsonb_build_object('orderNumber', order_row.order_id, 'amount', order_row.order_data->'total')
  );

  insert into public.aurel_admin_audit_log (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_owner_id, 'order_payment_confirmed', 'order', p_order_id::text,
    jsonb_build_object('orderNumber', order_row.order_id, 'amount', order_row.order_data->'total')
  );

  insert into public.aurel_admin_notifications (
    notification_type, title, message, target_type, target_id
  ) values (
    'order_payment_confirmed', 'UPI payment verified',
    'Payment for order ' || order_row.order_id || ' was manually verified.',
    'order', p_order_id::text
  );

  return jsonb_build_object('success', true, 'alreadyConfirmed', false);
end;
$$;

revoke all on function public.aurel_confirm_order_payment(bigint, uuid) from public, anon, authenticated;
grant execute on function public.aurel_confirm_order_payment(bigint, uuid) to service_role;
