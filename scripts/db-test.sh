#!/usr/bin/env bash
# npm run db:test
# Start een tijdelijke Postgres, laadt de Supabase-shim en de migraties, en draait de databasetests.
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [[ -z "$PGBIN" || ! -x "$PGBIN/postgres" ]]; then
  echo "Geen Postgres gevonden. Zet PGBIN naar de map met postgres en initdb." >&2
  exit 1
fi

MAP="$(mktemp -d)"
POORT=54329
# Postgres weigert te draaien als root; gebruik dan de gebruiker postgres.
ALS=()
if [[ "$(id -u)" == "0" ]]; then
  chown postgres "$MAP"
  ALS=(runuser -u postgres --)
fi
stop() {
  "${ALS[@]}" "$PGBIN/pg_ctl" -D "$MAP/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$MAP"
}
trap stop EXIT

"${ALS[@]}" "$PGBIN/initdb" -D "$MAP/data" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
"${ALS[@]}" "$PGBIN/pg_ctl" -D "$MAP/data" -l "$MAP/log" -w \
  -o "-k $MAP -p $POORT -c listen_addresses=''" start >/dev/null

psql_() { psql -h "$MAP" -p "$POORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql_ -f supabase/tests/shim.sql >/dev/null
for m in supabase/migrations/*.sql; do psql_ -f "$m" >/dev/null; done
psql_ -f supabase/tests/rechten.sql 2>&1 | sed 's/^psql:[^:]*:[0-9]*: //' | grep -v '^\s*$'
