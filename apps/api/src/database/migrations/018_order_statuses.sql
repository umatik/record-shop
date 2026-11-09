-- Etap sprzedaży (docs/sprzedaz.md): statusy zamówienia z czasem każdej zmiany i powodem anulowania.
-- pending → paid → shipped → delivered; z pending i paid można anulować (cancelled).
ALTER TABLE orders
  ADD COLUMN paid_at       TIMESTAMPTZ NULL,
  ADD COLUMN shipped_at    TIMESTAMPTZ NULL,
  ADD COLUMN cancelled_at  TIMESTAMPTZ NULL,
  ADD COLUMN cancel_reason TEXT        NULL,
  ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled'));

-- Pulpit panelu filtruje po statusie (np. opłacone do wysłania).
CREATE INDEX idx_orders_status
  ON orders (status)
  WHERE is_deleted = FALSE;

-- Uprawnienie do obsługi zamówień w panelu, dla istniejących baz (świeża baza dostaje je z seed_data.sql).
-- Na pustej bazie (przed seedem) nic się nie dzieje, żeby nie zająć id, które nadaje seed.
INSERT INTO permissions (id, name)
SELECT 11, 'orders:manage'
WHERE EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
       JOIN permissions p ON p.name = 'orders:manage'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
