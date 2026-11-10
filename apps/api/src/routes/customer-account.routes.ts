import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import * as oidc from "openid-client";
import { z } from "zod";
import { pool } from "@/database/db.js";
import { JwtService } from "@/services/jwt.service.js";
import { welcomeMail, type MailLocale } from "@/services/customer-mail.js";
import { RolePostgresRepository } from "@/repositories/role/role-postgres.repository.js";
import { AppError } from "@/errors/app.error.js";

const providerSchema = z.enum(["apple", "google"]);
const language = z.enum(["pl", "en", "es"]).default("pl");
const emailSchema = z.email().max(255);
type Provider = z.infer<typeof providerSchema>;
const jwt = new JwtService();
const roles = new RolePostgresRepository();

async function customer(
  email: string,
  hash: string,
  locale: MailLocale,
  identity?: { provider: Provider; subject: string },
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
      "INSERT INTO user_contact_details(user_id,first_name,last_name) VALUES ($1,'','')",
      [id],
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
customerRouter.post("/register", async (req, res) => {
  const data = z
    .object({
      email: emailSchema,
      password: z
        .string()
        .min(8)
        .refine((s) => Buffer.byteLength(s) <= 72 && !!s.trim()),
      locale: language,
    })
    .safeParse(req.body);
  if (!data.success) {
    res.sendStatus(400);
    return;
  }
  const { email, password, locale } = data.data;
  const token = await customer(
    email.toLowerCase(),
    await bcrypt.hash(password, 12),
    locale,
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
