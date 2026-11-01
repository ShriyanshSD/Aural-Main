ALTER TABLE public.aurel_orders
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.aurel_orders
  DROP CONSTRAINT IF EXISTS aurel_orders_order_status_check;

UPDATE public.aurel_orders
SET order_status = 'paid'
WHERE payment_status = 'paid'
  AND order_status IN ('confirmed', 'processing');

ALTER TABLE public.aurel_orders
  ADD CONSTRAINT aurel_orders_order_status_check
  CHECK (order_status IN ('pending_payment', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));

CREATE OR REPLACE FUNCTION public.aurel_confirm_order_payment(p_order_id bigint, p_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.aurel_orders%rowtype;
  verified_at timestamptz := now();
BEGIN
  SELECT * INTO order_row
  FROM public.aurel_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF order_row.payment_status = 'paid' AND order_row.order_status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN jsonb_build_object('success', true, 'alreadyConfirmed', true, 'paidAt', order_row.paid_at);
  END IF;

  IF order_row.payment_status <> 'pending'
    OR order_row.order_status <> 'pending_payment'
    OR order_row.fulfillment_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_state');
  END IF;

  UPDATE public.aurel_orders
  SET payment_status = 'paid',
      order_status = 'paid',
      paid_at = verified_at,
      paid_by = p_owner_id,
      updated_at = verified_at
  WHERE id = p_order_id
  RETURNING * INTO order_row;

  INSERT INTO public.aurel_order_events (
    order_id, actor_type, actor_user_id, event_type, summary, metadata
  ) VALUES (
    p_order_id, 'owner', p_owner_id, 'payment_confirmed',
    'Owner verified receipt of the UPI payment and confirmed the order.',
    jsonb_build_object('orderNumber', order_row.order_id, 'amount', order_row.order_data->'total')
  );

  INSERT INTO public.aurel_admin_audit_log (
    actor_user_id, action, target_type, target_id, metadata
  ) VALUES (
    p_owner_id, 'order_payment_confirmed', 'order', p_order_id::text,
    jsonb_build_object('orderNumber', order_row.order_id, 'amount', order_row.order_data->'total')
  );

  INSERT INTO public.aurel_admin_notifications (
    notification_type, title, message, target_type, target_id
  ) VALUES (
    'order_payment_confirmed', 'UPI payment verified',
    'Payment for order ' || order_row.order_id || ' was manually verified.',
    'order', p_order_id::text
  );

  RETURN jsonb_build_object('success', true, 'alreadyConfirmed', false, 'paidAt', order_row.paid_at);
END;
$$;

REVOKE ALL ON FUNCTION public.aurel_confirm_order_payment(bigint, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aurel_confirm_order_payment(bigint, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.aurel_claim_confirmation_email(p_order_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE public.aurel_orders
    SET confirmation_email_status = 'sending',
        confirmation_email_error = null,
        updated_at = now()
    WHERE id = p_order_id
      AND payment_status = 'paid'
      AND order_status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
      AND confirmation_email_status IN ('pending', 'failed')
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

REVOKE ALL ON FUNCTION public.aurel_claim_confirmation_email(bigint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aurel_claim_confirmation_email(bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.aurel_update_order_fulfillment_status(
  p_order_id bigint,
  p_owner_id uuid,
  p_next_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.aurel_orders%rowtype;
  changed_at timestamptz := now();
  event_type text;
  event_summary text;
BEGIN
  IF p_next_status IS NULL OR p_next_status NOT IN ('shipped', 'delivered') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_status');
  END IF;

  SELECT * INTO order_row
  FROM public.aurel_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF order_row.order_status = p_next_status THEN
    RETURN jsonb_build_object('success', true, 'alreadyUpdated', true, 'order', to_jsonb(order_row));
  END IF;

  IF order_row.payment_status <> 'paid'
    OR NOT (
      (p_next_status = 'shipped' AND order_row.order_status = 'paid')
      OR (p_next_status = 'delivered' AND order_row.order_status IN ('paid', 'shipped'))
    ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_transition', 'currentStatus', order_row.order_status);
  END IF;

  UPDATE public.aurel_orders
  SET order_status = p_next_status,
      fulfillment_status = p_next_status,
      shipped_at = CASE
        WHEN p_next_status = 'shipped' THEN COALESCE(shipped_at, changed_at)
        ELSE shipped_at
      END,
      delivered_at = CASE
        WHEN p_next_status = 'delivered' THEN changed_at
        ELSE delivered_at
      END,
      updated_at = changed_at
  WHERE id = p_order_id
  RETURNING * INTO order_row;

  event_type := CASE WHEN p_next_status = 'shipped' THEN 'order_shipped' ELSE 'order_delivered' END;
  event_summary := 'Order ' || order_row.order_id || ' was marked ' || p_next_status || '.';

  INSERT INTO public.aurel_order_events (
    order_id, actor_type, actor_user_id, event_type, summary, metadata
  ) VALUES (
    p_order_id, 'owner', p_owner_id, event_type, event_summary,
    jsonb_build_object('orderStatus', p_next_status)
  );

  INSERT INTO public.aurel_admin_audit_log (
    actor_user_id, action, target_type, target_id, metadata
  ) VALUES (
    p_owner_id, event_type, 'order', p_order_id::text,
    jsonb_build_object('orderNumber', order_row.order_id, 'orderStatus', p_next_status)
  );

  INSERT INTO public.aurel_admin_notifications (
    notification_type, title, message, target_type, target_id
  ) VALUES (
    'order_status_updated',
    CASE WHEN p_next_status = 'shipped' THEN 'Order shipped' ELSE 'Order delivered' END,
    'Order ' || order_row.order_id || ' is now ' || p_next_status || '.',
    'order', p_order_id::text
  );

  RETURN jsonb_build_object('success', true, 'alreadyUpdated', false, 'order', to_jsonb(order_row));
END;
$$;

REVOKE ALL ON FUNCTION public.aurel_update_order_fulfillment_status(bigint, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aurel_update_order_fulfillment_status(bigint, uuid, text) TO service_role;
