#!/usr/bin/env bash
# Idempotent start for the Agent Foundry R0 stack (AF-007). No systemd on the box.
set -euo pipefail
cd "$(dirname "$0")"
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"

if ! $DOCKER info >/dev/null 2>&1; then
  echo "dockerd not running; starting (log: /tmp/dockerd.log)"
  sudo sh -c 'nohup dockerd >>/tmp/dockerd.log 2>&1 &'
  for i in $(seq 1 30); do $DOCKER info >/dev/null 2>&1 && break; sleep 1; done
  $DOCKER info >/dev/null 2>&1 || { echo "dockerd failed to start; see /tmp/dockerd.log"; exit 1; }
fi

[ -f .env ] || { echo "deploy/.env missing: cp .env.example .env and set POSTGRES_PASSWORD"; exit 1; }

$DOCKER compose up -d

echo "waiting for services to be healthy..."
for i in $(seq 1 60); do
  unhealthy=$($DOCKER compose ps --format '{{.Service}} {{.Health}}' | grep -v ' healthy$' || true)
  [ -z "$unhealthy" ] && { $DOCKER compose ps; echo "all services healthy"; exit 0; }
  sleep 2
done
echo "timeout waiting for health:"; echo "$unhealthy"; exit 1
