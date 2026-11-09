"use client";
import DiscogsCredit from "@/components/DiscogsCredit";
import Image from "next/image";
import { IconArrowUpRight, IconX } from "@tabler/icons-react";
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
  const price = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", minimumFractionDigits: 0 });
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Release | null>(null);
  function preview(release: Release | null) {
    setSelected(release);
    dialog.current?.showModal();
  }
  return (
    <>
      <header>
        <strong>
          <Image src="/logo.png" width={42} height={42} alt="" />
          RASBASS
        </strong>
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
          {t.cart} <IconArrowUpRight size={16} aria-hidden />
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
                      aria-label={[r.title, r.artist, r.detail, price.format(r.price)].filter(Boolean).join(", ")}
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
                  <strong>{r.price !== null && price.format(r.price)}</strong>
                  <button onClick={() => preview(r)}>{t.add}</button>
                </div>
                <DiscogsCredit release={r.discogsReleaseId} master={r.discogsMasterId} />
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
      <footer>RasBass Record Shop</footer>
      <dialog ref={dialog} aria-labelledby="cart-title">
        <div className="sectionhead">
          <h2 id="cart-title">{t.cart}</h2>
          <button aria-label={t.close} onClick={() => dialog.current?.close()}>
            <IconX aria-hidden />
          </button>
        </div>
        <small>{t.preview}</small>
        {selected ? (
          <>
            <div className="item">
              <div className="disc mini" />
              <div>
                <strong>{selected.title}</strong>
                <p>{selected.artist}</p>
                <small>{selected.detail}</small>
                <br />
                <small>{t.quantity}</small>
              </div>
              <strong>{selected.price !== null && price.format(selected.price)}</strong>
            </div>
            <div className="sum">
              <strong>{t.total}</strong>
              <strong>{selected.price !== null && price.format(selected.price)}</strong>
            </div>
          </>
        ) : (
          <p>{t.emptyCart}</p>
        )}
        <button className="close" onClick={() => dialog.current?.close()}>
          {t.back}
        </button>
      </dialog>
    </>
  );
}
