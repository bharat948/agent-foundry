# Deployment (AF-007)

Pinned Docker Compose stack for the Agent Foundry R0 runtime (TypeScript + PostgreSQL 17).

Per ADR-0009. No Redis in R0.

| Service | Image (pinned digest) | mem_limit | cpus |
|---|---|---|---|
| db | `postgres@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3` (postgres:17, 17.11; shared_buffers=256MB, max_connections=20) | 2g | 2 |
| runtime (placeholder) | `node@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1` (node:24-alpine; heap 768MB) | 1g | 2 |
| gateway (placeholder) | same node:24 digest (heap 192MB) | 256m | 1 |

Total cap 3.25g (<= 8g); `memswap_limit` = `mem_limit`, no GPU. runtime/gateway are placeholder HTTP servers until AF-005. start.sh logs `free -m` and flags <3 GB free as an environment note.

## Start / restart (also after a box reboot)
```bash
cp deploy/.env.example deploy/.env   # first time only; set POSTGRES_PASSWORD
deploy/start.sh                       # starts dockerd if needed, compose up -d, waits for healthy
```
Postgres listens on `127.0.0.1:55432` (the host's own Postgres keeps 5432).

## Stop
```bash
cd deploy && sudo docker compose down        # keeps the pgdata volume
cd deploy && sudo docker compose down -v     # also deletes data (needs Bharat's OK)
```

## Updating a pin
`docker pull postgres:17 && docker inspect --format '{{index .RepoDigests 0}}' postgres:17`, then update the digest here and in the compose file via a PR.

Secrets: only in `deploy/.env` (gitignored). Never commit it.
