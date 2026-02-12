#!/bin/sh
set -eu

LOG_FILE="$(mktemp)"

if npx prisma migrate deploy 2>&1 | tee "$LOG_FILE"; then
  echo "Prisma migrations applied successfully."
  exit 0
fi

if grep -q "P3005" "$LOG_FILE"; then
  BASELINE_MIGRATION="$(ls -1 prisma/migrations | grep -v "migration_lock.toml" | sort | head -n1)"

  if [ -z "${BASELINE_MIGRATION}" ]; then
    echo "No baseline migration found in prisma/migrations."
    exit 1
  fi

  echo "Detected non-empty schema (P3005). Baselining migration: ${BASELINE_MIGRATION}"
  npx prisma migrate resolve --applied "${BASELINE_MIGRATION}"
  npx prisma migrate deploy
  exit 0
fi

echo "Migration failed with a non-baseline error."
cat "$LOG_FILE"
exit 1
