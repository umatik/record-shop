"use client";
import { formatPrice } from "@/lib/price";
import { HeaderCart, useCart } from "@/components/CartPreview";
import ShopFooter from "@/components/ShopFooter";
import Image from "next/image";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import type { Release } from "@/services/catalog";

import { useCatalog } from "@/hooks/useCatalog";
import Link from "next/link";
import { locales, messages, type Locale } from "./messages";
const wideScreen = "(min-width: 48em)";
type CatalogView = "grid" | "list";

function saveViewCookie(mode: CatalogView) {
  document.cookie = `catalog-view=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function updateViewUrl(view: CatalogView) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  window.history.replaceState(null, "", url);
}

export default function Storefront({
  lang,
  savedView,
  releases,
  failed,
  page,
  total,
  copies,
  pages,
  sort,
}: {
  lang: Locale;
  savedView: CatalogView | null;
  releases: Release[];
  failed: boolean;
  page: number;
  copies: number;
  total: number;
  pages: number;
  sort: string;
}) {
  const { variants, marker, hasNextPage, isFetching, isFetchNextPageError, loadMore } = useCatalog(
    page,
    { releases, copies, total, totalPages: pages },
    !failed,
    sort,
  );
  const t = messages[lang];
  const requestedView = useSearchParams().get("view");
  const view = requestedView === "grid" || requestedView === "list" ? requestedView : savedView;
  useEffect(() => {
    if (requestedView !== "grid" && requestedView !== "list") {
      updateViewUrl(savedView ?? (window.matchMedia(wideScreen).matches ? "grid" : "list"));
    }
  }, [requestedView, savedView]);
  function selectView(mode: CatalogView) {
    saveViewCookie(mode);
    updateViewUrl(mode);
  }
  const viewParam = view ? `&view=${view}` : "";
  const openCart = useCart();
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
              href={`/${code}?sort=${sort}${viewParam}`}
              lang={code}
              hrefLang={code}
              aria-label={{ en: "English", es: "Español", pl: "Polski" }[code]}
              aria-current={code === lang ? "page" : undefined}
            >
              {code.toUpperCase()}
            </Link>
          ))}
        </nav>
        <HeaderCart lang={lang} />
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
              <div className="catalog-tools">
                <span>{t.inStock}: {copies}</span>
                <div className="catalog-switch">
                  {([["grid", IconLayoutGrid, t.gridView], ["list", IconList, t.listView]] as const).map(([mode, Icon, label]) => (
                    <button key={mode} type="button" aria-label={label} title={label} aria-pressed={view === mode}
                      onClick={() => selectView(mode)}><Icon size={19} aria-hidden /></button>
                  ))}
                </div>
              </div>
            )}
            <span role="status" className="sr-only">
              {t.shown}: {variants.length}
            </span>
          </div>
          <nav className="catalog-sort" aria-label={t.sort}>
            {(["artist", "title", "price"] as const).map(field => {
              const ascending = sort === field + "_asc";
              const active = ascending || sort === field + "_desc";
              const next = field + (ascending ? "_desc" : "_asc");
              return <Link key={field} href={`/${lang}?sort=${next}${viewParam}`} scroll={false} prefetch={false}
                aria-label={`${t.sort}: ${t.fields[field]}, ${ascending ? t.desc : t.asc}`}>
                {t.fields[field]}{active && <span aria-hidden>{ascending ? " ↑" : " ↓"}</span>}
              </Link>;
            })}
          </nav>
          {failed ? (
            <p role="alert">
              {t.error} <a href={`/${lang}?page=${page}&sort=${sort}${viewParam}`}>{t.retry}</a>
            </p>
          ) : (
            !total && <p>{t.empty}</p>
          )}
          <div className="grid" data-view={view}>
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
                  <span>{r.artist}</span>
                </div>
                <span>
                  <small className="variant-edition">{[r.format, r.detail].filter(Boolean).join(" · ")}</small>
                  {r.condition && <small className="variant-condition">{t.condition}: {r.condition}</small>}
                  <small className="variant-quantity">{t.availableCount(r.quantity)}</small>
                </span>
                <div className="price">
                  <strong>{formatPrice(lang, r)}</strong>
                  <button onClick={() => openCart(r)}>{t.add}</button>
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
    </>
  );
}
