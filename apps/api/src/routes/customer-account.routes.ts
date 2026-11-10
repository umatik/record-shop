import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import * as oidc from "openid-client";
import { z } from "zod";
import { pool } from "@/database/db.js";
import { JwtService } from "@/services/jwt.service.js";
import { resetMail, welcomeMail, type MailLocale } from "@/services/customer-mail.js";
import { RolePostgresRepository } from "@/repositories/role/role-postgres.repository.js";
import { AppError } from "@/errors/app.error.js";
import { authenticationMiddleware, type AuthenticatedRequest } from "@/middleware/authentication.middleware.js";

const providerSchema = z.enum(["apple", "google"]);
const language = z.enum(["pl", "en", "es"]).default("pl");
const emailSchema = z.email().max(255);
type Provider = z.infer<typeof providerSchema>;
const jwt = new JwtService();
const roles = new RolePostgresRepository();

type CustomerContact = {
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

async function customer(
  email: string,
  hash: string,
  locale: MailLocale,
  identity?: { provider: Provider; subject: string },
  contact?: CustomerContact,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (identity) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [identity.provider + ":" + identity.subject],
      );
      const found = await client.query(
        `SELECT u.id,u.email FROM customer_identities i JOIN users u ON u.id=i.user_id
        WHERE i.provider=$1 AND i.subject=$2 AND NOT u.is_deleted`,
        [identity.provider, identity.subject],
      );
      if (found.rows[0]) {
        await client.query("COMMIT");
        return jwt.generateToken(found.rows[0].id, found.rows[0].email);
      }
    }
    const result = await client.query(
      "INSERT INTO users(email,password_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id",
      [email, hash],
    );
    if (!result.rowCount) throw new AppError("Email already registered", 409);
    const id = result.rows[0].id;
    await roles.assignToUser(client, Number(id), "user");
    await client.query(
      `INSERT INTO user_contact_details(user_id,first_name,last_name,phone,address,city,postal_code,country)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        contact?.firstName ?? "",
        contact?.lastName ?? "",
        contact?.phone ?? null,
        contact?.address ?? null,
        contact?.city ?? null,
        contact?.postalCode ?? null,
        contact?.country ?? null,
      ],
    );
    if (identity)
      await client.query(
        "INSERT INTO customer_identities(provider,subject,user_id) VALUES ($1,$2,$3)",
        [identity.provider, identity.subject, id],
      );
    await welcomeMail(client, id, email, locale);
    const token = jwt.generateToken(id, email);
    await client.query("COMMIT");
    return token;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function configuration(provider: Provider) {
  const prefix = provider.toUpperCase();
  const id = process.env[prefix + "_CLIENT_ID"];
  const secret = process.env[prefix + "_CLIENT_SECRET"];
  const origin = process.env.SHOP_ORIGIN;
  if (!id || !secret || !origin)
    throw new AppError("Provider not configured", 503);
  const issuer =
    provider === "apple"
      ? "https://appleid.apple.com"
      : "https://accounts.google.com";
  const config = await oidc.discovery(
    new URL(issuer),
    id,
    secret,
    oidc.ClientSecretPost(secret),
  );
  oidc.enableNonRepudiationChecks(config);
  return {
    config,
    redirect: new URL("/api/account/" + provider + "/callback", origin).href,
  };
}

export const customerRouter = Router();
customerRouter.use(
  rateLimit({
    windowMs: 15 * 60000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
const resetTokenTtlMs = 60 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const shopOrigin = () =>
  process.env.SHOP_ORIGIN ??
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3002");

customerRouter.post("/password-reset/request", async (req, res) => {
  const data = z
    .object({ email: emailSchema, locale: language })
    .safeParse({ email: String(req.body?.email ?? "").trim().toLowerCase(), locale: req.body?.locale });
  if (!data.success) {
    res.sendStatus(400);
    return;
  }
  const origin = shopOrigin();
  if (!origin) throw new AppError("Shop origin not configured", 503);
  const { email, locale } = data.data;
  const user = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND NOT is_deleted",
    [email],
  );
  if (user.rows[0]) {
    const token = randomBytes(32).toString("base64url");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const row = await client.query(
        "INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES ($1,$2,$3) RETURNING id",
        [user.rows[0].id, hashToken(token), new Date(Date.now() + resetTokenTtlMs)],
      );
      const link = `${origin}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
      await resetMail(client, String(row.rows[0].id), email, locale, link);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  // Same answer whether or not the address has an account.
  res.status(202).json({ ok: true });
});
customerRouter.post("/password-reset/confirm", async (req, res) => {
  const data = z
    .object({
      token: z.string().min(20).max(200),
      password: z
        .string()
        .min(8)
        .refine((s) => Buffer.byteLength(s) <= 72 && !!s.trim()),
    })
    .safeParse(req.body);
  if (!data.success) {
    res.sendStatus(400);
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE`,
      [hashToken(data.data.token)],
    );
    if (!found.rows[0]) {
      await client.query("ROLLBACK");
      res.sendStatus(400);
      return;
    }
    const userId = found.rows[0].user_id;
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      await bcrypt.hash(data.data.password, 12),
      userId,
    ]);
    await client.query(
      "UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
      [userId],
    );
    await client.query("COMMIT");
    res.sendStatus(204);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
customerRouter.get("/me/shipping", authenticationMiddleware, async (req: AuthenticatedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT first_name, last_name, phone, address, city, postal_code, country
    FROM user_contact_details WHERE user_id = $1`,
    [req.user?.userId],
  );
  const c = rows[0];
  res.set("Cache-Control", "no-store").json({
    email: req.user?.email ?? "",
    firstName: c?.first_name ?? "",
    lastName: c?.last_name ?? "",
    phone: c?.phone ?? "",
    address: c?.address ?? "",
    city: c?.city ?? "",
    postalCode: c?.postal_code ?? "",
    country: c?.country ?? "",
  });
});
const shippingSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(50),
  street: z.string().trim().min(1).max(255),
  postal: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
});
customerRouter.put("/me/shipping", authenticationMiddleware, async (req: AuthenticatedRequest, res) => {
  const data = shippingSchema.safeParse(req.body);
  if (!data.success || !req.user) {
    res.sendStatus(400);
    return;
  }
  const d = data.data;
  await pool.query(
    `INSERT INTO user_contact_details(user_id,first_name,last_name,phone,address,city,postal_code,country)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (user_id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
      phone=EXCLUDED.phone, address=EXCLUDED.address, city=EXCLUDED.city,
      postal_code=EXCLUDED.postal_code, country=EXCLUDED.country, updated_at=now()`,
    [req.user.userId, d.firstName, d.lastName, d.phone, d.street, d.city, d.postal, d.country],
  );
  res.sendStatus(204);
});
customerRouter.get("/me/orders", authenticationMiddleware, async (req: AuthenticatedRequest, res) => {
  const orders = await pool.query(
    `SELECT id, status, created_at, paid_at, shipped_at, cancelled_at, carrier, delivery_eur
    FROM orders WHERE user_id = $1 AND NOT is_deleted ORDER BY created_at DESC, id DESC`,
    [req.user?.userId],
  );
  const items = orders.rowCount
    ? await pool.query(
        `SELECT i.order_id, i.quantity, i.price_eur, p.title, v.attributes->>'catalogNumber' AS edition
        FROM order_items i JOIN product_variants v ON v.id = i.product_variant_id
        JOIN products p ON p.id = v.product_id
        WHERE i.order_id = ANY($1::bigint[]) ORDER BY i.id`,
        [orders.rows.map((o) => o.id)],
      )
    : { rows: [] };
  res.set("Cache-Control", "no-store").json(
    orders.rows.map((o) => {
      const lines = items.rows.filter((i) => String(i.order_id) === String(o.id));
      return {
        id: Number(o.id),
        status: o.status,
        createdAt: o.created_at,
        paidAt: o.paid_at,
        shippedAt: o.shipped_at,
        cancelledAt: o.cancelled_at,
        carrier: o.carrier,
        deliveryEur: Number(o.delivery_eur ?? 0),
        items: lines.map((i) => ({
          title: i.title,
          edition: i.edition,
          quantity: Number(i.quantity),
          priceEur: Number(i.price_eur),
        })),
      };
    }),
  );
});
customerRouter.delete("/me", authenticationMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.sendStatus(401);
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Orders stay as business records; the account itself is anonymised and closed.
    await client.query("DELETE FROM user_contact_details WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM customer_identities WHERE user_id = $1", [userId]);
    await client.query("UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [userId]);
    await client.query(
      `UPDATE users SET is_deleted = TRUE, email = $2, password_hash = $3 WHERE id = $1`,
      [userId, `deleted-${userId}@deleted.invalid`, await bcrypt.hash(randomBytes(32).toString("hex"), 10)],
    );
    await client.query("COMMIT");
    res.sendStatus(204);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
customerRouter.post("/email-available", async (req, res) => {
  const email = emailSchema.safeParse(String(req.body?.email ?? "").trim().toLowerCase());
  if (!email.success) {
    res.sendStatus(400);
    return;
  }
  const taken = await pool.query(
    "SELECT 1 FROM users WHERE email = $1 AND NOT is_deleted",
    [email.data],
  );
  res.set("Cache-Control", "no-store").json({ available: taken.rowCount === 0 });
});
customerRouter.post("/register", async (req, res) => {
  const data = z
    .object({
      email: emailSchema,
      password: z
        .string()
        .min(8)
        .refine((s) => Buffer.byteLength(s) <= 72 && !!s.trim()),
      locale: language,
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      phone: z.string().trim().min(1).max(50),
      street: z.string().trim().min(1).max(255),
      postal: z.string().trim().min(1).max(20),
      city: z.string().trim().min(1).max(100),
      country: z.string().trim().min(1).max(100),
    })
    .safeParse(req.body);
  if (!data.success) {
    res.sendStatus(400);
    return;
  }
  const { email, password, locale, firstName, lastName, phone, street, postal, city, country } = data.data;
  const token = await customer(
    email.toLowerCase(),
    await bcrypt.hash(password, 12),
    locale,
    undefined,
    {
      firstName,
      lastName,
      phone,
      address: street,
      city,
      postalCode: postal,
      country,
    },
  );
  res.status(201).json({ token });
});
customerRouter.post("/:provider/start", async (req, res) => {
  const provider = providerSchema.parse(req.params.provider);
  const locale = language.parse(req.body.locale);
  const { config, redirect } = await configuration(provider);
  const state = oidc.randomState(),
    nonce = oidc.randomNonce(),
    verifier = oidc.randomPKCECodeVerifier();
  const browserKey = randomBytes(32).toString("hex");
  const params: Record<string, string> = {
    state,
    nonce,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email",
  };
  if (provider === "apple") params.response_mode = "form_post";
  else {
    params.code_challenge_method = "S256";
    params.code_challenge = await oidc.calculatePKCECodeChallenge(verifier);
  }
  await pool.query(
    "DELETE FROM customer_auth_attempts WHERE expires_at<=now()",
  );
  await pool.query(
    `INSERT INTO customer_auth_attempts(state,browser_key,provider,nonce,verifier,locale,expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')`,
    [state, browserKey, provider, nonce, verifier, locale],
  );
  res
    .set("Cache-Control", "no-store")
    .json({ url: oidc.buildAuthorizationUrl(config, params).href, browserKey });
});
customerRouter.post("/:provider/finish", async (req, res) => {
  const provider = providerSchema.parse(req.params.provider);
  const parsed = z
    .object({
      code: z.string().min(1),
      state: z.string().min(1),
      browserKey: z.string().length(64),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.sendStatus(400);
    return;
  }
  const { code, state, browserKey } = parsed.data;
  const {
    rows: [attempt],
  } = await pool.query(
    `DELETE FROM customer_auth_attempts WHERE state=$1 AND browser_key=$2
    AND provider=$3 AND expires_at>now() RETURNING *`,
    [state, browserKey, provider],
  );
  if (!attempt) {
    res.sendStatus(401);
    return;
  }
  const { config, redirect } = await configuration(provider);
  const url = new URL(redirect);
  url.search = new URLSearchParams({ state, code }).toString();
  const tokens = await oidc.authorizationCodeGrant(config, url, {
    expectedState: state,
    expectedNonce: attempt.nonce,
    ...(provider === "google" && { pkceCodeVerifier: attempt.verifier }),
  });
  const claims = tokens.claims();
  const email = emailSchema.safeParse(claims?.email);
  if (
    !claims?.sub ||
    !email.success ||
    ![true, "true"].includes(claims.email_verified as boolean)
  ) {
    res.sendStatus(401);
    return;
  }
  const token = await customer(
    email.data.toLowerCase(),
    await bcrypt.hash(randomBytes(32).toString("hex"), 10),
    attempt.locale,
    { provider, subject: claims.sub },
  );
  res.set("Cache-Control", "no-store").json({ token, locale: attempt.locale });
});
