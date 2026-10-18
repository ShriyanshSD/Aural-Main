create or replace function public.aurel_admin_delete_customer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'A customer id is required.';
  end if;

  delete from public.aurel_orders where user_id = p_user_id;
  delete from public.aurel_chat_messages where user_id = p_user_id;
  delete from public.aurel_sessions where user_id = p_user_id;
  delete from public.aurel_users where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.aurel_admin_delete_customer(uuid) from public, anon, authenticated;
grant execute on function public.aurel_admin_delete_customer(uuid) to service_role;
