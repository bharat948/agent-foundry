#!/usr/bin/env bash
# Least-privilege roles per ADR-0003 (AF-007). Runs once, on first init of an empty pgdata volume.
# Passwords come from env (AF_RUNTIME_PASSWORD, AF_GATEWAY_PASSWORD); nothing is hardcoded.
# A shell wrapper is used because plain .sql files in initdb can't read env vars.
set -euo pipefail
: "${AF_RUNTIME_PASSWORD:?}" "${AF_GATEWAY_PASSWORD:?}"
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" -v owner="$POSTGRES_USER" \
  -v rt_pw="$AF_RUNTIME_PASSWORD" -v gw_pw="$AF_GATEWAY_PASSWORD" <<'SQL'
CREATE ROLE af_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'rt_pw';
CREATE ROLE af_gateway LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'gw_pw';
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO af_runtime, af_gateway;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO af_runtime, af_gateway;
-- Schema (AF-005) isn't defined yet. Tables will be created by the owner role through migrations.
-- af_runtime: app CRUD on future tables and sequences created by the owner.
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO af_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO af_runtime;
-- af_gateway: NO default privileges. It only gets INSERT on audit_log, so the AF-005 migration that creates
-- audit_log MUST run: GRANT INSERT ON audit_log TO af_gateway; (plus USAGE on its id sequence if it has one)
-- and REVOKE INSERT/UPDATE/DELETE ON audit_log FROM af_runtime (the default grant above would otherwise cover it).
SQL
