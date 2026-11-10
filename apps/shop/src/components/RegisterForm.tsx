"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PasswordInput, Select, TextInput } from "@mantine/core";
import { IconAlertCircle, IconX } from "@tabler/icons-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Locale } from "@/app/messages";
import { useCheckoutReturn } from "./CartPreview";
import { peekPrefill, readPrefill, shippingCopy } from "./ShippingDetails";
import { useGoBack } from "./useGoBack";
import { countryOptions } from "./countries";
import { registeredCopy, closeLabel, confirmPasswordCopy, examplePlaceholders, labels, nameLabels, notices, passwordToggleLabel, validation } from "./auth-copy";


type RegisterValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  postal: string;
  city: string;
  country: string;
  password: string;
  confirmPassword: string;
};

export function RegisterForm({ lang }: { lang: Locale }) {
  const finish = useCheckoutReturn();
  const goBack = useGoBack(`/${lang}`);
  const t = shippingCopy[lang];
  const l = labels[lang];
  const v = validation[lang];
  const names = nameLabels[lang];
  const examples = examplePlaceholders[lang];
  const [serverError, setServerError] = useState("");
  const [registered, setRegistered] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().trim().min(1, v.required).max(100),
        lastName: z.string().trim().min(1, v.required).max(100),
        email: z.email(v.email),
        phone: z.string().trim().min(1, v.required).max(50),
        street: z.string().trim().min(1, v.required).max(255),
        postal: z.string().trim().min(1, v.required).max(20),
        city: z.string().trim().min(1, v.required).max(100),
        country: z.string().min(1, v.required),
        password: z.string().min(8, v.password).max(72, v.password),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: confirmPasswordCopy[lang].mismatch,
      }),
    [v, lang],
  );

  const [initialValues] = useState<RegisterValues>(() => ({
    firstName: "", lastName: "", email: "", phone: "", street: "", postal: "", city: "", country: "", password: "", confirmPassword: "",
    ...peekPrefill(),
  }));
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  useEffect(() => {
    readPrefill();
  }, []);
  const emailField = register("email");
  async function checkEmail(value: string) {
    if (!z.email().safeParse(value.trim()).success) return;
    try {
      const result = await fetch("/api/account/email-available", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!result.ok) return;
      const { available } = (await result.json()) as { available: boolean };
      if (available) {
        if (errors.email?.type === "taken") clearErrors("email");
      } else {
        setError("email", { type: "taken", message: notices[lang][3] });
      }
    } catch {
      // the check is a convenience: the submit still reports a taken address
    }
  }

  async function onSubmit(values: RegisterValues) {
    setServerError("");
    try {
      const result = await fetch("/api/account/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          street: values.street,
          postal: values.postal,
          city: values.city,
          country: values.country,
          password: values.password,
          locale: lang,
        }),
      });
      if (!result.ok) {
        const index = result.status === 409 ? 3 : result.status === 400 ? 4 : 5;
        setServerError(notices[lang][index]);
        return;
      }
      setRegistered(values.email);
    } catch {
      setServerError(notices[lang][5]);
    }
  }

  if (registered !== null) {
    const copy = registeredCopy[lang];
    return (
      <section className="register-card" aria-labelledby="login-title">
        <Link href={`/${lang}`} className="login-logo">
          <Image src="/logo.png" width={96} height={96} alt="RasBass Record Shop" />
        </Link>
        <h1 id="login-title">{copy.title}</h1>
        <p>{copy.text.replace("{email}", registered)}</p>
        <button className="login-submit" type="button" onClick={() => finish("E-mail")}>
          {copy.action}
        </button>
      </section>
    );
  }
  return (
    <section className="register-card" aria-labelledby="login-title">
      <button className="auth-close" type="button" aria-label={closeLabel[lang]} onClick={goBack}>
        <IconX size={20} aria-hidden />
      </button>
      <Link href={`/${lang}`} className="login-logo">
        <Image src="/logo.png" width={96} height={96} alt="RasBass Record Shop" />
      </Link>
      <h1 id="login-title">{t.register}</h1>
      {serverError && <p role="alert" className="auth-alert"><IconAlertCircle size={18} aria-hidden />{serverError}</p>}
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="register-grid">
          <TextInput
            label={names.first}
            placeholder={examples.firstName}
            autoComplete="given-name"
            withAsterisk={false}
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextInput
            label={names.last}
            placeholder={examples.lastName}
            autoComplete="family-name"
            withAsterisk={false}
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <TextInput
            label={t.email}
            placeholder={examples.email}
            type="email"
            autoComplete="email"
            withAsterisk={false}
            error={errors.email?.message}
            {...emailField}
            onBlur={(event) => {
              const value = event.currentTarget.value;
              void emailField.onBlur(event);
              void checkEmail(value);
            }}
          />
          <TextInput
            label={t.phone}
            placeholder={examples.phone}
            type="tel"
            autoComplete="tel"
            withAsterisk={false}
            error={errors.phone?.message}
            {...register("phone")}
          />
          <div className="register-wide">
            <TextInput
              label={t.street}
              placeholder={examples.street}
              autoComplete="street-address"
              withAsterisk={false}
              error={errors.street?.message}
              {...register("street")}
            />
          </div>
          <div className="register-wide register-pair">
            <TextInput
              label={t.postal}
              placeholder={examples.postal}
              autoComplete="postal-code"
              withAsterisk={false}
              error={errors.postal?.message}
              {...register("postal")}
            />
            <TextInput
              label={t.city}
              placeholder={examples.city}
              autoComplete="address-level2"
              withAsterisk={false}
              error={errors.city?.message}
              {...register("city")}
            />
          </div>
          <div className="register-wide">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Select
                  label={t.country}
                  placeholder={examples.country}
                  data={countryOptions(lang)}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? "")}
                  onBlur={field.onBlur}
                  error={errors.country?.message}
                  searchable
                  allowDeselect={false}
                  withAsterisk={false}
                  comboboxProps={{ withinPortal: true }}
                />
              )}
            />
          </div>
        </div>
        <hr className="login-hairline" />
        <PasswordInput
          label={l.password}
          autoComplete="new-password"
          withAsterisk={false}
          error={errors.password?.message}
          visibilityToggleButtonProps={{ "aria-label": passwordToggleLabel[lang] }}
          {...register("password")}
        />
        <PasswordInput
          label={confirmPasswordCopy[lang].label}
          autoComplete="new-password"
          withAsterisk={false}
          error={errors.confirmPassword?.message}
          visibilityToggleButtonProps={{ "aria-label": passwordToggleLabel[lang] }}
          {...register("confirmPassword")}
        />
        <button className="login-submit" disabled={isSubmitting} type="submit">
          {t.register}
        </button>
      </form>
      <button className="secondary-action login-back" onClick={() => finish()}>
        ← {l.back}
      </button>
    </section>
  );
}
