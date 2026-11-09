"use client";
import { formatPrice } from "@/lib/price";
import { CartPreview } from "@/components/CartPreview";
import ShopFooter from "@/components/ShopFooter";
import Image from "next/image";
import { IconShoppingCart } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { Release } from "@/services/catalog";

import { useCatalog } from "@/hooks/useCatalog";
import Link from "next/link";
import { locales, messages, type Locale } from "./messages";
export default function Storefront({
  lang,
  releases,
  failed,
  page,
  total,
  copies,
  pages,
}: {
  lang: Locale;
  releases: Release[];
  failed: boolean;
  page: number;
  copies: number;
  total: number;
  pages: number;
}) {
  const { variants, marker, hasNextPage, isFetching, isFetchNextPageError, loadMore } = useCatalog(
    page,
    { releases, copies, total, totalPages: pages },
    !failed,
  );
  const t = messages[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Release | null>(null);
  function preview(release: Release | null) {
    setSelected(release);
    dialog.current?.showModal();
  }
  return (
    <>
      <header>
        <Link className="brand-link" href={`/${lang}`}>
          <Image src="/logo.png" width={42} height={42} alt="" />
          RASBASS
        </Link>
        <nav aria-label={t.language}>
          {locales.map((code) => (
            <Link
              key={code}
              href={"/" + code}
              lang={code}
              hrefLang={code}
              aria-label={{ en: "English", es: "Español", pl: "Polski" }[code]}
              aria-current={code === lang ? "page" : undefined}
            >
              {code.toUpperCase()}
            </Link>
          ))}
        </nav>
        <button onClick={() => preview(null)}>
          <IconShoppingCart size={20} aria-hidden />
          {t.cart}
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="disc" />
          <h1>
            {t.hero[0]}
            <br />
            {t.hero[1]}
          </h1>
          <a href="#katalog">{t.browse} ↓</a>
        </section>
        <section className="catalog" id="katalog">
          <div className="sectionhead">
            <h2>{t.catalog}</h2>
            {!failed && (
              <span>
                {t.inStock}: {copies}
              </span>
            )}
            <span role="status" className="sr-only">
              {t.shown}: {variants.length}
            </span>
          </div>
          {failed ? (
            <p role="alert">
              {t.error} <a href={`/${lang}?page=${page}`}>{t.retry}</a>
            </p>
          ) : (
            !total && <p>{t.empty}</p>
          )}
          <div className="grid">
            {variants.map((r) => (
              <article key={r.id}>
                <div className="sleeve" aria-hidden>
                  {r.photo ? (
                    <Image src={r.photo} alt="" fill unoptimized style={{ objectFit: "cover" }} />
                  ) : (
                    <div className="disc" />
                  )}
                </div>
                <div className="line">
                  <h3>
                    <Link
                      className="product-link"
                      prefetch={false}
                      aria-label={[r.title, r.artist, r.detail, formatPrice(lang, r)].filter(Boolean).join(", ")}
                      href={`/${lang}/products/${r.productId}/variants/${r.id}`}
                    >
                      {r.title}
                    </Link>
                  </h3>
                  <small>{[r.format, r.detail].filter(Boolean).join(" · ")}</small>
                </div>
                <span>
                  {r.artist}
                  <small className="variant-quantity">{t.availableCount(r.quantity)}</small>
                </span>
                <div className="price">
                  <strong>{formatPrice(lang, r)}</strong>
                  <button onClick={() => preview(r)}>{t.add}</button>
                </div>
              </article>
            ))}
          </div>
          <div ref={marker} aria-hidden />
          {isFetchNextPageError && <p role="alert">{t.error}</p>}
          {hasNextPage && (
            <button
              className="load-more"
              aria-disabled={isFetching}
              onClick={() => {
                if (!isFetching) void loadMore();
              }}
            >
              {isFetching ? t.loading : isFetchNextPageError ? t.retry : t.more}
            </button>
          )}
        </section>
      </main>
      <ShopFooter>
        <small className="discogs-credit" lang="en">
          Data provided by <a href="https://www.discogs.com/">Discogs</a>.
        </small>
      </ShopFooter>
      <CartPreview dialog={dialog} lang={lang} selected={selected} />
    </>
  );
}
