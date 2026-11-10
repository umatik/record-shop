import { type Locale } from "@/app/messages";

export const labels = {
  pl: { username: "Login (e-mail)", password: "Hasło", or: "lub", back: "Wróć" },
  en: { username: "Login (email)", password: "Password", or: "or", back: "Back" },
  es: { username: "Usuario (correo electrónico)", password: "Contraseña", or: "o", back: "Volver" },
} as const;

export const notices = {
  pl: [
    "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.",
    "Nie udało się utworzyć konta. Użyj innego adresu lub zaloguj się.",
    "Logowanie przez dostawcę jest niedostępne.",
    "Ten adres ma już konto. Zaloguj się.",
    "Podaj poprawny adres e-mail i hasło o długości od 8 do 72 znaków.",
    "Usługa jest chwilowo niedostępna. Spróbuj ponownie za chwilę.",
  ],
  en: [
    "Sign-in failed. Check your details and try again.",
    "Could not create this account. Try another address or sign in.",
    "Provider sign-in is unavailable.",
    "This address already has an account. Sign in instead.",
    "Enter a valid email address and a password of 8 to 72 characters.",
    "The service is temporarily unavailable. Try again in a moment.",
  ],
  es: [
    "No se pudo iniciar sesión. Comprueba tus datos.",
    "No se pudo crear la cuenta. Prueba con otro correo o inicia sesión.",
    "El acceso con este proveedor no está disponible.",
    "Esta dirección ya tiene una cuenta. Inicia sesión.",
    "Introduce un correo válido y una contraseña de 8 a 72 caracteres.",
    "El servicio no está disponible en este momento. Inténtalo de nuevo.",
  ],
} as const satisfies Record<Locale, readonly string[]>;

export const validation = {
  pl: {
    email: "Podaj poprawny adres e-mail.",
    password: "Hasło musi mieć od 8 do 72 znaków.",
    required: "To pole jest wymagane.",
  },
  en: {
    email: "Enter a valid email address.",
    password: "Password must be 8 to 72 characters.",
    required: "This field is required.",
  },
  es: {
    email: "Introduce un correo electrónico válido.",
    password: "La contraseña debe tener de 8 a 72 caracteres.",
    required: "Este campo es obligatorio.",
  },
} as const satisfies Record<Locale, { email: string; password: string; required: string }>;

export const confirmPasswordCopy = {
  pl: { label: "Potwierdź hasło", mismatch: "Hasła nie są takie same." },
  en: { label: "Confirm password", mismatch: "Passwords do not match." },
  es: { label: "Confirmar contraseña", mismatch: "Las contraseñas no coinciden." },
} as const satisfies Record<Locale, { label: string; mismatch: string }>;

export const examplePlaceholders = {
  pl: {
    firstName: "Anna",
    lastName: "Kowalska",
    email: "anna@example.com",
    phone: "+48 600 000 000",
    street: "ul. Przykładowa 1/2",
    postal: "00-001",
    city: "Warszawa",
    country: "Polska",
  },
  en: {
    firstName: "Anna",
    lastName: "Smith",
    email: "anna@example.com",
    phone: "+44 20 7946 0000",
    street: "10 Example Street, Flat 2",
    postal: "SW1A 1AA",
    city: "London",
    country: "United Kingdom",
  },
  es: {
    firstName: "Lucía",
    lastName: "García",
    email: "lucia@example.com",
    phone: "+34 600 000 000",
    street: "Calle Ejemplo 1, 2.º B",
    postal: "28001",
    city: "Madrid",
    country: "España",
  },
} as const satisfies Record<Locale, Record<"firstName" | "lastName" | "email" | "phone" | "street" | "postal" | "city" | "country", string>>;

export const closeLabel = {
  pl: "Zamknij",
  en: "Close",
  es: "Cerrar",
} as const satisfies Record<Locale, string>;

export const passwordToggleLabel = {
  pl: "Pokaż lub ukryj hasło",
  en: "Show or hide password",
  es: "Mostrar u ocultar contraseña",
} as const satisfies Record<Locale, string>;

export const nameLabels = {
  pl: { first: "Imię", last: "Nazwisko" },
  en: { first: "First name", last: "Last name" },
  es: { first: "Nombre", last: "Apellidos" },
} as const satisfies Record<Locale, { first: string; last: string }>;

export const registeredCopy = {
  pl: { title: "Dziękujemy za rejestrację!", text: "Konto dla {email} jest gotowe. Wysłaliśmy na ten adres wiadomość powitalną.", action: "Przejdź do sklepu" },
  en: { title: "Thank you for registering!", text: "Your account for {email} is ready. We sent a welcome email to this address.", action: "Go to the shop" },
  es: { title: "¡Gracias por registrarte!", text: "Tu cuenta para {email} está lista. Te enviamos un correo de bienvenida a esta dirección.", action: "Ir a la tienda" },
} as const satisfies Record<Locale, { title: string; text: string; action: string }>;

export const resetCopy = {
  pl: {
    forgotTitle: "Nie pamiętam hasła",
    forgotText: "Podaj adres e-mail. Jeśli konto istnieje, wyślemy na niego link do ustawienia nowego hasła.",
    send: "Wyślij link",
    sent: "Jeśli konto istnieje, wysłaliśmy link do ustawienia hasła. Sprawdź skrzynkę.",
    newTitle: "Nowe hasło",
    newPassword: "Nowe hasło",
    save: "Ustaw hasło",
    done: "Hasło zostało zmienione. Możesz się teraz zalogować.",
    invalid: "Link wygasł albo został już użyty.",
    requestNew: "Poproś o nowy link",
    back: "Wróć do logowania",
    forgotLink: "Nie pamiętam hasła",
    error: "Nie udało się wysłać. Spróbuj ponownie za chwilę.",
  },
  en: {
    forgotTitle: "Forgot password",
    forgotText: "Enter your email address. If an account exists, we will send a link to set a new password.",
    send: "Send link",
    sent: "If an account exists, we sent a link to set a new password. Check your inbox.",
    newTitle: "New password",
    newPassword: "New password",
    save: "Set password",
    done: "Your password has been changed. You can now sign in.",
    invalid: "This link has expired or has already been used.",
    requestNew: "Request a new link",
    back: "Back to sign in",
    forgotLink: "Forgot password?",
    error: "Could not send it. Try again in a moment.",
  },
  es: {
    forgotTitle: "Olvidé mi contraseña",
    forgotText: "Introduce tu correo. Si existe una cuenta, te enviaremos un enlace para establecer una nueva contraseña.",
    send: "Enviar enlace",
    sent: "Si existe una cuenta, hemos enviado un enlace para establecer una nueva contraseña. Revisa tu bandeja.",
    newTitle: "Nueva contraseña",
    newPassword: "Nueva contraseña",
    save: "Establecer contraseña",
    done: "La contraseña se ha cambiado. Ya puedes iniciar sesión.",
    invalid: "El enlace ha caducado o ya se ha usado.",
    requestNew: "Pedir un enlace nuevo",
    back: "Volver a iniciar sesión",
    forgotLink: "¿Olvidaste tu contraseña?",
    error: "No se pudo enviar. Inténtalo de nuevo en un momento.",
  },
} as const satisfies Record<Locale, Record<string, string>>;
