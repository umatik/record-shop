import { formatPrice } from "@/lib/price";
import { VariantCartButton } from "@/components/CartPreview";
import ListeningRoom from "@/components/ListeningRoom";
import DiscogsCredit from "@/components/DiscogsCredit";
import ShopFooter from "@/components/ShopFooter";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, mediaUrl } from "@/services/catalog";
import { isLocale, locales, messages } from "@/app/messages";

const labels = {
  en: {
    tracks: "Tracklist",
    listen: "Listen",
    copies: "Editions",
    edition: "Edition",
    label: "Label",
    number: "Catalogue number",
    year: "Year",
    country: "Country",
    format: "Format",
    speed: "Speed",
    pressing: "Pressing",
    original: "Original",
    reissue: "Reissue",
    mediaCondition: "Record condition",
    sleeveCondition: "Sleeve condition",
    generic: "Generic sleeve",
    no_cover: "No sleeve",
    stock: "In stock",
    note: "Condition notes",
    description: "Description",
    unavailable: "Could not load this record.",
  },
  es: {
    tracks: "Lista de temas",
    listen: "Escuchar",
    copies: "Ediciones",
    edition: "Edición",
    label: "Sello",
    number: "Número de catálogo",
    year: "Año",
    country: "País",
    format: "Formato",
    speed: "Velocidad",
    pressing: "Prensado",
    original: "Original",
    reissue: "Reedición",
    mediaCondition: "Estado del disco",
    sleeveCondition: "Estado de la funda",
    generic: "Funda genérica",
    no_cover: "Sin funda",
    stock: "Disponibles",
    note: "Notas sobre el estado",
    description: "Descripción",
    unavailable: "No se pudo cargar el disco.",
  },
  pl: {
    tracks: "Lista utworów",
    listen: "Posłuchaj",
    copies: "Wydania",
    edition: "Wydanie",
    label: "Wytwórnia",
    number: "Numer katalogowy",
    year: "Rok",
    country: "Kraj",
    format: "Format",
    speed: "Prędkość",
    pressing: "Tłoczenie",
    original: "Oryginał",
    reissue: "Wznowienie",
    mediaCondition: "Stan płyty",
    sleeveCondition: "Stan okładki",
    generic: "Okładka zastępcza",
    no_cover: "Bez okładki",
    stock: "Na stanie",
    note: "Uwagi o stanie",
    description: "Opis",
    unavailable: "Nie udało się pobrać płyty.",
  },
};

export default async function VariantPage({ params }: PageProps<"/[lang]/products/[id]/variants/[variantId]">) {
  const { lang, id, variantId } = await params;
  if (!/^\d+$/.test(variantId) || !isLocale(lang) || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const t = labels[lang],
    shop = messages[lang];
  let product;
  try {
    product = await getProduct(Number(id));
  } catch {
    return (
      <main className="catalog detail">
        <p role="alert">{t.unavailable}</p>
        <a href={`/${lang}/products/${id}/variants/${variantId}`}>{shop.retry}</a> ·{" "}
        <Link href={`/${lang}`}>{shop.back}</Link>
      </main>
    );
  }
  if (!product || product.type !== "vinyl") notFound();
  const a = product.attributes;
  const v = product.variants.find((item) => item.id === Number(variantId));
  if (!v || v.quantity <= 0) notFound();
  const x = v.attributes;
  const note = x.conditionNote?.[lang] || x.conditionNote?.en || x.conditionNote?.pl || x.conditionNote?.es;
  const fields = [
    [t.format, x.format],
    [t.speed, x.speed && x.speed + " RPM"],
    [t.year, x.year],
    [t.label, x.label],
    [t.number, x.catalogNumber],
    [t.country, x.country],
    [t.pressing, x.pressing && t[x.pressing]],
    [t.mediaCondition, x.mediaCondition],
    [
      t.sleeveCondition,
      x.sleeveCondition === "generic" || x.sleeveCondition === "no_cover" ? t[x.sleeveCondition] : x.sleeveCondition,
    ],
    [t.stock, v.quantity],
    [t.note, note],
  ];

  const cover =
    v.media.find((m) => m.type === "photo" && m.isPrimary)?.url ||
    v.media.find((m) => m.type === "photo")?.url ||
    product.primaryPhotoUrl;
  return (
    <>
      <header>
        <Link className="brand-link" href={`/${lang}`}>
          <Image src="/logo.png" width={42} height={42} alt="" />
          RASBASS
        </Link>
        <nav aria-label={shop.language}>
          {locales.map((l) => (
            <Link
              key={l}
              href={`/${l}/products/${id}/variants/${variantId}`}
              lang={l}
              aria-current={l === lang ? "page" : undefined}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>
      <main className="catalog detail">
        <Link href={`/${lang}#katalog`}>← {shop.catalog}</Link>
        <div className="variant-overview">
          <div className="record-column">
            <div className="detail-intro">
              {cover && <Image src={mediaUrl(cover)} alt={product.title} unoptimized width={400} height={400} />}
              <div className="variant-summary">
                <div>
                  <p className="variant-artist">{a.artists?.join(", ")}</p>
                  <h1>{product.title}</h1>
                  <p>{[x.label, x.catalogNumber, x.year, x.format].filter(Boolean).join(" · ")}</p>
                  <strong>{formatPrice(lang, v)}</strong>
                </div>
                <VariantCartButton
                  lang={lang}
                  item={{
                    title: product.title,
                    artist: a.artists?.join(", ") ?? "",
                    detail: [x.label, x.catalogNumber, x.year, x.mediaCondition].filter(Boolean).join(" · "),
                    priceEur: v.priceEur,
                    pricePln: v.pricePln,
                  }}
                />
              </div>
            </div>
            {a.tracklist?.length ? (
              <section className="tracklist-section">
                <h2>{t.tracks}</h2>
                <ol className="tracks">
                  {a.tracklist.map((track, i) => (
                    <li key={i}>
                      <span>{track.position || i + 1}</span>
                      <div>
                        {track.title}
                        {track.artists?.length ? <small> · {track.artists.join(", ")}</small> : null}
                      </div>
                      <span>{track.duration}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {product.description && (
              <section className="description-section">
                <h2>{t.description}</h2>
                <p className="description">{product.description}</p>
              </section>
            )}
          </div>
          <div className="edition-column">
            <section className="variant-specs">
              <h2>{t.edition}</h2>
              <dl>
                {fields.map(
                  ([key, value]) =>
                    value != null &&
                    value !== "" && (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ),
                )}
              </dl>
            </section>
            <ListeningRoom links={a.previewLinks ?? []} title={product.title} label={t.listen} />
          </div>
        </div>
        {v.media
          .filter((m) => m.type !== "photo")
          .map((m) => (
            <div className="detail-media" key={m.id}>
              {m.type === "audio" ? (
                <audio src={mediaUrl(m.url)} controls preload="none" />
              ) : (
                <video src={mediaUrl(m.url)} controls preload="none" />
              )}
            </div>
          ))}
      </main>
      <ShopFooter>
        <DiscogsCredit release={x.discogsReleaseId} master={a.discogsMasterId} />
      </ShopFooter>
    </>
  );
}
