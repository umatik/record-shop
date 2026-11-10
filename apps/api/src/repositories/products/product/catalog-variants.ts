import type { PoolClient } from "pg";

const columns = {
  newest: "p.created_at DESC",
  artist_asc: "lower(array_to_string(artists.names, ', ')) ASC NULLS LAST",
  artist_desc: "lower(array_to_string(artists.names, ', ')) DESC NULLS LAST",
  title_asc: "lower(p.title) ASC",
  title_desc: "lower(p.title) DESC",
  price_asc: "v.price_eur ASC",
  price_desc: "v.price_eur DESC",
};
export type CatalogSort = keyof typeof columns;
export function isCatalogSort(value: unknown): value is CatalogSort {
  return typeof value === "string" && Object.hasOwn(columns, value);
}
export async function listCatalogVariants(client: PoolClient, page: number, limit: number, sort: CatalogSort) {
  const result = await client.query(`
    SELECT v.id, p.id AS "productId", p.title, array_to_string(artists.names, ', ') AS artist,
           v.attributes, v.quantity, v.price_eur AS "priceEur",
           coalesce((SELECT m.url FROM product_variant_media m WHERE m.product_variant_id = v.id
                     AND m.type = 'photo' ORDER BY m.is_primary DESC, m.sort_order, m.id LIMIT 1),
                    p.primary_photo_url) AS photo,
           sum(v.quantity) OVER () AS copies, count(*) OVER () AS total
    FROM product_variants v JOIN products p ON p.id = v.product_id
    CROSS JOIN LATERAL (SELECT ARRAY(SELECT jsonb_array_elements_text(p.attributes->'artists')) AS names) artists
    WHERE p.type = 'vinyl' AND p.is_published AND NOT p.is_deleted AND NOT v.is_deleted AND v.quantity > 0
    ORDER BY ${columns[sort]}, v.id DESC
    LIMIT $1 OFFSET $2`, [limit, (page - 1) * limit]);
  return {
    total: Number(result.rows[0]?.total ?? 0),
    copies: Number(result.rows[0]?.copies ?? 0),
    variants: result.rows.map(({ total, copies, ...variant }) => variant),
  };
}
