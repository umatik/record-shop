import { useEffect, useMemo } from "react";
import { Select, TextInput } from "@mantine/core";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Locale } from "@/app/messages";
import { nameLabels, validation } from "./auth-copy";
import { countryOptions } from "./countries";

export const shippingCopy = {
  pl: { member: "Zaloguj się lub zarejestruj", login: "Zaloguj się", register: "Zarejestruj się", continueWith: "Kontynuuj z", title: "Dane do wysyłki", name: "Imię i nazwisko", email: "E-mail", phone: "Telefon", street: "Ulica i numer domu lub mieszkania", postal: "Kod pocztowy", city: "Miejscowość", country: "Kraj", account: "Konto w sklepie", guest: "Dalej", edit: "Edytuj dane do wysyłki", backToShipping: "Wróć do danych wysyłkowych", registerQuestion: "Chcesz założyć konto, żeby śledzić zamówienia?", backToShop: "Wróć do sklepu" },
  en: { member: "Sign in or register", login: "Sign in", register: "Register", continueWith: "Continue with", title: "Shipping details", name: "Full name", email: "Email", phone: "Phone", street: "Street address and apartment", postal: "Postal code", city: "City", country: "Country", account: "Shop account", guest: "Continue", edit: "Edit shipping details", backToShipping: "Back to shipping details", registerQuestion: "Would you like to create an account to track your orders?", backToShop: "Back to shop" },
  es: { member: "Iniciar sesión o registrarse", login: "Iniciar sesión", register: "Registrarse", continueWith: "Continuar con", title: "Datos de envío", name: "Nombre y apellidos", email: "Correo electrónico", phone: "Teléfono", street: "Calle, número y piso", postal: "Código postal", city: "Localidad", country: "País", account: "Cuenta de la tienda", guest: "Continuar", edit: "Editar los datos de envío", backToShipping: "Volver a los datos de envío", registerQuestion: "¿Quieres crear una cuenta para seguir tus pedidos?", backToShop: "Volver a la tienda" },
};
export type Shipping = Record<"name" | "email" | "phone" | "street" | "postal" | "city" | "country", string> & { account: "guest" | "member"; action: "login" | "register"; provider: "Apple ID" | "Google" | "E-mail" };
export const emptyShipping: Shipping = {
  name: "", email: "", phone: "", street: "", postal: "", city: "", country: "", account: "guest", action: "login", provider: "Apple ID",
};

const prefillKey = "rasbass-register-prefill";

/** Keeps the order's contact details so the register form opened after checkout can start filled in. */
export function savePrefill(shipping: Shipping) {
  try {
    const [firstName = "", ...rest] = shipping.name.split(/\s+/);
    sessionStorage.setItem(prefillKey, JSON.stringify({
      firstName, lastName: rest.join(" "), email: shipping.email, phone: shipping.phone,
      street: shipping.street, postal: shipping.postal, city: shipping.city, country: shipping.country,
    }));
  } catch {
    // storage unavailable: the form simply opens empty
  }
}

export function peekPrefill(): Partial<Record<string, string>> {
  try {
    const raw = typeof window === "undefined" ? null : sessionStorage.getItem(prefillKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readPrefill(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(prefillKey);
    sessionStorage.removeItem(prefillKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ShippingDetails({ lang, data, change, next, back, nextLabel, backLabel }: {
  lang: Locale; data: Shipping; change: (data: Shipping) => void; next: () => void;
  back: () => void; nextLabel: string; backLabel: string;
}) {
  const t = shippingCopy[lang];
  const v = validation[lang];
  const names = nameLabels[lang];
  const [firstName = "", ...rest] = data.name.split(/\s+/);
  const schema = useMemo(() => z.object({
    firstName: z.string().trim().min(1, v.required).max(100),
    lastName: z.string().trim().min(1, v.required).max(100),
    email: z.email(v.email),
    phone: z.string().trim().min(1, v.required).max(50),
    street: z.string().trim().min(1, v.required).max(255),
    postal: z.string().trim().min(1, v.required).max(20),
    city: z.string().trim().min(1, v.required).max(100),
    country: z.string().min(1, v.required),
  }), [v]);
  const { register, control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName, lastName: rest.join(" "), email: data.email, phone: data.phone, street: data.street,
      postal: data.postal, city: data.city, country: data.country,
    },
  });
  useEffect(() => {
    // Signed-in customers get their saved details; anything already typed stays as it is.
    let active = true;
    fetch("/api/account/shipping")
      .then((r) => (r.ok ? r.json() : null))
      .then((saved: Record<string, string> | null) => {
        if (!active || !saved) return;
        const fields = ["firstName", "lastName", "email", "phone", "street", "postal", "city", "country"] as const;
        const values: Record<string, string> = {
          firstName: saved.firstName ?? "", lastName: saved.lastName ?? "", email: saved.email ?? "",
          phone: saved.phone ?? "", street: saved.address ?? "", postal: saved.postalCode ?? "",
          city: saved.city ?? "", country: saved.country ?? "",
        };
        for (const key of fields) {
          if (!getValues(key) && values[key]) setValue(key, values[key]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [getValues, setValue]);
  return <form className="shipping-form" noValidate onSubmit={handleSubmit(values => {
    change({
      ...data,
      name: `${values.firstName.trim()} ${values.lastName.trim()}`,
      email: values.email, phone: values.phone, street: values.street,
      postal: values.postal, city: values.city, country: values.country,
    });
    next();
  })}>
    <div className="register-grid">
      <TextInput label={names.first} autoComplete="given-name" withAsterisk={false} error={errors.firstName?.message} {...register("firstName")} />
      <TextInput label={names.last} autoComplete="family-name" withAsterisk={false} error={errors.lastName?.message} {...register("lastName")} />
      <TextInput label={t.email} type="email" autoComplete="email" withAsterisk={false} error={errors.email?.message} {...register("email")} />
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
    <hr className="shipping-hairline" />
    <button type="submit" className="close">{nextLabel}</button>
    <button className="secondary-action" type="button" onClick={back}>{backLabel}</button>
  </form>;
}
