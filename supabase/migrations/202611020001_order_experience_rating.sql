ALTER TABLE public.aurel_orders
  ADD COLUMN IF NOT EXISTS order_experience_rating smallint
  CHECK (order_experience_rating BETWEEN 1 AND 5);

ALTER TABLE public.aurel_reviews
  ALTER COLUMN order_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS reviewer_name varchar(80) NOT NULL DEFAULT 'Customer';

ALTER TABLE public.aurel_reviews
  DROP CONSTRAINT IF EXISTS aurel_reviews_order_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS aurel_reviews_order_product_unique_idx
  ON public.aurel_reviews (order_id, product_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS aurel_reviews_user_product_unique_idx
  ON public.aurel_reviews (user_id, product_id)
  WHERE order_id IS NULL AND user_id IS NOT NULL;
