"use client";
import { formatPrice, type Price } from "@/lib/price";
import { useRef, type RefObject } from "react";
import { IconX } from "@tabler/icons-react";
import { messages, type Locale } from "@/app/messages";
type Item = Price & { title: string; artist: string; detail: string };
export function CartPreview({
  dialog,
  lang,
  selected,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  lang: Locale;
  selected: Item | null;
}) {
  const t = messages[lang];
  return (
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
            <strong>{formatPrice(lang, selected)}</strong>
          </div>
          <div className="sum">
            <strong>{t.total}</strong>
            <strong>{formatPrice(lang, selected)}</strong>
          </div>
        </>
      ) : (
        <p>{t.emptyCart}</p>
      )}
      <button className="close" onClick={() => dialog.current?.close()}>
        {t.back}
      </button>
    </dialog>
  );
}
export function VariantCartButton({ lang, item }: { lang: Locale; item: Item }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="variant-cart-button" onClick={() => dialog.current?.showModal()}>
        {messages[lang].add}
      </button>
      <CartPreview dialog={dialog} lang={lang} selected={item} />
    </>
  );
}
