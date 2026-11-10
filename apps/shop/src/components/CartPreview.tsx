"use client";
import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from "react";
import {useQueryClient} from "@tanstack/react-query";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {ShippingDetails, shippingCopy, emptyShipping, type Shipping} from "./ShippingDetails";
import {IconLogout, IconShoppingCart, IconUser, IconX} from "@tabler/icons-react";
import {formatPrice, type Price} from "@/lib/price";
import {messages, type Locale} from "@/app/messages";

type Item = Price & { id: number; quantity: number; title: string; artist: string; detail: string };
type Line = Item & { count: number };
const cartKey = "rasbass.cart.v1";

function readLines(fallback: Line[]): Line[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(cartKey) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.flatMap(line => {
      if (!line || typeof line !== "object") return [];
      const id = Number(line.id);
      const quantity = Number(line.quantity);
      const priceEur = Number(line.priceEur);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) ||
        !Number.isSafeInteger(line.count) || line.count <= 0 || line.count > quantity ||
        !Number.isSafeInteger(priceEur) || typeof line.title !== "string") return [];
      return [{...line, id, quantity, priceEur, artist: line.artist ?? "", detail: line.detail ?? ""}];
    });
  } catch {
    return fallback;
  }
}

const CountContext = createContext(0);
const CartContext = createContext<(item?: Item) => void>(() => {
});
const LoginContext = createContext<(provider?: Shipping["provider"]) => void>(() => {
});
const SessionContext = createContext<{ email: string | null; signOut: () => void }>({
  email: null, signOut: () => {
  }
});
const accountCopy = {
  pl: {signIn: "Zaloguj się", signOut: "Wyloguj się"},
  en: {signIn: "Sign in", signOut: "Sign out"},
  es: {signIn: "Iniciar sesión", signOut: "Cerrar sesión"},
};
export const useCheckoutReturn = () => useContext(LoginContext);
export const useCart = () => useContext(CartContext);

export function HeaderCart({lang}: { lang: Locale }) {
  const count = useContext(CountContext);
  const open = useCart();
  const session = useContext(SessionContext);
  const a = accountCopy[lang];
  return <>
    {session.email
      ? <button className="header-account" onClick={session.signOut} title={session.email}
                aria-label={a.signOut + " (" + session.email + ")"}><IconLogout size={20} aria-hidden/></button>
      : <Link className="header-account" href={`/${lang}/login`} aria-label={a.signIn} title={a.signIn}>
        <IconUser size={20} aria-hidden/></Link>}
    <button onClick={() => open()} aria-label={messages[lang].cart + (count > 0 ? ` (${count})` : "")}>
      <IconShoppingCart size={20} aria-hidden/>
      <span className="cart-label">{messages[lang].cart}</span>{count > 0 && <span>({count})</span>}
    </button>
  </>;
}

