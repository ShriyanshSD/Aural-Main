ALTER TABLE public.aurel_orders
  ADD COLUMN IF NOT EXISTS whatsapp_submitted_at timestamptz;

UPDATE public.aurel_orders
SET whatsapp_submitted_at = created_at
WHERE whatsapp_submitted_at IS NULL;

ALTER TABLE public.aurel_reviews
  DROP CONSTRAINT IF EXISTS aurel_reviews_body_check;

ALTER TABLE public.aurel_reviews
  ADD CONSTRAINT aurel_reviews_body_check
  CHECK (length(body) BETWEEN 0 AND 3000);

CREATE OR REPLACE FUNCTION public.aurel_submit_order_for_payment(p_order_id bigint, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.aurel_orders%rowtype;
  submitted_at timestamptz := now();
BEGIN
  SELECT * INTO order_row
  FROM public.aurel_orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF order_row.payment_status <> 'pending'
    OR order_row.order_status <> 'pending_payment'
    OR order_row.fulfillment_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_state');
  END IF;

  IF order_row.whatsapp_submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'alreadySubmitted', true);
  END IF;

  UPDATE public.aurel_orders
  SET whatsapp_submitted_at = submitted_at,
      updated_at = submitted_at
  WHERE id = p_order_id;

  INSERT INTO public.aurel_order_events (
    order_id, actor_type, actor_user_id, event_type, summary, metadata
  ) VALUES (
    p_order_id, 'customer', p_user_id, 'order_submitted',
    'Customer proceeded to WhatsApp and submitted the order for payment verification.',
    jsonb_build_object('paymentMethod', 'upi')
  );

  INSERT INTO public.aurel_admin_notifications (
    notification_type, title, message, target_type, target_id
  ) VALUES (
    'new_order', 'New UPI order received',
    'Order ' || order_row.order_id || ' was submitted for payment verification.',
    'order', p_order_id::text
  );

  RETURN jsonb_build_object('success', true, 'alreadySubmitted', false);
END;
$$;

REVOKE ALL ON FUNCTION public.aurel_submit_order_for_payment(bigint, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aurel_submit_order_for_payment(bigint, uuid) TO service_role;
