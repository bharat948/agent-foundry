# Deployment (AF-007)

Pinned Docker Compose stack for the Agent Foundry R0 runtime (TypeScript + PostgreSQL 17).

| Service | Image (pinned digest) | mem_limit | cpus |
|---|---|---|---|
| postgres | `postgres@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3` (postgres:17, 17.11) | 6g | 2 |
| app (placeholder) | `node@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293` (node:20-alpine) | 2g | 2 |

Total memory cap: **8g** (swap disabled via `memswap_limit`). The `app` service is a placeholder HTTP server until AF-005 lands.

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