const rates = [
  {name: "InPost", pricePln: 1600, priceEur: 400},
  {name: "DHL", pricePln: 2000, priceEur: 500},
  {name: "Poczta Polska", pricePln: 1800, priceEur: 450},
] as const;
const copy = {
  pl: {
    conflict: "Dostępność lub cena płyt uległa zmianie. Sprawdź katalog i popraw koszyk.",
    error: "Nie udało się potwierdzić zamówienia. Spróbuj ponownie.",
    added: "Dodano do koszyka",
    limit: "W koszyku są już wszystkie dostępne sztuki",
    keep: "Kupuję dalej",
    go: "Przejdź do koszyka",
    delivery: "Dostawa",
    review: "Podsumowanie",
    goods: "Płyty",
    confirm: "Złóż zamówienie",
    thanks: "Dziękujemy!",
    done: "Zamówienie zostało przyjęte.",
    demo: "Zamówienie bez płatności online",
    remove: "Usuń",
    edit: "Wróć do koszyka",
    count: "Liczba sztuk"
  },
  en: {
    conflict: "Availability or prices changed. Check the catalogue and update your cart.",
    error: "Could not confirm the order. Please try again.",
    added: "Added to cart",
    limit: "All available copies are already in your cart",
    keep: "Continue shopping",
    go: "Go to cart",
    delivery: "Delivery",
    review: "Order summary",
    goods: "Records",
    confirm: "Place order",
    thanks: "Thank you!",
    done: "Your order has been received.",
    demo: "Order without online payment",
    remove: "Remove",
    edit: "Back to cart",
    count: "Quantity"
  },
  es: {
    conflict: "El precio o la disponibilidad ha cambiado. Revisa el catálogo y el carrito.",
    error: "No se pudo confirmar el pedido. Inténtalo de nuevo.",
    added: "Añadido al carrito",
    limit: "Ya tienes todas las unidades disponibles",
    keep: "Seguir comprando",
    go: "Ir al carrito",
    delivery: "Envío",
    review: "Resumen del pedido",
    goods: "Discos",
    confirm: "Realizar pedido",
    thanks: "¡Gracias!",
    done: "Hemos recibido tu pedido.",
    demo: "Pedido sin pago en línea",
    remove: "Eliminar",
    edit: "Volver al carrito",
    count: "Cantidad"
  },
};

