#!/bin/bash
# Ferma SOLO i processi avviati da avvia.command (PID in .run/).
cd "$(dirname "$0")" || exit 1
RUN="$(pwd -P)/.run"
killtree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do killtree "$child"; done
  kill "$pid" 2>/dev/null
}
found=0
for f in "$RUN"/backend.pid "$RUN"/frontend.pid; do
  [ -f "$f" ] || continue
  pid="$(cat "$f")"; found=1
  if kill -0 "$pid" 2>/dev/null; then
    echo "[archivio00] Fermo $(basename "$f" .pid) (PID $pid)"
    killtree "$pid"; sleep 1; kill -9 "$pid" 2>/dev/null
  else
    echo "[archivio00] $(basename "$f" .pid): PID $pid gia' fermo"
  fi
  rm -f "$f"
done
[ "$found" = 0 ] && echo "[archivio00] Nessun processo registrato in .run/ (niente da fermare)."
exit 0
