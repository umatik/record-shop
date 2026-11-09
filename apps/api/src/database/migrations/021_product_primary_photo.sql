-- Main photo of the product (shop listings, product view), separate from variant photos. The wizard copies
-- the first label photo here when it creates a product; the panel can replace it later.
ALTER TABLE products ADD COLUMN primary_photo_url VARCHAR(2048);
