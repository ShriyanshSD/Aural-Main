ALTER TABLE public.aurel_orders
  ADD COLUMN IF NOT EXISTS custom_gift_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_magazine_archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.aurel_archive_custom_order_history(
  p_owner_id uuid,
  p_custom_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archive_time timestamptz := now();
  archived_count integer := 0;
  archive_column text;
BEGIN
  IF p_custom_type = 'gift-studio' THEN
    UPDATE public.aurel_orders AS orders
    SET custom_gift_archived_at = archive_time,
        updated_at = archive_time
    WHERE payment_status = 'paid'
      AND custom_gift_archived_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(orders.order_data->'items') = 'array'
            THEN orders.order_data->'items' ELSE '[]'::jsonb END
        ) AS item(value)
        WHERE item.value->>'productId' = 'custom_hamper_mix'
      );
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    archive_column := 'custom_gift';
  ELSIF p_custom_type = 'magazines' THEN
    UPDATE public.aurel_orders AS orders
    SET custom_magazine_archived_at = archive_time,
        updated_at = archive_time
    WHERE payment_status = 'paid'
      AND custom_magazine_archived_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(orders.order_data->'items') = 'array'
            THEN orders.order_data->'items' ELSE '[]'::jsonb END
        ) AS item(value)
        WHERE item.value ? 'magazineCustomization'
          OR lower(coalesce(item.value->>'name', '')) LIKE 'custom magazine%'
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(item.value->'customComponents') = 'array'
                THEN item.value->'customComponents' ELSE '[]'::jsonb END
            ) AS component(value)
            WHERE component.value #>> '{}' ~ '^[0-9]+ pages$'
          )
      );
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    archive_column := 'custom_magazine';
  ELSE
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_type');
  END IF;

  IF archived_count > 0 THEN
    INSERT INTO public.aurel_admin_audit_log (
      actor_user_id, action, target_type, target_id, metadata
    ) VALUES (
      p_owner_id, 'custom_order_history_archived', 'custom_orders', archive_column,
      jsonb_build_object('customType', p_custom_type, 'archivedCount', archived_count)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'archivedCount', archived_count);
END;
$$;

REVOKE ALL ON FUNCTION public.aurel_archive_custom_order_history(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aurel_archive_custom_order_history(uuid, text) TO service_role;
