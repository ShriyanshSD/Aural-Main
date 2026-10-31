alter table public.aurel_orders
  add column if not exists confirmation_email_status text not null default 'pending'
    check (confirmation_email_status in ('pending', 'sending', 'sent', 'failed')),
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_error text;

create or replace function public.aurel_claim_confirmation_email(p_order_id bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.aurel_orders
    set confirmation_email_status = 'sending',
        confirmation_email_error = null,
        updated_at = now()
    where id = p_order_id
      and payment_status = 'paid'
      and order_status in ('confirmed', 'processing', 'shipped', 'delivered')
      and confirmation_email_status in ('pending', 'failed')
    returning id
  )
  select exists (select 1 from claimed);
$$;

revoke all on function public.aurel_claim_confirmation_email(bigint) from public, anon, authenticated;
grant execute on function public.aurel_claim_confirmation_email(bigint) to service_role;
