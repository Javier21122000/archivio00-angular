#!/bin/bash
# ARCHIVIO 00 - avvio locale (Angular 22 + NestJS 12 + PostgreSQL).
# Doppio click da Finder oppure ./avvia.command [--no-browser]
# Variabili opzionali: BACKEND_PORT (3000), FRONTEND_PORT (4200), DB_NAME (da BACKEND/.env).

cd "$(dirname "$0")" || exit 1
ROOT="$(pwd -P)"
RUN="$ROOT/.run"
BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"
OPEN_BROWSER=1
for a in "$@"; do [ "$a" = "--no-browser" ] && OPEN_BROWSER=0; done

say()  { printf '\033[1m[archivio00]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[archivio00] ERRORE:\033[0m %s\n' "$*" >&2; exit 1; }

STARTED_PIDS=()
killtree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do killtree "$child"; done
  kill "$pid" 2>/dev/null
}
cleanup() {
  trap - EXIT INT TERM HUP
  if [ ${#STARTED_PIDS[@]} -gt 0 ]; then
    say "Arresto dei processi avviati da questo script..."
    for pid in "${STARTED_PIDS[@]}"; do killtree "$pid"; done
    sleep 1
    for pid in "${STARTED_PIDS[@]}"; do kill -9 "$pid" 2>/dev/null; done
  fi
  rm -f "$RUN/backend.pid" "$RUN/frontend.pid"
  exit 0
}
trap cleanup EXIT INT TERM HUP

# --- Prerequisiti -----------------------------------------------------------
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
command -v node >/dev/null || fail "Node.js non trovato. Installa Node 22 o superiore."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || fail "Serve Node 22 o superiore (trovato $(node -v))."
command -v pg_isready >/dev/null || fail "Client PostgreSQL non trovato (pg_isready)."

env_value() { [ -f BACKEND/.env ] && grep -E "^$1=" BACKEND/.env | tail -1 | cut -d= -f2-; }

# --- BACKEND/.env solo se manca --------------------------------------------
if [ ! -f BACKEND/.env ]; then
  command -v openssl >/dev/null || fail "openssl non trovato: impossibile generare JWT_SECRET."
  SECRET="$(openssl rand -hex 32)"
  sed -e "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" -e "s|^DB_USER=.*|DB_USER=$USER|" \
    BACKEND/.env.example > BACKEND/.env
  say "Creato BACKEND/.env (JWT_SECRET casuale, DB_USER=$USER)."
fi

DB_HOST="$(env_value DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(env_value DB_PORT)"; DB_PORT="${DB_PORT:-5432}"
DB_USER="$(env_value DB_USER)"; DB_USER="${DB_USER:-$USER}"
DB_PASSWORD="$(env_value DB_PASSWORD)"
DB_NAME="${DB_NAME:-$(env_value DB_NAME)}"; DB_NAME="${DB_NAME:-archivio00_angular}"
[ -n "$DB_PASSWORD" ] && export PGPASSWORD="$DB_PASSWORD"

pg_isready -q -h "$DB_HOST" -p "$DB_PORT" || fail "PostgreSQL non risponde su $DB_HOST:$DB_PORT. Avvialo (es. brew services start postgresql) e riprova."

if [ "$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -Atc "select 1 from pg_database where datname='$DB_NAME'" 2>/dev/null)" != "1" ]; then
  say "Creo il database $DB_NAME..."
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" || fail "Impossibile creare il database $DB_NAME."
else
  say "Database $DB_NAME presente."
fi

# --- Dipendenze solo se mancano --------------------------------------------
for d in BACKEND FRONTEND; do
  if [ ! -d "$d/node_modules" ]; then
    say "Installo le dipendenze di $d (npm ci)..."
    (cd "$d" && npm ci) || fail "npm ci fallito in $d."
  fi
done

# --- Stato delle porte -----------------------------------------------------
listener() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }
# Esito: free | ours | other
port_state() {
  local pid cwd; pid="$(listener "$1")"
  [ -z "$pid" ] && { echo free; return; }
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
  case "$cwd" in "$ROOT"|"$ROOT"/*) echo ours ;; *) echo other ;; esac
}
BS="$(port_state "$BACKEND_PORT")"; FS="$(port_state "$FRONTEND_PORT")"
[ "$BS" = other ] && fail "La porta $BACKEND_PORT e' occupata da un altro processo (PID $(listener "$BACKEND_PORT")). Non lo fermo: liberala o usa BACKEND_PORT=altra."
[ "$FS" = other ] && fail "La porta $FRONTEND_PORT e' occupata da un altro processo (PID $(listener "$FRONTEND_PORT")). Non lo fermo: liberala o usa FRONTEND_PORT=altra."

mkdir -p "$RUN"

# --- Migration, seed e backend ---------------------------------------------
if [ "$BS" = ours ]; then
  say "Backend gia' attivo su :$BACKEND_PORT (questo progetto): lo riuso."
else
  say "Applico migration e seed (npm run db:setup)..."
  (cd BACKEND && DB_NAME="$DB_NAME" npm run db:setup) > "$RUN/db-setup.log" 2>&1 \
    || { tail -20 "$RUN/db-setup.log"; fail "db:setup fallito (log: .run/db-setup.log)."; }
  say "Avvio il backend su :$BACKEND_PORT..."
  (cd BACKEND && exec env PORT="$BACKEND_PORT" DB_NAME="$DB_NAME" \
     FRONTEND_ORIGIN="http://localhost:$FRONTEND_PORT" node dist/main.js) > "$RUN/backend.log" 2>&1 &
  BPID=$!; STARTED_PIDS+=("$BPID"); echo "$BPID" > "$RUN/backend.pid"
fi

# --- Frontend ----------------------------------------------------------------
if [ "$FS" = ours ]; then
  say "Frontend gia' attivo su :$FRONTEND_PORT (questo progetto): lo riuso."
else
  printf '{"/api":{"target":"http://localhost:%s","secure":false,"changeOrigin":true}}\n' "$BACKEND_PORT" > "$RUN/proxy.conf.json"
  say "Avvio il frontend su :$FRONTEND_PORT (la prima compilazione richiede un po')..."
  (cd FRONTEND && exec ./node_modules/.bin/ng serve --port "$FRONTEND_PORT" --proxy-config "$RUN/proxy.conf.json") > "$RUN/frontend.log" 2>&1 &
  FPID=$!; STARTED_PIDS+=("$FPID"); echo "$FPID" > "$RUN/frontend.pid"
fi

# --- Attesa ----------------------------------------------------------------
wait_for() { # url, nome, pid(opz.)
  local i
  for i in $(seq 1 180); do
    curl -fsS -o /dev/null "$1" 2>/dev/null && return 0
    [ -n "$3" ] && ! kill -0 "$3" 2>/dev/null && { tail -20 "$RUN/$4.log"; fail "$2 si e' fermato all'avvio (log: .run/$4.log)."; }
    sleep 1
  done
  fail "$2 non risponde dopo 180 s (log in .run/)."
}
wait_for "http://localhost:$BACKEND_PORT/health" "Backend" "$BPID" backend
say "Backend pronto: http://localhost:$BACKEND_PORT/health"
wait_for "http://localhost:$FRONTEND_PORT" "Frontend" "$FPID" frontend
say "Frontend pronto: http://localhost:$FRONTEND_PORT"

[ "$OPEN_BROWSER" = 1 ] && open "http://localhost:$FRONTEND_PORT"

if [ ${#STARTED_PIDS[@]} -eq 0 ]; then
  say "Niente da avviare: i servizi erano gia' attivi. Per fermarli usa ferma.command."
  exit 0
fi
say "Tutto attivo. Ctrl+C o chiusura della finestra per fermare i processi avviati da qui."
say "Account demo: javier@archivio00.it / admin123 - utente@archivio00.it / password123"
while :; do
  for pid in "${STARTED_PIDS[@]}"; do
    kill -0 "$pid" 2>/dev/null || { say "Un processo si e' fermato (PID $pid): esco."; exit 0; }
  done
  sleep 2
done
