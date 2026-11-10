CREATE TABLE customer_identities (
  provider text NOT NULL,
  subject text NOT NULL,
  user_id bigint NOT NULL REFERENCES users(id),
  PRIMARY KEY (provider, subject),
  UNIQUE (provider, user_id)
);
CREATE TABLE customer_auth_attempts (
  state text PRIMARY KEY,
  browser_key text NOT NULL,
  provider text NOT NULL,
  nonce text NOT NULL,
  verifier text NOT NULL,
  locale text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE customer_mail (
  id bigserial PRIMARY KEY,
  event_key text NOT NULL UNIQUE,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  next_attempt timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz
);
CREATE INDEX customer_mail_pending ON customer_mail(next_attempt) WHERE sent_at IS NULL;
