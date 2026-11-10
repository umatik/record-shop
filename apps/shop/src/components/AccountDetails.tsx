"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconTrash, IconX } from "@tabler/icons-react";
import { Select, TextInput } from "@mantine/core";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Locale } from "@/app/messages";
import { accountMenuCopy, accountPageCopy, closeLabel, nameLabels, validation } from "./auth-copy";
import { countryOptions } from "./countries";
import { shippingCopy } from "./ShippingDetails";
import { useGoBack } from "./useGoBack";

type Saved = { email: string; firstName: string; lastName: string; phone: string; address: string; city: string; postalCode: string; country: string };
type Order = {
  id: number; status: string; createdAt: string; carrier: string | null; deliveryEur: number;
  items: { title: string; edition: string | null; quantity: number; priceEur: number }[];
};
type FormValues = Omit<Saved, "email" | "address" | "postalCode"> & { street: string; postal: string };

export function AccountDetails({ lang }: { lang: Locale }) {
  const router = useRouter();
  const goBack = useGoBack(`/${lang}`);
  const c = accountMenuCopy[lang];
  const p = accountPageCopy[lang];
  const t = shippingCopy[lang];
  const names = nameLabels[lang];
  const v = validation[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }), [lang]);
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState<"loading" | "ready" | "signedOut">("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const schema = useMemo(() => z.object({
    firstName: z.string().trim().min(1, v.required).max(100),
    lastName: z.string().trim().min(1, v.required).max(100),
    phone: z.string().trim().min(1, v.required).max(50),
    street: z.string().trim().min(1, v.required).max(255),
    postal: z.string().trim().min(1, v.required).max(20),
    city: z.string().trim().min(1, v.required).max(100),
    country: z.string().min(1, v.required),
  }), [v]);

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", phone: "", street: "", postal: "", city: "", country: "" },
  });

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/account/shipping"), fetch("/api/account/orders")]).then(async ([shippingRes, ordersRes]) => {
      if (!active) return;
      if (shippingRes.status === 401) {
        setLoaded("signedOut");
        router.replace(`/${lang}/login`);
        return;
      }
      const saved = (await shippingRes.json()) as Saved;
      setEmail(saved.email);
      reset({
        firstName: saved.firstName, lastName: saved.lastName, phone: saved.phone, street: saved.address,
        postal: saved.postalCode, city: saved.city, country: saved.country,
      });
      setOrders(ordersRes.ok ? ((await ordersRes.json()) as Order[]) : []);
      setLoaded("ready");
    }).catch(() => { if (active) setLoaded("ready"); });
    return () => { active = false; };
  }, [lang, reset, router]);

  async function onSave(values: FormValues) {
    setMessage("");
    const result = await fetch("/api/account/shipping", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: values.firstName, lastName: values.lastName, phone: values.phone, street: values.street,
        postal: values.postal, city: values.city, country: values.country,
      }),
    }).catch(() => null);
    setMessage(result?.ok ? p.saved : p.saveFailed);
  }

  async function onDelete() {
    setDeleting(true);
    const result = await fetch("/api/account/me", { method: "DELETE" }).catch(() => null);
    if (result?.ok) {
      router.replace(`/${lang}`);
      router.refresh();
      return;
    }
    setDeleting(false);
    setMessage(p.deleteFailed);
  }

  if (loaded === "loading") return <section className="register-card"><p>…</p></section>;
  if (loaded === "signedOut") return null;

  return (
    <section className="register-card" aria-labelledby="account-title">
      <button className="auth-close" type="button" aria-label={closeLabel[lang]} onClick={goBack}>
        <IconX size={20} aria-hidden />
      </button>
      <Link href={`/${lang}`} className="login-logo">
        <Image src="/logo.png" width={96} height={96} alt="RasBass Record Shop" />
      </Link>
      <h1 id="account-title">{c.title}</h1>

      <form noValidate onSubmit={handleSubmit(onSave)} className="account-form">
        <div className="register-grid">
          <TextInput label={names.last} autoComplete="family-name" withAsterisk={false} error={errors.lastName?.message} {...register("lastName")} />
          <TextInput label={names.first} autoComplete="given-name" withAsterisk={false} error={errors.firstName?.message} {...register("firstName")} />
          <TextInput label={t.email} value={email} readOnly disabled withAsterisk={false} />
          <TextInput label={t.phone} type="tel" autoComplete="tel" withAsterisk={false} error={errors.phone?.message} {...register("phone")} />
          <div className="register-wide">
            <TextInput label={t.street} autoComplete="street-address" withAsterisk={false} error={errors.street?.message} {...register("street")} />
          </div>
          <div className="register-wide register-pair">
            <TextInput label={t.postal} autoComplete="postal-code" withAsterisk={false} error={errors.postal?.message} {...register("postal")} />
            <TextInput label={t.city} autoComplete="address-level2" withAsterisk={false} error={errors.city?.message} {...register("city")} />
          </div>
          <div className="register-wide">
            <Controller name="country" control={control} render={({ field }) => (
              <Select label={t.country} data={countryOptions(lang)} value={field.value || null}
                      onChange={(value) => field.onChange(value ?? "")} onBlur={field.onBlur}
                      error={errors.country?.message} searchable allowDeselect={false} withAsterisk={false}
                      comboboxProps={{ withinPortal: true }} />
            )} />
          </div>
        </div>
        <button className="login-submit" disabled={isSubmitting} type="submit">{p.saveData}</button>
      </form>
      {message && <p role="status">{message}</p>}

      <hr className="shipping-hairline" />
      <h2 className="account-subtitle">{p.orders}</h2>
      {orders.length === 0 && <p>{p.noOrders}</p>}
      <ul className="account-orders">
        {orders.map((o) => {
          const goods = o.items.reduce((sum, i) => sum + i.priceEur * i.quantity, 0);
          return (
            <li key={o.id}>
              <div className="account-order-head">
                <strong>{p.order} #{o.id}</strong>
                <span>{new Date(o.createdAt).toLocaleDateString(lang)}</span>
                <span>{p.statuses[o.status] ?? o.status}</span>
              </div>
              {o.items.map((i, index) => (
                <div key={index} className="account-order-line">
                  <span>{i.title}{i.edition ? ` · ${i.edition}` : ""} × {i.quantity}</span>
                  <span>{money.format((i.priceEur * i.quantity) / 100)}</span>
                </div>
              ))}
              <div className="account-order-line">
                <span>{p.delivery}{o.carrier ? ` · ${o.carrier}` : ""}</span>
                <span>{money.format(o.deliveryEur / 100)}</span>
              </div>
              <div className="account-order-line account-order-total">
                <strong>{p.total}</strong>
                <strong>{money.format((goods + o.deliveryEur) / 100)}</strong>
              </div>
            </li>
          );
        })}
      </ul>

      <hr className="shipping-hairline" />
      <h2 className="account-subtitle">{p.deleteTitle}</h2>
      <p className="account-delete-text">{p.deleteText}</p>
      {!confirmDelete ? (
        <button className="account-danger-btn" type="button" onClick={() => setConfirmDelete(true)}><IconTrash size={18} aria-hidden />{p.deleteAction}</button>
      ) : (
        <button className="account-danger-btn" type="button" disabled={deleting} onClick={onDelete}><IconTrash size={18} aria-hidden />{p.deleteConfirm}</button>
      )}

      <Link className="account-back" href={`/${lang}`}>{c.back}</Link>
    </section>
  );
}