export function CartProvider({lang, children}: { lang: Locale; children: ReactNode }) {
  const popup = useRef<HTMLDialogElement>(null);
  const [atLimit, setAtLimit] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const origin = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const memoryCart = useRef<Line[]>([]);
  const storageWritable = useRef(true);
  useEffect(() => {
    function restore() {
      if (!storageWritable.current) return;
      memoryCart.current = readLines(memoryCart.current);
      setLines(memoryCart.current);
    }

    function sync(event: StorageEvent) {
      if (event.key === cartKey || event.key === null) restore();
    }

    restore();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function updateLines(change: (current: Line[]) => Line[]) {
    const current = storageWritable.current ? readLines(memoryCart.current) : memoryCart.current;
    const next = change(current);
    memoryCart.current = next;
    setLines(next);
    try {
      if (next.length) localStorage.setItem(cartKey, JSON.stringify(next));
      else localStorage.removeItem(cartKey);
      storageWritable.current = true;
    } catch {
      storageWritable.current = false;
    }
  }

  const [step, setStep] = useState<"cart" | "shipping" | "review" | "done">("cart");
  const [rate, setRate] = useState<(typeof rates)[number]>(rates[0]);
  const [shipping, setShipping] = useState(emptyShipping);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/account/session").then(r => r.json()).then(data => {
      if (!active) return;
      setSessionEmail(data.email ?? null);
      // The account address is the default contact address; the buyer can still change it.
      if (data.email) setShipping(previous => previous.email ? previous : {...previous, email: data.email});
    }).catch(() => {
      if (active) setSessionEmail(null);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  async function signOut() {
    const response = await fetch("/api/account/logout", {method: "POST"});
    if (response.ok) setSessionEmail(null);
  }

  const delivery = shippingCopy[lang];
  const t = messages[lang];
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [receipt, setReceipt] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const [failure, setFailure] = useState<"error" | "conflict" | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  async function submitOrder() {
    if (busy.current || !lines.length) return;
    busy.current = true;
    setSending(true);
    setFailure(null);
    try {
      const {name, email, phone, street, city, postal, country} = shipping;
      const body = {
        locale: lang,
        items: lines.map(line => ({productVariantId: line.id, quantity: line.count, priceEur: line.priceEur})),
        shipping: {name, email, phone, street, city, postal, country}, carrier: rate.name,
      };
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
      const fingerprint = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
      if (attempt.current?.fingerprint !== fingerprint) {
        let key = crypto.randomUUID();
        try {
          const stored = JSON.parse(localStorage.getItem("rasbass.checkout") ?? "null");
          if (stored?.fingerprint === fingerprint) key = stored.key;
          localStorage.setItem("rasbass.checkout", JSON.stringify({fingerprint, key}));
        } catch { /* The in-memory key still protects retries in this checkout. */
        }
        attempt.current = {fingerprint, key};
      }
      const response = await fetch("/api/checkout", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...body, key: attempt.current.key}),
      });
      if (!response.ok) {
        setFailure([404, 409].includes(response.status) ? "conflict" : "error");
        return;
      }
      const {id} = await response.json();
      if (!Number.isSafeInteger(id)) throw new Error("Invalid receipt");
      setReceipt(id);
      updateLines(current => current.flatMap(line => {
        const bought = lines.find(item => item.id === line.id)?.count ?? 0;
        return line.count > bought ? [{...line, count: line.count - bought}] : [];
      }));
      attempt.current = null;
      try {
        localStorage.removeItem("rasbass.checkout");
      } catch { /* Storage unavailable. */
      }
      setRate(rates[0]);
      navigate("done");
      void queryClient.invalidateQueries({queryKey: ["shop-catalog"]});
      router.refresh();
    } catch {
      setFailure("error");
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  function open(item?: Item) {
    if (!lines.length) setShipping({...emptyShipping, email: sessionEmail ?? ""});
    if (!item) {
      popup.current?.close();
      origin.current = window.location.pathname + window.location.search + window.location.hash;
      setStep("cart");
      router.push(`/${lang}/cart`);
      return;
    }
    const line = {...item, id: Number(item.id), quantity: Number(item.quantity), priceEur: Number(item.priceEur)};
    updateLines(previous => {
      const existing = previous.find(entry => entry.id === line.id);
      setAtLimit((existing?.count ?? 0) >= line.quantity);
      if (line.quantity <= 0) return previous;
      if (!existing) return [...previous, {...line, count: 1}];
      return previous.map(entry => entry.id === line.id
        ? {...line, count: Math.min(line.quantity, entry.count + 1)} : entry);
    });
    popup.current?.showModal();
  }

  function leaveCart() {
    setStep("cart");
    router.push(origin.current ?? `/${lang}`);
  }

  function navigate(next: typeof step) {
    setFailure(null);
    setStep(next);
    heading.current?.focus();
  }

  const subtotal = lines.reduce<Price>((sum, line) => ({
    priceEur: sum.priceEur + line.priceEur * line.count,
    pricePln: sum.pricePln == null || line.pricePln == null ? null : sum.pricePln + line.pricePln * line.count,
  }), {priceEur: 0, pricePln: 0});
  const total = {
    priceEur: subtotal.priceEur + rate.priceEur,
    pricePln: subtotal.pricePln == null ? null : subtotal.pricePln + rate.pricePln
  };

  return (
    <SessionContext.Provider value={{email: sessionEmail, signOut}}><CartContext.Provider value={open}><CountContext.Provider value={lines.reduce((n, line) => n + line.count, 0)}>
      <LoginContext.Provider value={provider => {
        router.replace(lines.length ? `/${lang}/cart` : `/${lang}`);
        if (lines.length) {
          if (provider) setShipping(previous => ({...previous, account: "member", provider}));
          setStep(provider ? "shipping" : "cart");

        }
      }}>{children}</LoginContext.Provider>
      <dialog ref={popup} className="cart-added" aria-labelledby="added-title">
        <h2 id="added-title">{atLimit ? c.limit : c.added}</h2>
        <button className="close" onClick={() => open()}>{c.go}</button>
        <button className="secondary-action" onClick={() => popup.current?.close()}>{c.keep}</button>
      </dialog>
      {pathname === `/${lang}/cart` && <main className="checkout cart-page" aria-labelledby="cart-title">
          <div className="sectionhead">
              <h2 id="cart-title" tabIndex={-1}
                  ref={heading}>{step === "done" ? c.thanks : step === "review" ? c.review : step === "shipping" ? delivery.title : t.cart}</h2>
              <button aria-label={t.close} onClick={leaveCart}><IconX aria-hidden/></button>
          </div>
        {step === "done" || !lines.length ? <>
          <p>{step === "done" ? c.done + " #" + receipt : t.emptyCart}</p>
          <button className="close" onClick={leaveCart}>{t.back}</button>
          {step === "done" && !sessionEmail &&
              <Link className="secondary-action" href={`/${lang}/register`}>{delivery.register}</Link>}
        </> : step === "shipping" ? <ShippingDetails lang={lang} data={shipping} change={setShipping}
                                                     next={() => navigate("review")} back={() => navigate("cart")}
                                                     nextLabel={c.review} backLabel={c.edit}/> : <>
          <ul className="checkout-lines">{lines.map(line => <li key={line.id}>
            <strong>{line.title}</strong>
            <small>{[line.artist, line.detail].filter(Boolean).join(" · ")}</small>
            <div className="checkout-row"><span>{line.count} × {formatPrice(lang, line)}</span>
              {step === "cart" && <button onClick={() => updateLines(current => current.filter(l => l.id !== line.id))}
                                          aria-label={c.remove + " " + line.title}>{c.remove}</button>}</div>
            {step === "cart" && <label>{c.count} <input type="number" min={1} max={line.quantity} value={line.count}
                                                        onChange={e => {
                                                          const count = e.currentTarget.valueAsNumber;
                                                          if (Number.isInteger(count) && count >= 1 && count <= line.quantity)
                                                            updateLines(current => current.map(l => l.id === line.id ? {
                                                              ...l,
                                                              count: Math.min(count, l.quantity)
                                                            } : l));
                                                        }}/></label>}
          </li>)}</ul>
          {step === "cart" && <fieldset>
              <legend>{c.delivery}</legend>
            {rates.map(option =>
              <label key={option.name}><input type="radio" name="carrier" checked={rate === option}
                                              onChange={() => setRate(option)}/>
                <span>{option.name}</span><strong>{formatPrice(lang, option)}</strong></label>)}</fieldset>}
          {step === "review" && <section className="shipping-review">
              <h3>{delivery.title}</h3>
              <p>{shipping.name}<br/>{shipping.street}<br/>{shipping.postal} {shipping.city}<br/>{shipping.country}</p>
              <p>{shipping.email}<br/>{shipping.phone}</p>
              <p>{!sessionEmail ? delivery.guest : sessionEmail}</p>
              <button onClick={() => navigate("shipping")}>{delivery.edit}</button>
          </section>}
          <div className="checkout-totals">
            <div><span>{c.goods}</span><span>{formatPrice(lang, subtotal)}</span></div>
            <div><span>{c.delivery} · {rate.name}</span><span>{formatPrice(lang, rate)}</span></div>
            <div><strong>{t.total}</strong><strong>{formatPrice(lang, total)}</strong></div>
          </div>
          <small>{c.demo}</small>

          {failure && step === "review" && <p role="alert">{c[failure]}</p>}

          <button className="close" disabled={sending} aria-busy={sending} onClick={() => {
            if (step === "cart") navigate("shipping");
            else void submitOrder();
          }}>{step === "cart" ? (!sessionEmail ? delivery.guest : delivery.title) : c.confirm}</button>
          {step === "cart" && sessionEmail &&
              <button className="secondary-action" onClick={signOut}>{accountCopy[lang].signOut}</button>}
          {step === "cart" && !sessionEmail &&
              <Link className="secondary-action" href={`/${lang}/login`}>{delivery.login}</Link>}
          {step === "review" && <button className="secondary-action" onClick={() => navigate("cart")}>{c.edit}
          </button>}
        </>}
      </main>}
    </CountContext.Provider></CartContext.Provider></SessionContext.Provider>);
}

export function VariantCartButton({lang, item}: { lang: Locale; item: Item }) {
  const open = useCart();
  return <button className="variant-cart-button" onClick={() => open(item)}>{messages[lang].add}</button>;
}
