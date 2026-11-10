import type { Locale } from "@/app/messages";

export const shippingCopy = {
  pl: { member: "Zaloguj się lub zarejestruj", login: "Zaloguj się", register: "Zarejestruj się", continueWith: "Kontynuuj z", title: "Dane do wysyłki", name: "Imię i nazwisko", email: "E-mail", phone: "Telefon", street: "Ulica i numer domu lub mieszkania", postal: "Kod pocztowy", city: "Miejscowość", country: "Kraj", account: "Konto w sklepie", guest: "Kupuję jako gość", edit: "Edytuj dane do wysyłki" },
  en: { member: "Sign in or register", login: "Sign in", register: "Register", continueWith: "Continue with", title: "Shipping details", name: "Full name", email: "Email", phone: "Phone", street: "Street address and apartment", postal: "Postal code", city: "City", country: "Country", account: "Shop account", guest: "Continue as a guest", edit: "Edit shipping details" },
  es: { member: "Iniciar sesión o registrarse", login: "Iniciar sesión", register: "Registrarse", continueWith: "Continuar con", title: "Datos de envío", name: "Nombre y apellidos", email: "Correo electrónico", phone: "Teléfono", street: "Calle, número y piso", postal: "Código postal", city: "Localidad", country: "País", account: "Cuenta de la tienda", guest: "Comprar como invitado", edit: "Editar los datos de envío" },
};
const fields = [
  ["name", "text", "name"], ["email", "email", "email"], ["phone", "tel", "tel"],
  ["street", "text", "street-address"], ["postal", "text", "postal-code"],
  ["city", "text", "address-level2"], ["country", "text", "country-name"],
] as const;
export type Shipping = Record<typeof fields[number][0], string> & { account: "guest" | "member"; action: "login" | "register"; provider: "Apple ID" | "Google" | "E-mail" };
export const emptyShipping: Shipping = {
  name: "", email: "", phone: "", street: "", postal: "", city: "", country: "", account: "guest", action: "login", provider: "Apple ID",
};

export function ShippingDetails({ lang, data, change, next, back, nextLabel, backLabel }: {
  lang: Locale; data: Shipping; change: (data: Shipping) => void; next: () => void;
  back: () => void; nextLabel: string; backLabel: string;
}) {
  const t = shippingCopy[lang];
  return <form className="shipping-form" onSubmit={event => {
    event.preventDefault();
    next();
  }}>
    {fields.map(([key, type, autoComplete]) => <label key={key}>{t[key]}
      <input required name={key} type={type} autoComplete={autoComplete} value={data[key]}
        pattern={type === "email" ? undefined : ".*\\S.*"}
        onChange={event => change({ ...data, [key]: event.target.value })} />
    </label>)}
    <button type="submit" className="close">{nextLabel}</button>
    <button className="secondary-action" type="button" onClick={back}>{backLabel}</button>
  </form>;
}
