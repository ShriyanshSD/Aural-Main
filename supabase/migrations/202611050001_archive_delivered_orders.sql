ALTER TABLE public.aurel_orders
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.aurel_archive_delivered_orders(p_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_order record;
  archive_time timestamptz := now();
  archived_count integer := 0;
BEGIN
  FOR archived_order IN
    UPDATE public.aurel_orders
    SET archived_at = archive_time,
        updated_at = archive_time
    WHERE archived_at IS NULL
      AND order_status = 'delivered'
      AND whatsapp_submitted_at IS NOT NULL
    RETURNING id, order_id
  LOOP
    archived_count := archived_count + 1;

    INSERT INTO public.aurel_order_events (
      order_id, actor_type, actor_user_id, event_type, summary, metadata
    ) VALUES (
      archived_order.id, 'owner', p_owner_id, 'order_archived',
      'Delivered order was archived from the owner order history.',
      jsonb_build_object('orderNumber', archived_order.order_id)
    );
  END LOOP;

  IF archived_count > 0 THEN
    INSERT INTO public.aurel_admin_audit_log (
      actor_user_id, action, target_type, target_id, metadata
    ) VALUES (
      p_owner_id, 'delivered_orders_archived', 'orders', 'delivered',
      jsonb_build_object('archivedCount', archived_count)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'archivedCount', archived_count);
END;
$$;

REVOKE ALL ON FUNCTION public.aurel_archive_delivered_orders(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aurel_archive_delivered_orders(uuid) TO service_role;
