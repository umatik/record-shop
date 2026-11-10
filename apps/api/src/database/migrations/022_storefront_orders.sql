ALTER TABLE orders
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN checkout_key UUID UNIQUE,
  ADD COLUMN checkout_hash TEXT,
  ADD COLUMN shipping JSONB,
  ADD COLUMN carrier TEXT,
  ADD COLUMN delivery_eur INTEGER,
  ADD COLUMN delivery_pln INTEGER,
  ADD CONSTRAINT orders_have_buyer CHECK (user_id IS NOT NULL OR
    (checkout_key IS NOT NULL AND checkout_hash IS NOT NULL AND shipping IS NOT NULL
      AND carrier IS NOT NULL AND delivery_eur IS NOT NULL AND delivery_pln IS NOT NULL));
