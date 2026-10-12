-- AF-005 part 1: owner account + hashed sessions.
CREATE TABLE owner_account (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,            -- scrypt$N$r$p$salt_b64$hash_b64
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- R0 is single-owner: at most one row.
CREATE UNIQUE INDEX owner_account_singleton ON owner_account ((true));

CREATE TABLE owner_session (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  owner_id    BIGINT NOT NULL REFERENCES owner_account(id) ON DELETE CASCADE,
  token_hash  BYTEA NOT NULL UNIQUE,       -- sha256(token); raw token never stored
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX owner_session_expires ON owner_session (expires_at);
