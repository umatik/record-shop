import type { PoolClient } from "pg";
import { pool } from "@/database/db.js";
import { EmailService } from "./email.service.js";

export type MailLocale = "pl" | "en" | "es";
const messages = {
  pl: {
    welcome: "Dziękujemy za rejestrację",
    account: "Twoje konto w RasBass Record Shop jest gotowe.",
    order: "Potwierdzenie zamówienia",
    thanks: "Dziękujemy za zakup!",
    total: "Łącznie z dostawą",
    reset: "Ustaw nowe hasło · RasBass",
    resetBody: "Aby ustawić nowe hasło, otwórz link. Link jest ważny przez 1 godzinę i działa tylko raz:",
  },
  en: {
    welcome: "Thanks for signing up",
    account: "Your RasBass Record Shop account is ready.",
    order: "Order confirmation",
    thanks: "Thank you for your purchase!",
    total: "Total including delivery",
    reset: "Set a new password · RasBass",
    resetBody: "To set a new password, open the link. It is valid for 1 hour and works only once:",
  },
  es: {
    welcome: "Gracias por registrarte",
    account: "Tu cuenta de RasBass Record Shop está lista.",
    order: "Confirmación del pedido",
    thanks: "¡Gracias por tu compra!",
    total: "Total con envío",
    reset: "Establece una nueva contraseña · RasBass",
    resetBody: "Para establecer una nueva contraseña, abre el enlace. Es válido durante 1 hora y solo funciona una vez:",
  },
};
async function enqueue(
  client: PoolClient,
  key: string,
  email: string,
  subject: string,
  body: string,
) {
  await client.query(
    "INSERT INTO customer_mail(event_key,recipient,subject,body) VALUES ($1,$2,$3,$4) ON CONFLICT (event_key) DO NOTHING",
    [key, email, subject, body],
  );
}
export function welcomeMail(
  client: PoolClient,
  id: string,
  email: string,
  locale: MailLocale,
) {
  const t = messages[locale];
  return enqueue(
    client,
    "welcome:" + id,
    email,
    t.welcome + " · RasBass",
    t.account,
  );
}
export function resetMail(
  client: PoolClient,
  tokenId: string,
  email: string,
  locale: MailLocale,
  link: string,
) {
  const t = messages[locale];
  return enqueue(client, "reset:" + tokenId, email, t.reset, t.resetBody + "\n" + link);
}
export async function orderMail(
  client: PoolClient,
  id: number,
  email: string,
  locale: MailLocale,
  carrier: string,
  fee: number,
) {
  const { rows } = await client.query(
    `SELECT p.title, v.attributes->>'catalogNumber' AS edition, i.quantity, i.price_eur
    FROM order_items i JOIN product_variants v ON v.id=i.product_variant_id JOIN products p ON p.id=v.product_id
    WHERE i.order_id=$1 ORDER BY i.id`,
    [id],
  );
  const t = messages[locale];
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(n / 100);
  const total = rows.reduce((sum, r) => sum + r.quantity * r.price_eur, fee);
  const subject = t.order + " #" + id + " · RasBass";
  await enqueue(
    client,
    "order:" + id,
    email,
    subject,
    [
      t.thanks,
      subject,
      "",
      ...rows.map(
        (r) =>
          [r.title, r.edition].filter(Boolean).join(" · ") +
          " × " +
          r.quantity +
          " — " +
          money(r.price_eur * r.quantity),
      ),
      carrier + " — " + money(fee),
      t.total + ": " + money(total),
    ].join("\n"),
  );
  const shippingInbox = process.env.SHIPPING_NOTIFY_EMAIL?.trim();
  if (shippingInbox) {
    await enqueue(client, "shipping:" + id, shippingInbox,
      `Nowe zamówienie #${id} · RasBass`,
      `Zamówienie #${id} zostało zapisane. Wybrana dostawa: ${carrier}. Szczegóły znajdziesz w panelu zamówień.`);
  }
}
export async function deliverCustomerMail(mailer: EmailService) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [mail],
    } =
      await client.query(`SELECT * FROM customer_mail WHERE sent_at IS NULL AND next_attempt<=now()
      ORDER BY next_attempt,id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    if (mail) {
      try {
        await mailer.sendCustomerMessage(
          mail.recipient,
          mail.subject,
          mail.body,
          mail.id,
        );
      } catch {
        await client.query(
          "UPDATE customer_mail SET attempts=attempts+1,next_attempt=now()+least(attempts+1,60)*interval '1 minute' WHERE id=$1",
          [mail.id],
        );
        await client.query("COMMIT");
        return false;
      }
      await client.query("UPDATE customer_mail SET sent_at=now() WHERE id=$1", [
        mail.id,
      ]);
    }
    await client.query("COMMIT");
    return Boolean(mail);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
